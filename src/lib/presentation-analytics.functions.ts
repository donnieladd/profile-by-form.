import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --- public update endpoint -------------------------------------------------

// PUBLIC — beacon-style update from the share page. Requires a signed view
// token issued by getPublicPresentation, so an unauthenticated caller cannot
// forge updates against arbitrary view rows.
export const updatePresentationViewDwell = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        view_id: z.string().uuid(),
        share_slug: z.string().min(4).max(64).regex(/^[a-zA-Z0-9_-]+$/),
        token: z.string().min(16).max(128),
        dwell_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000),
        sections_viewed: z.array(z.string().max(64)).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { applyViewDwell } = await import(
      "./presentation-analytics.server"
    );
    return applyViewDwell(data);
  });

// --- analytics readout (authenticated) --------------------------------------

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
    if (!pres)
      return {
        total: 0,
        uniqueViewers: 0,
        last: null as string | null,
        avgDwellMs: 0,
        topSections: [] as { key: string; count: number }[],
        recent: [] as Array<{
          id: string;
          viewer_hash: string | null;
          viewed_at: string;
          user_agent: string | null;
          referrer: string | null;
          dwell_ms: number | null;
        }>,
      };

    const { data: views } = await (supabase as any)
      .from("presentation_views")
      .select(
        "id, viewer_hash, viewed_at, user_agent, referrer, dwell_ms, sections_viewed",
      )
      .eq("presentation_id", pres.id)
      .order("viewed_at", { ascending: false })
      .limit(200);

    const rows = (views ?? []) as Array<{
      id: string;
      viewer_hash: string | null;
      viewed_at: string;
      user_agent: string | null;
      referrer: string | null;
      dwell_ms: number | null;
      sections_viewed: unknown;
    }>;
    const unique = new Set(rows.map((v) => v.viewer_hash ?? v.id)).size;

    const dwellRows = rows.filter(
      (r) => typeof r.dwell_ms === "number" && (r.dwell_ms ?? 0) > 0,
    );
    const avgDwellMs = dwellRows.length
      ? Math.round(
          dwellRows.reduce((s, r) => s + (r.dwell_ms ?? 0), 0) /
            dwellRows.length,
        )
      : 0;

    const sectionCounts: Record<string, number> = {};
    rows.forEach((r) => {
      const arr = Array.isArray(r.sections_viewed)
        ? (r.sections_viewed as string[])
        : [];
      arr.forEach((k) => (sectionCounts[k] = (sectionCounts[k] ?? 0) + 1));
    });
    const topSections = Object.entries(sectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => ({ key, count }));

    return {
      total: rows.length,
      uniqueViewers: unique,
      last: rows[0]?.viewed_at ?? null,
      avgDwellMs,
      topSections,
      recent: rows.slice(0, 10).map((r) => ({
        id: r.id,
        viewer_hash: r.viewer_hash,
        viewed_at: r.viewed_at,
        user_agent: r.user_agent,
        referrer: r.referrer,
        dwell_ms: r.dwell_ms,
      })),
    };
  });
