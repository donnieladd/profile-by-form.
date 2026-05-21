import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  PencilLine,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { DarkCard, PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { getCandidate } from "@/lib/candidates.functions";
import {
  generateProfileSection,
  listProfileSections,
  reorderProfileSections,
  saveProfileSection,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile-builder/$candidateId")({
  head: () => ({
    meta: [
      { title: "Profile Builder — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfileBuilderForCandidate,
});

type SectionRow = {
  id: string;
  section_key: string;
  title: string;
  body_md: string | null;
  status: "not_started" | "draft" | "edited" | "approved";
  order_index: number;
};

function ProfileBuilderForCandidate() {
  const { candidateId } = useParams({
    from: "/_authenticated/profile-builder/$candidateId",
  });
  const getCand = useServerFn(getCandidate);
  const listSections = useServerFn(listProfileSections);
  const saveSection = useServerFn(saveProfileSection);
  const generate = useServerFn(generateProfileSection);
  const reorder = useServerFn(reorderProfileSections);
  const qc = useQueryClient();

  const { data: candData } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCand({ data: { id: candidateId } }),
  });

  const { data: sections } = useQuery({
    queryKey: ["profile-sections", candidateId],
    queryFn: () => listSections({ data: { candidate_id: candidateId } }),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const lastSyncedRef = useRef<string | null>(null);

  // Pick first section by default; sync editor when active section changes from DB
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    const current = activeId
      ? (sections as SectionRow[]).find((s) => s.id === activeId)
      : (sections as SectionRow[])[0];
    if (!current) return;
    if (!activeId) setActiveId(current.id);
    if (lastSyncedRef.current !== current.id && streamingId !== current.id) {
      setDraft(current.body_md ?? "");
      lastSyncedRef.current = current.id;
    }
  }, [sections, activeId, streamingId]);

  const active =
    (sections as SectionRow[] | undefined)?.find((s) => s.id === activeId) ??
    (sections as SectionRow[] | undefined)?.[0];

  const saveMut = useMutation({
    mutationFn: async (status?: "edited" | "approved") => {
      if (!active) return;
      await saveSection({
        data: { id: active.id, body_md: draft, status },
      });
    },
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["profile-sections", candidateId] });
      toast.success(status === "approved" ? "Section approved" : "Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: async (ordered_ids: string[]) => {
      await reorder({ data: { candidate_id: candidateId, ordered_ids } });
    },
    onMutate: async (ordered_ids) => {
      await qc.cancelQueries({ queryKey: ["profile-sections", candidateId] });
      const prev = qc.getQueryData(["profile-sections", candidateId]);
      qc.setQueryData(
        ["profile-sections", candidateId],
        (old: SectionRow[] | undefined) => {
          if (!old) return old;
          const map = new Map(old.map((r) => [r.id, r]));
          return ordered_ids
            .map((id, i) => {
              const row = map.get(id);
              return row ? { ...row, order_index: i } : null;
            })
            .filter(Boolean) as SectionRow[];
        },
      );
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(["profile-sections", candidateId], ctx.prev);
      }
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["profile-sections", candidateId] });
    },
  });

  function moveSection(id: string, dir: -1 | 1) {
    const rows = (sections as SectionRow[] | undefined) ?? [];
    const idx = rows.findIndex((r) => r.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= rows.length) return;
    const next = rows.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    reorderMut.mutate(next.map((r) => r.id));
  }

  async function handleGenerate() {
    if (!active) return;
    setStreamingId(active.id);
    setDraft("");
    setMode("edit");
    try {
      const stream = await generate({
        data: {
          section_id: active.id,
          candidate_id: candidateId,
          section_key: active.section_key,
        },
      });
      for await (const chunk of stream as AsyncIterable<{
        delta?: string;
        done?: boolean;
      }>) {
        if (chunk.delta) setDraft((prev) => prev + chunk.delta);
      }
      toast.success("Wilson finished drafting");
      qc.invalidateQueries({ queryKey: ["profile-sections", candidateId] });
      lastSyncedRef.current = active.id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wilson failed");
    } finally {
      setStreamingId(null);
    }
  }

  const candidate = candData?.candidate;
  const totals = computeReadiness(sections as SectionRow[] | undefined);
  const canPublish = totals.total > 0 && totals.approved === totals.total;
  const isStreaming = streamingId !== null;

  return (
    <div className="p-6 lg:p-8">
      <Link
        to="/profile-builder"
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All builders
      </Link>

      <PageHeader
        eyebrow={`Profile builder · ${candidate?.full_name ?? "…"}`}
        title="Shape the narrative."
        subtitle="Wilson drafts from the source package. You refine, preview, and approve before publishing."
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={canPublish ? "green" : "soft"}>
              {totals.approved}/{totals.total} approved
            </Pill>
            <Button
              size="sm"
              disabled={!canPublish}
              onClick={() => toast.info("Publishing flow lands with presentations.")}
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Publish
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Section rail */}
        <ShellCard className="xl:col-span-3 p-5">
          <Pill>Sections</Pill>
          <div className="mt-5 space-y-2">
            {(sections as SectionRow[] | undefined)?.map((s, i) => {
              const isActive = active?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveId(s.id);
                    setDraft(s.body_md ?? "");
                    lastSyncedRef.current = s.id;
                  }}
                  className={`block w-full rounded-2xl border p-3 text-left transition ${
                    isActive
                      ? "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/8"
                      : "border-foreground/10 bg-card hover:border-foreground/25"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/35">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="mt-1 text-sm font-medium leading-snug">
                    {s.title}
                  </div>
                </button>
              );
            })}
          </div>
        </ShellCard>

        {/* Editor / Preview */}
        <ShellCard className="xl:col-span-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 bg-[color:var(--soft)] px-5 py-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold-deep)]">
                {mode === "edit" ? "Editor" : "Preview"}
              </div>
              <h3 className="mt-1 font-serif text-xl">
                {active?.title ?? "Select a section"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full border border-foreground/10 bg-card p-0.5 text-xs">
                <button
                  onClick={() => setMode("edit")}
                  className={`rounded-full px-3 py-1.5 ${
                    mode === "edit"
                      ? "bg-foreground text-background"
                      : "text-foreground/55"
                  }`}
                >
                  <PencilLine className="mr-1 inline h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => setMode("preview")}
                  className={`rounded-full px-3 py-1.5 ${
                    mode === "preview"
                      ? "bg-foreground text-background"
                      : "text-foreground/55"
                  }`}
                >
                  <Eye className="mr-1 inline h-3 w-3" /> Preview
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!active || isStreaming}
                onClick={handleGenerate}
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                {streamingId === active?.id ? "Drafting…" : "Ask Wilson"}
              </Button>
            </div>
          </div>

          <div className="p-6">
            {mode === "edit" ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="No draft yet. Ask Wilson to compose this section from the source package, then refine the prose."
                  className="min-h-[460px] w-full resize-y rounded-2xl border border-foreground/10 bg-card p-5 font-serif text-[15px] leading-8 text-foreground/85 outline-none focus:border-[color:var(--gold)]/50"
                />
                {streamingId === active?.id && (
                  <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--gold-deep)]">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Wilson is writing…
                  </div>
                )}
              </>
            ) : (
              <article className="prose-editorial min-h-[460px] rounded-2xl border border-foreground/10 bg-card p-8">
                {draft.trim() ? (
                  <ReactMarkdown>{draft}</ReactMarkdown>
                ) : (
                  <p className="text-foreground/40">Nothing to preview yet.</p>
                )}
              </article>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-foreground/45">
                {draft.length.toLocaleString()} characters ·{" "}
                {wordCount(draft).toLocaleString()} words
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isStreaming || !active}
                  onClick={() => saveMut.mutate("edited")}
                >
                  Save draft
                </Button>
                <Button
                  size="sm"
                  disabled={isStreaming || !active || !draft.trim()}
                  onClick={() => saveMut.mutate("approved")}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve section
                </Button>
              </div>
            </div>
          </div>
        </ShellCard>

        {/* Wilson rail */}
        <DarkCard className="xl:col-span-3 p-5">
          <div className="flex items-center gap-2 text-[color:var(--gold)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Wilson</span>
          </div>
          <h3 className="mt-4 font-serif text-xl leading-tight">
            Grounded in the source package.
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Wilson only writes from what's on file for this candidate. If a
            section feels thin, upload more to the source package and ask again.
          </p>

          <div className="mt-5 rounded-2xl bg-white/[0.06] p-4 text-xs leading-5 text-white/55">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              Candidate
            </div>
            <div className="font-serif text-base text-white">
              {candidate?.full_name ?? "—"}
            </div>
            <div className="mt-1">
              {candidate?.current_title ?? "—"}
              {candidate?.current_org ? ` · ${candidate.current_org}` : ""}
            </div>
            <Link
              to="/candidates/$candidateId"
              params={{ candidateId }}
              className="mt-3 inline-flex items-center gap-1 text-[color:var(--gold)]"
            >
              Open candidate · source package
            </Link>
          </div>

          <div className="mt-5 space-y-2">
            <ReadinessBar label="Approved" value={totals.approved} total={totals.total} />
            <ReadinessBar label="Edited" value={totals.edited} total={totals.total} tone="blue" />
            <ReadinessBar label="Draft" value={totals.draft} total={totals.total} tone="gold" />
          </div>
        </DarkCard>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SectionRow["status"] }) {
  const tone =
    status === "approved"
      ? "green"
      : status === "edited"
        ? "blue"
        : status === "draft"
          ? "gold"
          : "soft";
  return <Pill tone={tone as never}>{status.replace("_", " ")}</Pill>;
}

function ReadinessBar({
  label,
  value,
  total,
  tone = "green",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "green" | "blue" | "gold";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const color =
    tone === "blue"
      ? "bg-sky-400"
      : tone === "gold"
        ? "bg-[color:var(--gold)]"
        : "bg-emerald-400";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
        <span>{label}</span>
        <span>
          {value}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function wordCount(s: string) {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function computeReadiness(rows?: SectionRow[]) {
  const total = rows?.length ?? 0;
  const approved = rows?.filter((r) => r.status === "approved").length ?? 0;
  const edited = rows?.filter((r) => r.status === "edited").length ?? 0;
  const draft = rows?.filter((r) => r.status === "draft").length ?? 0;
  return { total, approved, edited, draft };
}
