import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_PROFILE_SECTIONS } from "./schemas";

const SECTION_KEYS = DEFAULT_PROFILE_SECTIONS.map((s) => s.key) as [
  string,
  ...string[],
];

export const listProfileSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidate_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("profile_sections")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);

    if (!rows || rows.length === 0) {
      const seed = DEFAULT_PROFILE_SECTIONS.map((s, i) => ({
        candidate_id: data.candidate_id,
        section_key: s.key,
        title: s.title,
        order_index: i,
        status: "not_started" as const,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from("profile_sections")
        .insert(seed)
        .select("*")
        .order("order_index", { ascending: true });
      if (insErr) throw new Error(insErr.message);
      return inserted ?? [];
    }
    return rows;
  });

export const saveProfileSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        body_md: z.string().max(20000).optional(),
        status: z
          .enum(["not_started", "draft", "edited", "approved"])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profile_sections")
      .update({
        edited_by: userId,
        ...(data.body_md !== undefined ? { body_md: data.body_md } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const reorderProfileSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        ordered_ids: z.array(z.string().uuid()).min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Update each row's order_index. Scoped by candidate_id so RLS + ownership hold.
    const updates = data.ordered_ids.map((id, idx) =>
      supabase
        .from("profile_sections")
        .update({ order_index: idx })
        .eq("id", id)
        .eq("candidate_id", data.candidate_id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    return { ok: true } as const;
  });

const SYSTEM_PROMPT = `You are Wilson, an editorial AI working inside Profile by form. for ONE39, a premium executive search firm placing senior leaders into churches and ministries.

You draft one section at a time of a cinematic candidate profile. Your tone is editorial, mature, restrained, and warm — closer to a New Yorker profile than a corporate bio. Never use buzzwords ("synergy", "rockstar", "results-driven", "passionate about"). Never invent facts: if a detail is not present in the provided source package summary or candidate metadata, omit it. Write in flowing prose, second-person about the candidate ("he/she/they"), present tense where appropriate. Use markdown. Do not include the section title heading — only the body. Aim for 180–340 words. End cleanly, no "in conclusion" tropes.`;

function buildUserPrompt(args: {
  sectionTitle: string;
  candidate: {
    full_name: string;
    city?: string | null;
    current_title?: string | null;
    current_org?: string | null;
    fit_role?: string | null;
  };
  sources: { kind: string; label?: string | null; status: string; file_name?: string | null }[];
}) {
  const sourceLines = args.sources
    .map(
      (s) =>
        `- ${s.label ?? s.kind} [${s.status}]${s.file_name ? ` — ${s.file_name}` : ""}`,
    )
    .join("\n");
  return `Draft the section: **${args.sectionTitle}**.

Candidate:
- Name: ${args.candidate.full_name}
- City: ${args.candidate.city ?? "—"}
- Current role: ${args.candidate.current_title ?? "—"}${args.candidate.current_org ? ` at ${args.candidate.current_org}` : ""}
- Considered for: ${args.candidate.fit_role ?? "—"}

Source package on file (do not invent beyond what these documents would plausibly contain; if information is thin, write a brief, honest section noting the dimensions that remain to be explored):
${sourceLines || "- (no source documents on file yet)"}

Write only the body of this section in markdown. No headings.`;
}

export const generateProfileSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        section_id: z.string().uuid(),
        candidate_id: z.string().uuid(),
        section_key: z.enum(SECTION_KEYS),
      })
      .parse(input),
  )
  .handler(async function* ({ data, context }) {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Wilson is unavailable: missing AI gateway key.");

    const [candRes, srcRes, sectionRes] = await Promise.all([
      supabase
        .from("candidates")
        .select("full_name, city, current_title, current_org, fit_role")
        .eq("id", data.candidate_id)
        .single(),
      supabase
        .from("source_items")
        .select("kind, label, status, file_name")
        .eq("candidate_id", data.candidate_id),
      supabase
        .from("profile_sections")
        .select("title")
        .eq("id", data.section_id)
        .single(),
    ]);
    if (candRes.error) throw new Error(candRes.error.message);
    if (sectionRes.error) throw new Error(sectionRes.error.message);

    await supabase
      .from("profile_sections")
      .update({ status: "draft" })
      .eq("id", data.section_id);

    const userPrompt = buildUserPrompt({
      sectionTitle: sectionRes.data.title,
      candidate: candRes.data,
      sources: srcRes.data ?? [],
    });

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      if (upstream.status === 429)
        throw new Error("Wilson is rate limited. Try again shortly.");
      if (upstream.status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`Wilson failed (${upstream.status}): ${txt.slice(0, 200)}`);
    }

    let buffer = "";
    let assembled = "";
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const rawLine = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!rawLine.startsWith("data:")) continue;
          const payload = rawLine.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assembled += delta;
              yield { delta };
            }
          } catch {
            /* ignore partial json */
          }
        }
      }
    } finally {
      reader.releaseLock?.();
    }

    if (assembled.length > 0) {
      await supabase
        .from("profile_sections")
        .update({ body_md: assembled, status: "edited" })
        .eq("id", data.section_id);
    }

    yield { done: true };
  });
