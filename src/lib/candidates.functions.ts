import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  candidateStatusEnum,
  createCandidateSchema,
  updateCandidateSchema,
} from "./schemas";

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ status: candidateStatusEnum.optional() })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("candidates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: candidate, error: cErr }, { data: links, error: lErr }] =
      await Promise.all([
        supabase.from("candidates").select("*").eq("id", data.id).maybeSingle(),
        supabase
          .from("search_candidates")
          .select("*, search:searches(id, church, role, city)")
          .eq("candidate_id", data.id),
      ]);
    if (cErr) throw new Error(cErr.message);
    if (lErr) throw new Error(lErr.message);
    if (!candidate) throw new Error("Candidate not found");
    return { candidate, searches: links ?? [] };
  });

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createCandidateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("candidates")
      .insert({
        full_name: data.full_name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        city: data.city ?? null,
        current_org: data.current_org ?? null,
        current_title: data.current_title ?? null,
        fit_role: data.fit_role ?? null,
        source: data.source ?? null,
        owner_id: userId,
        status: "new",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateCandidateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("candidates")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
