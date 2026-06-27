import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordPresentationView } from "./presentation-analytics.server";
import {
  type PresentationTemplate,
  templateIds,
  normalizeTemplate,
  templateToDbValue,
} from "./presentation-templates";

export const listPresentationCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // List candidates that have any profile sections, with counts.
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select(
        "id, full_name, fit_role, current_org, current_title, city, avatar_url, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);

    const ids = (candidates ?? []).map((c) => c.id);
    if (!ids.length) return [];

    const [{ data: sections }, { data: presRows }] = await Promise.all([
      supabase
        .from("profile_sections")
        .select("candidate_id, status, body_md")
        .in("candidate_id", ids),
      supabase
        .from("presentations")
        .select(
          "id, candidate_id, status, share_slug, template_version, updated_at",
        )
        .in("candidate_id", ids),
    ]);

    const stats: Record<
      string,
      { total: number; approved: number; drafted: number }
    > = {};
    (sections ?? []).forEach((s) => {
      const k = s.candidate_id;
      const r = (stats[k] ??= { total: 0, approved: 0, drafted: 0 });
      r.total += 1;
      if (s.status === "approved") r.approved += 1;
      if ((s.body_md ?? "").trim().length > 0) r.drafted += 1;
    });

    const presByCand: Record<
      string,
      {
        id: string;
        status: string;
        share_slug: string | null;
        template_version: PresentationTemplate;
      }
    > = {};
    (presRows ?? []).forEach((p) => {
      presByCand[p.candidate_id] = {
        id: p.id,
        status: p.status,
        share_slug: p.share_slug,
        template_version: normalizeTemplate(p.template_version),
      };
    });

    return (candidates ?? [])
      .map((c) => ({
        ...c,
        stats: stats[c.id] ?? { total: 0, approved: 0, drafted: 0 },
        presentation: presByCand[c.id] ?? null,
      }))
      .filter((c) => c.stats.total > 0);
  });

function genSlug() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function slugifyCandidateName(name: string) {
  const cleaned = name
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || "candidate";
}

function nextCandidatePresentationSlug(base: string, suffix: number) {
  return suffix <= 1 ? base : `${base}-${suffix}`;
}

async function allocatePresentationSlug({
  supabase,
  candidateId,
  name,
  candidatePresentationIdToIgnore,
}: {
  supabase: any;
  candidateId: string;
  name: string;
  candidatePresentationIdToIgnore?: string;
}) {
  const base = slugifyCandidateName(name);
  for (let i = 1; i <= 18; i++) {
    const candidateSlug = nextCandidatePresentationSlug(base, i);
    const { data: collision } = await supabase
      .from("presentations")
      .select("id, candidate_id")
      .eq("share_slug", candidateSlug)
      .maybeSingle();

    if (!collision) {
      return candidateSlug;
    }

    // For regenerate flows, force a brand-new slug even if one exists on this
    // candidate's current record; keep iterating until a different unique value.
    if (collision.id === candidatePresentationIdToIgnore) {
      continue;
    }

    if (collision.candidate_id !== candidateId) {
      continue;
    }

    // This candidate already owns this slug — skip to a numbered fallback.
    if (i === 1) {
      continue;
    }

    return candidateSlug;
  }
  // Extremely unlikely: fallback to random-readable slug.
  return `${base}-${genSlug()}`;
}

