import { useEffect, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowUp, MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DarkCard, PageHeader, WilsonMark } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCandidates } from "@/lib/candidates.functions";
import { streamWilsonChat } from "@/lib/wilson.functions";
import {
  appendWilsonMessages,
  createWilsonConversation,
  deleteWilsonConversation,
  getWilsonConversation,
  listWilsonConversations,
} from "@/lib/wilson-conversations.functions";
import { cn } from "@/lib/utils";
import { AI_MODELS } from "@/lib/ai-router";

export const Route = createFileRoute("/_authenticated/wilson")({
  head: () => ({
    meta: [
      { title: "Wilson — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WilsonPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function WilsonPage() {
  const listCands = useServerFn(listCandidates);
  const chatFn = useServerFn(streamWilsonChat);
  const listConv = useServerFn(listWilsonConversations);
  const getConv = useServerFn(getWilsonConversation);
  const createConv = useServerFn(createWilsonConversation);
  const appendMsgs = useServerFn(appendWilsonMessages);
  const deleteConv = useServerFn(deleteWilsonConversation);
  const qc = useQueryClient();

  const { data: candidates } = useQuery({
    queryKey: ["candidates", {}],
    queryFn: () => listCands({}),
  });

  const { data: conversations } = useQuery({
    queryKey: ["wilson-conversations"],
    queryFn: () => listConv(),
  });

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [candidateId, setCandidateId] = useState<string>("");
  const [modelId, setModelId] = useState(AI_MODELS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  useEffect(() => {
    const saved = window.localStorage.getItem("profile-by-form.ai.model");
    if (saved && AI_MODELS.some((m) => m.id === saved)) {
      setModelId(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("profile-by-form.ai.model", modelId);
  }, [modelId]);

  async function loadConversation(id: string) {
    if (streaming) return;
    setActiveConvId(id);
    const res = await getConv({ data: { id } });
    setMessages(
      res.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    );
    if (res.conversation.candidate_id) setCandidateId(res.conversation.candidate_id);
  }

  async function newConversation() {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
  }

  async function removeConversation(id: string) {
    await deleteConv({ data: { id } });
    qc.invalidateQueries({ queryKey: ["wilson-conversations"] });
    if (activeConvId === id) newConversation();
    toast.success("Conversation deleted");
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      const created = await createConv({
        data: {
          title: text.slice(0, 60),
          candidate_id: candidateId || undefined,
        },
      });
      convId = created.id;
      setActiveConvId(convId);
      qc.invalidateQueries({ queryKey: ["wilson-conversations"] });
    }

    const nextMessages: Msg[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    const selected = candidates?.find((c) => c.id === candidateId);
    const candidateContext = selected
      ? `Name: ${selected.full_name}\nRole fit: ${selected.fit_role ?? "—"}\nCurrent: ${selected.current_title ?? "—"} at ${selected.current_org ?? "—"}\nCity: ${selected.city ?? "—"}`
      : undefined;

    let finalAssistant = "";
    try {
      const iter = await chatFn({
        data: {
          messages: nextMessages
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content })),
          candidate_context: candidateContext,
          model_id: modelId,
        },
      });
      for await (const chunk of iter as AsyncIterable<{ delta: string }>) {
        finalAssistant += chunk.delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk.delta,
          };
          return copy;
        });
      }

      // Persist user + assistant
      if (convId && finalAssistant.trim()) {
        await appendMsgs({
          data: {
            conversation_id: convId,
            messages: [
              { role: "user", content: text },
              { role: "assistant", content: finalAssistant },
            ],
          },
        });
        qc.invalidateQueries({ queryKey: ["wilson-conversations"] });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `_${msg}_` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Wilson AI"
        title="Ministry-trained intelligence."
        subtitle="Persistent conversations. Source-grounded answers. Optional candidate context."
      />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <DarkCard className="p-3 lg:max-h-[660px] lg:overflow-y-auto">
          <Button
            onClick={newConversation}
            className="mb-3 w-full bg-[color:var(--gold)] text-[color:var(--deep)] hover:bg-[color:var(--gold)]/90"
            size="sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            New conversation
          </Button>
          <div className="space-y-1">
            {(conversations ?? []).length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-white/40">
                No saved conversations yet.
              </div>
            )}
            {(conversations ?? []).map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition",
                  activeConvId === c.id
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <button
                  onClick={() => loadConversation(c.id)}
                  className="flex flex-1 items-center gap-2 truncate text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  onClick={() => removeConversation(c.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3 text-white/40 hover:text-white" />
                </button>
              </div>
            ))}
          </div>
        </DarkCard>

        <DarkCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <WilsonMark className="h-9 w-11 text-[color:var(--gold)]" />
                <div>
                <div className="text-sm font-semibold text-white">Wilson</div>
                <div className="text-xs text-white/45">
                  {AI_MODELS.find((m) => m.id === modelId)?.label ??
                    "AI model streaming"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[230px]">
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="h-9 border-white/15 bg-white/[0.06] text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger className="h-9 w-[240px] border-white/15 bg-white/[0.06] text-xs text-white">
                  <SelectValue placeholder="Optional candidate context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No candidate</SelectItem>
                  {(candidates ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="h-[480px] overflow-y-auto bg-[color:var(--deep)] p-6"
          >
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
                  <h3 className="mt-3 font-serif text-2xl text-white">
                    How can Wilson help?
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-white/45">
                    Ask for a draft profile section, brainstorm interview
                    questions, or summarize a candidate's track record.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                      "Draft a Leadership Profile section",
                      "Suggest 5 reference-check questions",
                      "Compare two candidates for a worship pastor role",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-[color:var(--gold)]/60 hover:text-white"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[80%] rounded-2xl bg-[color:var(--gold)]/15 px-4 py-3 text-sm text-white"
                        : "mr-auto max-w-[85%] rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-white/90"
                    }
                  >
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>
                        {m.content ||
                          (streaming && i === messages.length - 1 ? "…" : "")}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[color:var(--deep)] p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask Wilson… (Enter to send, Shift+Enter for newline)"
                className="min-h-[60px] resize-none border-white/15 bg-white/[0.06] text-white placeholder:text-white/30"
                disabled={streaming}
              />
              <Button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="h-[60px] bg-[color:var(--gold)] text-[color:var(--deep)] hover:bg-[color:var(--gold)]/90"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
