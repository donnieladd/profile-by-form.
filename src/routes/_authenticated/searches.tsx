import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Filter, Plus, Search as SearchIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createSearch, listSearches } from "@/lib/searches.functions";
import type { SearchStatus, SearchStage } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/searches")({
  head: () => ({
    meta: [
      { title: "Searches — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SearchesPage,
});

const statusTone: Record<SearchStatus, string> = {
  planning: "soft",
  active: "green",
  shortlisting: "blue",
  evaluating: "gold",
  placed: "purple",
  closed: "soft",
};

function SearchesPage() {
  const list = useServerFn(listSearches);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["searches"],
    queryFn: () => list(),
  });

  const filtered = (data ?? []).filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.church.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Searches"
        title="Manage every search in progress."
        subtitle="Track momentum, review candidates, and deliver great leaders for the great commission."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search churches, roles, or cities…"
            className="h-12 pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Search
            </Button>
          </DialogTrigger>
          <NewSearchDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      <ShellCard className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.1fr_1fr_.8fr_.9fr] bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.16em] text-foreground/42">
          <div>Church</div>
          <div>Role</div>
          <div>Stage</div>
          <div>Status</div>
          <div>Last Updated</div>
        </div>
        {isLoading && (
          <div className="px-5 py-10 text-sm text-foreground/45">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-foreground/55">
            No searches yet. Create your first search to begin.
          </div>
        )}
        {filtered.map((r) => (
          <Link
            key={r.id}
            to="/searches/$searchId"
            params={{ searchId: r.id }}
            className="grid grid-cols-[1.4fr_1.1fr_1fr_.8fr_.9fr] items-center border-t border-foreground/10 px-5 py-4 text-sm hover:bg-[color:var(--soft)]"
          >
            <div>
              <div className="font-semibold">{r.church}</div>
              <div className="text-xs text-foreground/42">{r.city ?? "—"}</div>
            </div>
            <div>{r.role}</div>
            <div className="capitalize text-foreground/70">{(r.stage as SearchStage).replace("_", " ")}</div>
            <div>
              <Pill tone={statusTone[r.status as SearchStatus] as never}>
                {r.status}
              </Pill>
            </div>
            <div className="text-foreground/55">
              {new Date(r.updated_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </ShellCard>
    </div>
  );
}

function NewSearchDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createSearch);
  const [form, setForm] = useState({
    church: "",
    role: "",
    city: "",
    reports_to: "",
    church_size: "",
    compensation: "",
    summary: "",
  });

  const mutation = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: (row) => {
      toast.success("Search created");
      qc.invalidateQueries({ queryKey: ["searches"] });
      onDone();
      navigate({ to: "/searches/$searchId", params: { searchId: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">New search</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Church" required>
            <Input
              value={form.church}
              onChange={(e) => setForm({ ...form, church: e.target.value })}
            />
          </Field>
          <Field label="Role" required>
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Reports to">
            <Input
              value={form.reports_to}
              onChange={(e) =>
                setForm({ ...form, reports_to: e.target.value })
              }
            />
          </Field>
          <Field label="Church size">
            <Input
              value={form.church_size}
              onChange={(e) =>
                setForm({ ...form, church_size: e.target.value })
              }
            />
          </Field>
          <Field label="Compensation">
            <Input
              value={form.compensation}
              onChange={(e) =>
                setForm({ ...form, compensation: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Summary">
          <Textarea
            rows={4}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending || !form.church.trim() || !form.role.trim()
          }
        >
          {mutation.isPending ? "Creating…" : "Create search"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({
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
