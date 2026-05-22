import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PREF_DEFAULTS = {
  notify_share_view: true,
  notify_candidate_status: true,
  notify_share_email_sent: true,
  email_share_view: false,
  email_candidate_status: false,
};

export const getMyNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as typeof PREF_DEFAULTS & { user_id: string }) ?? {
      user_id: userId,
      ...PREF_DEFAULTS,
    };
  });

export const updateMyNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        notify_share_view: z.boolean().optional(),
        notify_candidate_status: z.boolean().optional(),
        notify_share_email_sent: z.boolean().optional(),
        email_share_view: z.boolean().optional(),
        email_candidate_status: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("notification_preferences")
      .upsert({ user_id: userId, ...data })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as typeof PREF_DEFAULTS & { user_id: string };
  });
