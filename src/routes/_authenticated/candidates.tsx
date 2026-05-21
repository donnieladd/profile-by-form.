import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
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
import { createCandidate, listCandidates } from "@/lib/candidates.functions";
import type { CandidateStatus } from "@/lib/schemas";

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
  const list = useServerFn(listCandidates);

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

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Candidates directory"
        subtitle="Discover, evaluate, and manage candidates for your leadership needs."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <NewCandidateDialog onDone={() => setOpen(false)} />
          </Dialog>
        }
      />
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
      </div>
      <ShellCard className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_.9fr_.9fr] bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.14em] text-foreground/42">
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
            No candidates yet.
          </div>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/candidates/$candidateId"
            params={{ candidateId: c.id }}
            className="grid grid-cols-[1.4fr_1fr_1fr_.9fr_.9fr] items-center border-t border-foreground/10 px-5 py-4 text-sm hover:bg-[color:var(--soft)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[color:var(--gold)]/20" />
              <div>
                <div className="font-semibold">{c.full_name}</div>
                <div className="text-xs text-foreground/42">
                  {c.city ?? "—"}
                </div>
              </div>
            </div>
            <div>
              <div>{c.current_title ?? "—"}</div>
              <div className="text-xs text-foreground/45">
                {c.current_org ?? ""}
              </div>
            </div>
            <div>{c.fit_role ?? "—"}</div>
            <div className="text-foreground/65">{c.source ?? "—"}</div>
            <div>
              <Pill tone={statusTone[c.status as CandidateStatus] as never}>
                {c.status.replace("_", " ")}
              </Pill>
            </div>
          </Link>
        ))}
      </ShellCard>
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
