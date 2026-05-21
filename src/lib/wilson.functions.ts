import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const SYSTEM_PROMPT = `You are Wilson, an AI research assistant for ONE39, an executive search firm specializing in ministry leadership placement.

Your role:
- Help consultants synthesize candidate insights from approved source materials only.
- Draft, refine, and edit executive profile sections (Story, Leadership, Experience, Insights, References, etc.).
- Suggest interview questions, reference-check angles, and search strategy.
- Maintain a warm, editorial, professional voice — never speculative.

Rules:
- If asked about a candidate, only use facts the consultant provides in the conversation. Do not invent biographical details.
- When drafting profile sections, use clear markdown with short paragraphs and selective bolding.
- Stay concise and actionable.`;

export const streamWilsonChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z.array(messageSchema).min(1).max(40),
        candidate_context: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async function* ({ data }) {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const systemMessages = [{ role: "system" as const, content: SYSTEM_PROMPT }];
    if (data.candidate_context) {
      systemMessages.push({
        role: "system" as const,
        content: `Candidate context (source-grounded only):\n${data.candidate_context}`,
      });
    }

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
          messages: [...systemMessages, ...data.messages],
          stream: true,
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text().catch(() => upstream.statusText);
      if (upstream.status === 429)
        throw new Error("Wilson is at capacity — try again in a moment.");
      if (upstream.status === 402)
        throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI gateway error: ${msg}`);
    }

    const reader = upstream.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) yield { delta: delta as string };
          } catch {
            // skip malformed chunk
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  });
