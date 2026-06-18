import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamChatCompletion } from "./ai-router";

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
        model_id: z
          .string()
          .max(200)
          .optional(),
      })
      .parse(input),
  )
  .handler(async function* ({ data }) {
    const systemMessages = [{ role: "system" as const, content: SYSTEM_PROMPT }];
    if (data.candidate_context) {
      systemMessages.push({
        role: "system" as const,
        content: `Candidate context (source-grounded only):\n${data.candidate_context}`,
      });
    }

    const stream = streamChatCompletion({
      modelId: data.model_id,
      messages: [...systemMessages, ...data.messages],
    });

    for await (const chunk of stream) {
      if (chunk.delta) yield { delta: chunk.delta };
    }
  });
