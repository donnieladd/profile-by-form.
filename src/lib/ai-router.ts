export type AIProvider = "lovable" | "openai" | "anthropic";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModelId =
  | "google/gemini-2.5-flash"
  | "gpt-4o-mini"
  | "claude-3-5-sonnet-20241022";

export type AIModelDefinition = {
  id: AIModelId;
  label: string;
  provider: AIProvider;
};

export const AI_MODELS: AIModelDefinition[] = [
  {
    id: "google/gemini-2.5-flash",
    label: "Google Gemini 2.5 Flash (Lovable)",
    provider: "lovable",
  },
  { id: "gpt-4o-mini", label: "OpenAI GPT-4o Mini", provider: "openai" },
  {
    id: "claude-3-5-sonnet-20241022",
    label: "Anthropic Claude 3.5 Sonnet",
    provider: "anthropic",
  },
];

const DEFAULT_AI_MODEL: AIModelDefinition = AI_MODELS[0];

function resolveModel(modelId?: string) {
  const match = AI_MODELS.find((m) => m.id === modelId);
  return match ?? DEFAULT_AI_MODEL;
}

function parseGoogleLikePayload(payload: unknown) {
  const delta = (payload as { choices?: Array<{ delta?: { content?: string } }> })
    .choices?.[0]?.delta?.content;
  return typeof delta === "string" && delta.length > 0 ? delta : "";
}

function parseAnthropicPayload(payload: unknown) {
  const json = payload as {
    type?: string;
    delta?: { type?: string; text?: string };
  };
  if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
    return typeof json.delta.text === "string" && json.delta.text.length > 0
      ? json.delta.text
      : "";
  }
  return "";
}

function buildAnthropicMessages(messages: AIMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const bodyMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));
  return { system: system || undefined, messages: bodyMessages };
}

export async function* streamChatCompletion(args: {
  modelId?: string;
  messages: AIMessage[];
}) {
  const selected = resolveModel(args.modelId);

  if (selected.provider === "lovable") {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selected.id,
          stream: true,
          messages: args.messages,
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => upstream.statusText);
      throw new Error(`AI gateway error (${upstream.status}): ${txt.slice(0, 200)}`);
    }

    const reader = upstream.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = parseGoogleLikePayload(json);
            if (delta) yield { delta };
          } catch {
            // Skip partials and malformed chunks.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  if (selected.provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selected.id,
        stream: true,
        messages: args.messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => upstream.statusText);
      throw new Error(`OpenAI error (${upstream.status}): ${txt.slice(0, 200)}`);
    }

    const reader = upstream.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = parseGoogleLikePayload(json);
            if (delta) yield { delta };
          } catch {
            // Skip malformed chunk.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const { system, messages } = buildAnthropicMessages(args.messages);
  if (!system && messages.length === 0) {
    throw new Error("Anthropic needs at least one user message");
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selected.id,
      max_tokens: 2000,
      stream: true,
      system,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => upstream.statusText);
    throw new Error(`Anthropic error (${upstream.status}): ${txt.slice(0, 200)}`);
  }

  const reader = upstream.body
    .pipeThrough(new TextDecoderStream())
    .getReader();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "data: [DONE]" || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = parseAnthropicPayload(json);
          if (delta) yield { delta };
        } catch {
          // Skip malformed chunk.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

