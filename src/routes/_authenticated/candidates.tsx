import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, GitCompare, Plus, Search as SearchIcon, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCandidate, listCandidates } from "@/lib/candidates.functions";
import {
  bulkUpdateCandidateStatus,
  exportCandidatesCsv,
} from "@/lib/candidates-bulk.functions";
import { candidateStatusEnum, type CandidateStatus } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/candidates")({
  head: () => ({
    meta: [
      { title: "Candidates — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CandidatesPage,
});

const statusTone: Record<CandidateStatus, string> = {
  new: "soft",
  in_review: "gold",
  ready: "green",
  presented: "blue",
  declined: "soft",
  placed: "purple",
};

function CandidatesPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const list = useServerFn(listCandidates);
  const bulkStatus = useServerFn(bulkUpdateCandidateStatus);
  const exportFn = useServerFn(exportCandidatesCsv);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", {}],
    queryFn: () => list({}),
  });

  const filtered = (data ?? []).filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.current_org ?? "").toLowerCase().includes(q) ||
      (c.fit_role ?? "").toLowerCase().includes(q)
    );
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bulkMut = useMutation({
    mutationFn: (status: CandidateStatus) =>
      bulkStatus({ data: { ids: Array.from(selected), status } }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.count} candidate${res.count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: (ids: string[] | undefined) =>
      exportFn({ data: ids?.length ? { ids } : {} }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${res.count} candidate${res.count === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCompare() {
    const ids = Array.from(selected).slice(0, 3);
    if (ids.length < 2) {
      toast.error("Select 2 or 3 candidates to compare");
      return;
    }
    navigate({
      to: "/candidates_compare",
      search: { ids: ids.join(",") },
    });
  }

  const noData = !isLoading && (data ?? []).length === 0;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Candidates directory"
        subtitle="Discover, evaluate, and manage candidates for your leadership needs."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={exportMut.isPending || (data ?? []).length === 0}
              onClick={() => exportMut.mutate(undefined)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export all
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Candidate
                </Button>
              </DialogTrigger>
              <NewCandidateDialog onDone={() => setOpen(false)} />
            </Dialog>
          </div>
        }
      />

      {noData ? (
        <ShellCard className="grid place-items-center p-16 text-center">
          <Users className="h-12 w-12 text-[color:var(--gold-deep)]/40" />
          <h3 className="mt-4 font-serif text-3xl">No candidates yet</h3>
          <p className="mt-2 max-w-md text-sm text-foreground/55">
            Add your first candidate to start building executive profiles and
            cinematic profiles.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first candidate
            </Button>
            <Button asChild variant="outline">
              <Link to="/wilson">
                <Sparkles className="mr-2 h-4 w-4" />
                Ask Wilson where to start
              </Link>
            </Button>
          </div>
        </ShellCard>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative max-w-md flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search candidates by name, org, or fit role"
                className="h-12 pl-10"
              />
            </div>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-foreground/10 bg-card px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[.16em] text-foreground/55">
                  {selected.size} selected
                </span>
                <Select onValueChange={(v) => bulkMut.mutate(v as CandidateStatus)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Set status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateStatusEnum.options.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={openCompare}>
                  <GitCompare className="mr-1 h-3.5 w-3.5" />
                  Compare
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportMut.isPending}
                  onClick={() => exportMut.mutate(Array.from(selected))}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          <ShellCard className="overflow-hidden">
            <div className="grid grid-cols-[40px_1.4fr_1fr_1fr_.9fr_.9fr] bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.14em] text-foreground/42">
              <div />
              <div>Candidate</div>
              <div>Current</div>
              <div>Fit target</div>
              <div>Source</div>
              <div>Status</div>
            </div>
            {isLoading && (
              <div className="px-5 py-10 text-sm text-foreground/45">Loading…</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-foreground/55">
                No candidates match your search.
              </div>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[40px_1.4fr_1fr_1fr_.9fr_.9fr] items-center border-t border-foreground/10 px-5 py-4 text-sm transition hover:bg-[color:var(--soft)]"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                    aria-label={`Select ${c.full_name}`}
                  />
                </div>
                <Link
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                  className="flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-[color:var(--gold)]/20" />
                  <div>
                    <div className="font-semibold">{c.full_name}</div>
                    <div className="text-xs text-foreground/42">
                      {c.city ?? "—"}
                    </div>
                  </div>
                </Link>
                <Link
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                >
                  <div>{c.current_title ?? "—"}</div>
                  <div className="text-xs text-foreground/45">
                    {c.current_org ?? ""}
                  </div>
                </Link>
                <Link
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                >
                  {c.fit_role ?? "—"}
                </Link>
                <Link
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                  className="text-foreground/65"
                >
                  {c.source ?? "—"}
                </Link>
                <Link
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                >
                  <Pill tone={statusTone[c.status as CandidateStatus] as never}>
                    {c.status.replace("_", " ")}
                  </Pill>
                </Link>
              </div>
            ))}
          </ShellCard>
        </>
      )}
    </div>
  );
}

function NewCandidateDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createCandidate);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    current_org: "",
    current_title: "",
    fit_role: "",
    source: "",
  });

  const mutation = useMutation({
    mutationFn: () => create({ data: form as never }),
    onSuccess: (row) => {
      toast.success("Candidate created");
      qc.invalidateQueries({ queryKey: ["candidates"] });
      onDone();
      navigate({
        to: "/candidates/$candidateId",
        params: { candidateId: row.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">New candidate</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <F label="Full name" required>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </F>
          <F label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </F>
          <F label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </F>
          <F label="City">
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </F>
          <F label="Current title">
            <Input
              value={form.current_title}
              onChange={(e) =>
                setForm({ ...form, current_title: e.target.value })
              }
            />
          </F>
          <F label="Current organization">
            <Input
              value={form.current_org}
              onChange={(e) =>
                setForm({ ...form, current_org: e.target.value })
              }
            />
          </F>
          <F label="Fit role">
            <Input
              value={form.fit_role}
              onChange={(e) => setForm({ ...form, fit_role: e.target.value })}
            />
          </F>
          <F label="Source">
            <Input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Referral, website, network…"
            />
          </F>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={mutation.isPending || !form.full_name.trim()}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Creating…" : "Create candidate"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function F({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium uppercase tracking-[.16em] text-foreground/55">
        {label}
        {required && <span className="ml-1 text-[color:var(--gold-deep)]">*</span>}
      </Label>
      {children}
    </div>
  );
}
