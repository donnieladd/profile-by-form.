import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWilsonConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wilson_conversations")
      .select("id, title, candidate_id, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getWilsonConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv, error } = await supabase
      .from("wilson_conversations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) throw new Error("Not found");

    const { data: msgs, error: mErr } = await supabase
      .from("wilson_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    return { conversation: conv, messages: msgs ?? [] };
  });

export const createWilsonConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(200).optional(),
        candidate_id: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("wilson_conversations")
      .insert({
        user_id: userId,
        title: data.title ?? "New conversation",
        candidate_id: data.candidate_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const appendWilsonMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant", "system"]),
              content: z.string().min(1).max(60000),
            }),
          )
          .min(1)
          .max(20),
        rename_to: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: conv } = await supabase
      .from("wilson_conversations")
      .select("id")
      .eq("id", data.conversation_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!conv) throw new Error("Not found");

    const { error } = await supabase.from("wilson_messages").insert(
      data.messages.map((m) => ({
        conversation_id: data.conversation_id,
        role: m.role,
        content: m.content,
      })),
    );
    if (error) throw new Error(error.message);

    const patch: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (data.rename_to) patch.title = data.rename_to;
    await supabase
      .from("wilson_conversations")
      .update(patch)
      .eq("id", data.conversation_id);

    return { ok: true };
  });

export const deleteWilsonConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("wilson_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
