import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KanbanSquare, List, Plus } from "lucide-react";
import { toast } from "sonner";

import { Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCandidates } from "@/lib/candidates.functions";
import { searchStageEnum, searchStatusEnum } from "@/lib/schemas";
import {
  getSearch,
  linkCandidateToSearch,
  updateSearch,
  updateSearchCandidateStage,
} from "@/lib/searches.functions";
import { PipelineKanban } from "@/components/app/pipeline-kanban";
import type { SearchStage } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/searches/$searchId")({
  head: () => ({
    meta: [
      { title: "Search — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SearchDetailPage,
});

const STAGES = searchStageEnum.options;
const STATUSES = searchStatusEnum.options;

function SearchDetailPage() {
  const { searchId } = useParams({ from: "/_authenticated/searches/$searchId" });
  const get = useServerFn(getSearch);
  const update = useServerFn(updateSearch);
  const stageFn = useServerFn(updateSearchCandidateStage);
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "board">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["search", searchId],
    queryFn: () => get({ data: { id: searchId } }),
  });

  const updateMut = useMutation({
    mutationFn: (patch: { stage?: string; status?: string }) =>
      update({ data: { id: searchId, ...patch } as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["search", searchId] });
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stageMut = useMutation({
    mutationFn: (v: { id: string; stage: SearchStage }) =>
      stageFn({ data: v }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["search", searchId] });
      const prev = qc.getQueryData<typeof data>(["search", searchId]);
      if (prev) {
        qc.setQueryData(["search", searchId], {
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === vars.id ? { ...c, stage: vars.stage } : c,
          ),
        });
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["search", searchId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["search", searchId] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-foreground/45">Loading…</div>;
  }
  if (!data) {
    return <div className="p-8 text-sm text-foreground/45">Not found</div>;
  }
  const { search, candidates } = data;

  return (
    <div className="p-6 lg:p-8">
      <Link
        to="/searches"
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All searches
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            {search.city ?? "—"}
          </div>
          <h1 className="font-serif text-5xl tracking-[-0.05em]">
            {search.church}
          </h1>
          <p className="mt-2 text-xl text-foreground/65">{search.role}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={search.stage}
            onValueChange={(v) => updateMut.mutate({ stage: v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.status}
            onValueChange={(v) => updateMut.mutate({ status: v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ShellCard className="xl:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-foreground/10 bg-[color:var(--soft)] px-5 py-4">
            <h3 className="font-serif text-xl">Candidates in this search</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-foreground/10 bg-card p-0.5">
                <button
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[.14em] transition ${view === "list" ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground"}`}
                >
                  <List className="h-3 w-3" />
                  List
                </button>
                <button
                  onClick={() => setView("board")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[.14em] transition ${view === "board" ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground"}`}
                >
                  <KanbanSquare className="h-3 w-3" />
                  Board
                </button>
              </div>
              <AddCandidateDialog
                searchId={searchId}
                existingIds={candidates.map((c) => c.candidate_id)}
              />
            </div>
          </div>
          {candidates.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-foreground/55">
              No candidates linked yet.
            </div>
          ) : view === "board" ? (
            <div className="p-4">
              <PipelineKanban
                links={candidates}
                onStageChange={(id, stage) => stageMut.mutate({ id, stage })}
              />
            </div>
          ) : (
            candidates.map((link) => (
              <Link
                key={link.id}
                to="/candidates/$candidateId"
                params={{ candidateId: link.candidate_id }}
                className="flex items-center justify-between border-t border-foreground/10 px-5 py-4 hover:bg-[color:var(--soft)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[color:var(--gold)]/20" />
                  <div>
                    <div className="font-semibold">
                      {link.candidate?.full_name ?? "Candidate"}
                    </div>
                    <div className="text-xs text-foreground/45">
                      {link.candidate?.current_title ?? "—"} ·{" "}
                      {link.candidate?.city ?? "—"}
                    </div>
                  </div>
                </div>
                <Pill tone="gold">{link.stage}</Pill>
              </Link>
            ))
          )}
        </ShellCard>

        <ShellCard className="p-6">
          <h3 className="font-serif text-xl">Brief</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Reports to" value={search.reports_to} />
            <Row label="Church size" value={search.church_size} />
            <Row label="Compensation" value={search.compensation} />
          </dl>
          {search.summary && (
            <div className="mt-6 border-t border-foreground/10 pt-5 text-sm leading-6 text-foreground/70">
              {search.summary}
            </div>
          )}
        </ShellCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-foreground/45">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function AddCandidateDialog({
  searchId,
  existingIds,
}: {
  searchId: string;
  existingIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const list = useServerFn(listCandidates);
  const link = useServerFn(linkCandidateToSearch);
  const [pick, setPick] = useState<string>("");

  const { data: cands } = useQuery({
    queryKey: ["candidates", {}],
    queryFn: () => list({}),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      link({ data: { search_id: searchId, candidate_id: pick } }),
    onSuccess: () => {
      toast.success("Candidate added");
      qc.invalidateQueries({ queryKey: ["search", searchId] });
      setOpen(false);
      setPick("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = (cands ?? []).filter((c) => !existingIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Add candidate to search
          </DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="py-6 text-sm text-foreground/55">
            No other candidates available.{" "}
            <Link to="/candidates" className="underline">
              Create one
            </Link>{" "}
            first.
          </p>
        ) : (
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a candidate" />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name} {c.current_title ? `· ${c.current_title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!pick || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