export const createOrRefreshShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        regenerate: z.boolean().optional(),
        template_version: z
          .enum(templateIds as [PresentationTemplate, ...PresentationTemplate[]])
          .optional(),
        access_code: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("id, full_name, fit_role")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!candidate) throw new Error("Candidate not found");

    const { data: existing } = await supabase
      .from("presentations")
      .select("id, share_slug, access_code, status, template_version")
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();

    const slug =
      existing && !data.regenerate && existing.share_slug
        ? existing.share_slug
        : await allocatePresentationSlug({
            supabase,
            candidateId: data.candidate_id,
            name: candidate.full_name,
            candidatePresentationIdToIgnore: data.regenerate ? existing?.id : undefined,
          });

    if (existing) {
      const { data: updated, error } = await supabase
        .from("presentations")
        .update({
          share_slug: slug,
          template_version:
            templateToDbValue[
              data.template_version ??
                normalizeTemplate(existing.template_version)
            ],
          access_code: data.access_code ?? existing.access_code,
          status: existing.status === "draft" ? "in_review" : existing.status,
        })
        .eq("id", existing.id)
        .select("id, share_slug, access_code, status, template_version")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase
        .from("presentations")
        .insert({
          candidate_id: data.candidate_id,
          title: `${candidate.full_name} — Executive Profile`,
          subtitle: candidate.fit_role ?? null,
          share_slug: slug,
          template_version:
            templateToDbValue[data.template_version ?? "profile"],
          access_code: data.access_code ?? null,
          status: "in_review",
        })
      .select("id, share_slug, access_code, status, template_version")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

// PUBLIC — no auth. Scoped strictly to share_slug + access_code, returns only safe fields.
export const getPublicPresentation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        share_slug: z.string().min(4).max(64).regex(/^[a-zA-Z0-9_-]+$/),
        access_code: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: pres, error } = await supabaseAdmin
      .from("presentations")
      .select(
        "id, candidate_id, title, subtitle, access_code, status, created_by, template_version",
      )
      .eq("share_slug", data.share_slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pres) return { error: "not_found" as const };
    if (pres.status === "archived" || pres.status === "draft")
      return { error: "not_available" as const };
    if (pres.access_code && pres.access_code !== (data.access_code ?? ""))
      return { error: "code_required" as const };

    const [{ data: candidate }, { data: sections }, { data: videoLinks }] =
      await Promise.all([
      supabaseAdmin
        .from("candidates")
        .select(
          "full_name, city, current_title, current_org, fit_role, avatar_url",
        )
        .eq("id", pres.candidate_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profile_sections")
        .select("id, title, section_key, body_md, order_index, status")
        .eq("candidate_id", pres.candidate_id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("source_items")
        .select("label, monday_link, file_name")
        .eq("candidate_id", pres.candidate_id)
        .eq("kind", "video_links")
        .order("created_at", { ascending: true }),
    ]);

    if (!candidate) return { error: "not_found" as const };

    const allApproved =
      (sections ?? []).length > 0 &&
      (sections ?? []).every((s) => s.status === "approved");

    // Log the view server-side AFTER access checks pass. Issues a signed
    // per-view token the client uses to update dwell + sections viewed.
    let view: { view_id: string; token: string } | null = null;
    try {
      const req = getRequest();
      const ua = req?.headers.get("user-agent") ?? null;
      const referrer = req?.headers.get("referer") ?? null;
      view = await recordPresentationView({
        presentation_id: pres.id,
        candidate_id: pres.candidate_id,
        owner_id: pres.created_by ?? null,
        share_slug: data.share_slug,
        user_agent: ua,
        referrer,
      });
    } catch (e) {
      console.error("[share-view] failed to record view", e);
    }

    return {
      title: pres.title,
      subtitle: pres.subtitle,
      candidate,
      sections: sections ?? [],
      template_version: normalizeTemplate(pres.template_version),
      mediaVideos: (videoLinks ?? [])
        .map((v) => ({
          title: v.label ?? v.file_name ?? "Video",
          url: v.monday_link ?? "",
        }))
        .filter((v) => v.url.trim().length > 0),
      approvalState: allApproved
        ? ("approved" as const)
        : ("draft" as const),
      view,
    };
  });

export const getPresentationTemplateByCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidate_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("presentations")
      .select("template_version")
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) {
      return { template_version: "profile" as PresentationTemplate };
    }

    return { template_version: normalizeTemplate(row.template_version) };
  });
