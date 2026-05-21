import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createSearchSchema,
  updateSearchSchema,
} from "./schemas";

export const listSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("searches")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: search, error: sErr }, { data: links, error: lErr }] =
      await Promise.all([
        supabase.from("searches").select("*").eq("id", data.id).maybeSingle(),
        supabase
          .from("search_candidates")
          .select("*, candidate:candidates(*)")
          .eq("search_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
    if (sErr) throw new Error(sErr.message);
    if (lErr) throw new Error(lErr.message);
    if (!search) throw new Error("Search not found");
    return { search, candidates: links ?? [] };
  });

export const createSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("searches")
      .insert({
        church: data.church,
        role: data.role,
        city: data.city ?? null,
        reports_to: data.reports_to ?? null,
        church_size: data.church_size ?? null,
        compensation: data.compensation ?? null,
        summary: data.summary ?? null,
        manager_id: userId,
        stage: "intake",
        status: "planning",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("searches")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const linkCandidateToSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search_id: z.string().uuid(),
        candidate_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("search_candidates")
      .insert({
        search_id: data.search_id,
        candidate_id: data.candidate_id,
        stage: "sourcing",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
