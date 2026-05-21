import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { candidateStatusEnum } from "./schemas";

export const bulkUpdateCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        status: candidateStatusEnum,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("candidates")
      .update({ status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const bulkDeleteCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("candidates")
      .delete()
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const compareCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(2).max(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: candidates }, { data: sections }] = await Promise.all([
      supabase
        .from("candidates")
        .select(
          "id, full_name, fit_role, city, current_org, current_title, email, status, source",
        )
        .in("id", data.ids),
      supabase
        .from("profile_sections")
        .select("candidate_id, section_key, title, body_md, status")
        .in("candidate_id", data.ids)
        .order("order_index", { ascending: true }),
    ]);

    // Preserve order user requested
    const byId: Record<string, NonNullable<typeof candidates>[number]> = {};
    (candidates ?? []).forEach((c) => (byId[c.id] = c));
    const ordered = data.ids.map((id) => byId[id]).filter(Boolean);

    return {
      candidates: ordered,
      sections: sections ?? [],
    };
  });

export const bulkLinkCandidatesToSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search_id: z.string().uuid(),
        candidate_ids: z.array(z.string().uuid()).min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const rows = data.candidate_ids.map((cid) => ({
      search_id: data.search_id,
      candidate_id: cid,
      stage: "sourcing" as const,
    }));
    const { error } = await supabase.from("search_candidates").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });
