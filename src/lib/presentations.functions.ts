import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
        .select("id, candidate_id, status, share_slug, updated_at")
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
      { id: string; status: string; share_slug: string | null }
    > = {};
    (presRows ?? []).forEach((p) => {
      presByCand[p.candidate_id] = {
        id: p.id,
        status: p.status,
        share_slug: p.share_slug,
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

export const createOrRefreshShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        regenerate: z.boolean().optional(),
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
      .select("id, share_slug, access_code, status")
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();

    const slug =
      existing && !data.regenerate && existing.share_slug
        ? existing.share_slug
        : genSlug();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("presentations")
        .update({
          share_slug: slug,
          access_code: data.access_code ?? existing.access_code,
          status: existing.status === "draft" ? "in_review" : existing.status,
        })
        .eq("id", existing.id)
        .select("id, share_slug, access_code, status")
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
        access_code: data.access_code ?? null,
        status: "in_review",
      })
      .select("id, share_slug, access_code, status")
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
        "id, candidate_id, title, subtitle, access_code, status",
      )
      .eq("share_slug", data.share_slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pres) return { error: "not_found" as const };
    if (pres.status === "archived" || pres.status === "draft")
      return { error: "not_available" as const };
    if (pres.access_code && pres.access_code !== (data.access_code ?? ""))
      return { error: "code_required" as const };

    const [{ data: candidate }, { data: sections }] = await Promise.all([
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
    ]);

    if (!candidate) return { error: "not_found" as const };

    const allApproved =
      (sections ?? []).length > 0 &&
      (sections ?? []).every((s) => s.status === "approved");

    return {
      title: pres.title,
      subtitle: pres.subtitle,
      candidate,
      sections: sections ?? [],
      approvalState: allApproved
        ? ("approved" as const)
        : ("draft" as const),
    };
  });
