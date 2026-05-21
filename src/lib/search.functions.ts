import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const q = `%${data.q.replace(/[%_]/g, "")}%`;

    const [cands, searches, pres] = await Promise.all([
      supabase
        .from("candidates")
        .select("id, full_name, email, current_org, fit_role")
        .or(
          `full_name.ilike.${q},email.ilike.${q},current_org.ilike.${q},fit_role.ilike.${q}`,
        )
        .limit(8),
      supabase
        .from("searches")
        .select("id, church, role, city")
        .or(`church.ilike.${q},role.ilike.${q},city.ilike.${q}`)
        .limit(8),
      supabase
        .from("presentations")
        .select("id, candidate_id, title, status")
        .ilike("title", q)
        .limit(8),
    ]);

    return {
      candidates: cands.data ?? [],
      searches: searches.data ?? [],
      presentations: pres.data ?? [],
    };
  });
