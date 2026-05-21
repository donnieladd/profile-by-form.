import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [searches, candidates, sections, presentations] = await Promise.all([
      supabase
        .from("searches")
        .select("id,status", { count: "exact", head: false })
        .neq("status", "placed"),
      supabase.from("candidates").select("id", { count: "exact", head: true }),
      supabase
        .from("profile_sections")
        .select("id,status", { count: "exact", head: false }),
      supabase
        .from("presentations")
        .select("id,status", { count: "exact", head: false }),
    ]);

    const inProgressSections = (sections.data ?? []).filter(
      (s) => s.status !== "approved",
    ).length;
    const approvedPresentations = (presentations.data ?? []).filter(
      (p) => p.status === "ready" || p.status === "shared",
    ).length;

    return {
      activeSearches: searches.count ?? (searches.data?.length ?? 0),
      candidates: candidates.count ?? 0,
      profilesInProgress: inProgressSections,
      presentationsReady: approvedPresentations,
    };
  });

export const getRecentSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("searches")
      .select("id, church, role, city, stage, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((s) => s.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: sc } = await supabase
        .from("search_candidates")
        .select("search_id")
        .in("search_id", ids);
      counts = (sc ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.search_id] = (acc[row.search_id] ?? 0) + 1;
        return acc;
      }, {});
    }
    return (data ?? []).map((s) => ({ ...s, candidateCount: counts[s.id] ?? 0 }));
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, action, target_type, target_id, created_at, actor")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return [] as Array<{ id: string; action: string; target_type: string | null; target_id: string | null; created_at: string; actor_name: string | null }>;
    const actors = Array.from(new Set((data ?? []).map((d) => d.actor).filter(Boolean))) as string[];
    let names: Record<string, string> = {};
    if (actors.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actors);
      names = (p ?? []).reduce<Record<string, string>>((acc, row) => {
        acc[row.id] = row.full_name ?? row.email ?? "Member";
        return acc;
      }, {});
    }
    return (data ?? []).map((d) => ({
      ...d,
      actor_name: d.actor ? (names[d.actor] ?? null) : null,
    }));
  });
