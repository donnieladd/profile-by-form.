import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// PUBLIC — called from the public share route to log a view.
export const logPresentationView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        share_slug: z.string().min(4).max(64).regex(/^[a-zA-Z0-9_-]+$/),
        user_agent: z.string().max(500).optional(),
        referrer: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: pres } = await supabaseAdmin
      .from("presentations")
      .select("id, candidate_id, created_by")
      .eq("share_slug", data.share_slug)
      .maybeSingle();
    if (!pres) return { ok: false };

    // Generate a soft viewer fingerprint from UA only — no IP collected.
    const seed = `${data.user_agent ?? ""}|${new Date().toISOString().slice(0, 10)}`;
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(seed),
    );
    const viewerHash = Array.from(new Uint8Array(buf))
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await supabaseAdmin.from("presentation_views").insert({
      presentation_id: pres.id,
      share_slug: data.share_slug,
      viewer_hash: viewerHash,
      user_agent: data.user_agent ?? null,
      referrer: data.referrer ?? null,
    });

    // Notify the presentation owner
    if (pres.created_by) {
      await supabaseAdmin.from("notifications").insert({
        user_id: pres.created_by,
        kind: "share_view",
        title: "Your share link was opened",
        body: "Someone just viewed a candidate presentation.",
        link: `/candidates/${pres.candidate_id}`,
      });
    }

    return { ok: true };
  });

export const getPresentationStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidate_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pres } = await supabase
      .from("presentations")
      .select("id, share_slug")
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();
    if (!pres) return { total: 0, uniqueViewers: 0, last: null, recent: [] };

    const { data: views } = await supabase
      .from("presentation_views")
      .select("id, viewer_hash, viewed_at, user_agent, referrer")
      .eq("presentation_id", pres.id)
      .order("viewed_at", { ascending: false })
      .limit(50);

    const rows = views ?? [];
    const unique = new Set(rows.map((v) => v.viewer_hash ?? v.id)).size;
    return {
      total: rows.length,
      uniqueViewers: unique,
      last: rows[0]?.viewed_at ?? null,
      recent: rows.slice(0, 10),
    };
  });
