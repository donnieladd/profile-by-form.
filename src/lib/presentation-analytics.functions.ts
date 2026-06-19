import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// --- internal helpers (server-only) -----------------------------------------

function tokenSecret(): string {
  const s =
    process.env.VIEW_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET;
  if (!s)
    throw new Error(
      "View token secret missing: set VIEW_TOKEN_SECRET (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  return s;
}

export async function signViewToken(payload: {
  view_id: string;
  presentation_id: string;
  share_slug: string;
}) {
  const message = `${payload.view_id}|${payload.presentation_id}|${payload.share_slug}`;
  const keyData = new TextEncoder().encode(tokenSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return base64urlFromBuffer(signature);
}

function base64urlFromBuffer(buf: ArrayBufferLike) {
  const bytes = new Uint8Array(buf);
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBytes(input: string) {
  const pad = input.length % 4 === 2 ? "==" : input.length % 4 === 3 ? "=" : "";
  const cleaned = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const raw = atob(cleaned);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function verifyViewToken(payload: {
  view_id: string;
  presentation_id: string;
  share_slug: string;
  token: string;
}) {
  const expected = await signViewToken(payload);
  const a = base64urlToBytes(expected);
  const b = base64urlToBytes(payload.token);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Hash a soft viewer fingerprint from UA + today's date. We never store an IP.
async function viewerHashFromUA(ua: string | null | undefined) {
  const seed = `${ua ?? ""}|${new Date().toISOString().slice(0, 10)}`;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(seed),
  );
  return Array.from(new Uint8Array(buf))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Create-or-reuse a view row for this viewer within the rate-limit window.
// Returns view_id + token. ONLY callable from server code (see getPublicPresentation).
export async function recordPresentationView(args: {
  presentation_id: string;
  candidate_id: string;
  owner_id: string | null;
  share_slug: string;
  user_agent: string | null;
  referrer: string | null;
}) {
  const viewerHash = await viewerHashFromUA(args.user_agent);
  const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Rate-limit: reuse existing view from the same viewer in the last 5 min.
  const { data: recent } = await supabaseAdmin
    .from("presentation_views")
    .select("id, viewed_at")
    .eq("presentation_id", args.presentation_id)
    .eq("viewer_hash", viewerHash)
    .gte("viewed_at", sinceIso)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let viewId: string | null = recent?.id ?? null;
  let isNew = false;

  if (!viewId) {
    const { data: inserted } = await supabaseAdmin
      .from("presentation_views")
      .insert({
        presentation_id: args.presentation_id,
        share_slug: args.share_slug,
        viewer_hash: viewerHash,
        user_agent: args.user_agent?.slice(0, 500) ?? null,
        referrer: args.referrer?.slice(0, 500) ?? null,
      })
      .select("id")
      .single();
    viewId = inserted?.id ?? null;
    isNew = true;
  }

  // Owner notification — only on the *first* view in the window, and only if
  // the owner opted in (default true). Falls back to true when no row exists.
  if (isNew && args.owner_id) {
    const { data: prefs } = await (supabaseAdmin as any)
      .from("notification_preferences")
      .select("notify_share_view")
      .eq("user_id", args.owner_id)
      .maybeSingle();
    const wantsInApp =
      (prefs as { notify_share_view?: boolean } | null)?.notify_share_view ??
      true;
    if (wantsInApp) {
      await supabaseAdmin.from("notifications").insert({
        user_id: args.owner_id,
        kind: "share_view",
        title: "Your share link was opened",
        body: "Someone just viewed a candidate presentation.",
        link: `/candidates/${args.candidate_id}`,
      });
    }
  }

  if (!viewId) return null;

    return {
      view_id: viewId,
      token: await signViewToken({
        view_id: viewId,
        presentation_id: args.presentation_id,
        share_slug: args.share_slug,
      }),
    };
  }

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
    // Look up the view row to learn the presentation_id needed to verify.
    const { data: row } = await supabaseAdmin
      .from("presentation_views")
      .select("id, presentation_id, share_slug")
      .eq("id", data.view_id)
      .maybeSingle();
    if (!row) return { ok: false as const };
    if (row.share_slug !== data.share_slug) return { ok: false as const };

    const ok = await verifyViewToken({
      view_id: row.id,
      presentation_id: row.presentation_id,
      share_slug: row.share_slug,
      token: data.token,
    });
    if (!ok) return { ok: false as const };

    // Only allow dwell to grow monotonically (prevents downgrade spam).
    await (supabaseAdmin as any)
      .from("presentation_views")
      .update({
        dwell_ms: data.dwell_ms,
        sections_viewed: data.sections_viewed ?? null,
      })
      .eq("id", data.view_id);
    return { ok: true as const };
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
