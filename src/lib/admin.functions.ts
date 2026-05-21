import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = [
  "owner",
  "admin",
  "search_manager",
  "consultant",
  "recruiting_partner",
] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("owner"))
    throw new Error("Forbidden: admin only");
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [{ data: profiles, error: pe }, { data: roles, error: re }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
    if (pe) throw new Error(pe.message);
    if (re) throw new Error(re.message);
    const rolesByUser: Record<string, string[]> = {};
    (roles ?? []).forEach((r) => {
      (rolesByUser[r.user_id] ??= []).push(r.role);
    });
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: rolesByUser[p.id] ?? [],
    }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // Replace all roles with the selected one (single primary role model).
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      action: "role.update",
      target_type: "user",
      target_id: data.user_id,
      actor: userId,
      payload: { role: data.role },
    });
    return { ok: true };
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(ROLES).default("consultant"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: invited, error } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message);
    if (invited?.user?.id) {
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: invited.user.id, role: data.role },
          { onConflict: "user_id,role" },
        );
    }
    await supabaseAdmin.from("audit_log").insert({
      action: "team.invite",
      target_type: "user",
      target_id: invited?.user?.id ?? null,
      actor: userId,
      payload: { email: data.email, role: data.role },
    });
    return { ok: true, user_id: invited?.user?.id ?? null };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return (data ?? []).map((r) => r.role);
  });
