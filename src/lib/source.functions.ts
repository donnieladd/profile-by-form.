import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_SOURCE_CHECKLIST,
  sourceItemKindEnum,
  sourceItemStatusEnum,
} from "./schemas";

const SOURCE_BUCKET = "source-files";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export const listSourceItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidate_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("source_items")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Seed default checklist on first visit
    if (!rows || rows.length === 0) {
      const seed = DEFAULT_SOURCE_CHECKLIST.map((c) => ({
        candidate_id: data.candidate_id,
        kind: c.kind,
        label: c.label,
        status: "needed" as const,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from("source_items")
        .insert(seed)
        .select("*");
      if (insErr) throw new Error(insErr.message);
      return inserted ?? [];
    }
    return rows;
  });

export const updateSourceItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: sourceItemStatusEnum,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("source_items")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSourceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("source_items")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (existing?.storage_path) {
      await supabase.storage.from(SOURCE_BUCKET).remove([existing.storage_path]);
    }
    const { error } = await supabase.from("source_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        file_name: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const path = `candidates/${data.candidate_id}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const { data: signed, error } = await supabase.storage
      .from(SOURCE_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const attachUploadedFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        candidate_id: z.string().uuid(),
        kind: sourceItemKindEnum,
        label: z.string().trim().max(200).optional(),
        storage_path: z.string().min(1).max(500),
        file_name: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("source_items")
        .update({
          storage_path: data.storage_path,
          file_name: data.file_name,
          status: "uploaded",
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("source_items")
      .insert({
        candidate_id: data.candidate_id,
        kind: data.kind,
        label: data.label ?? null,
        storage_path: data.storage_path,
        file_name: data.file_name,
        status: "uploaded",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createSignedDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: item, error } = await supabase
      .from("source_items")
      .select("storage_path, file_name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item?.storage_path) throw new Error("No file attached");
    const { data: signed, error: sErr } = await supabase.storage
      .from(SOURCE_BUCKET)
      .createSignedUrl(item.storage_path, 60 * 5);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, file_name: item.file_name };
  });
