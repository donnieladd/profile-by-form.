import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus, Search } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/searches")({
  head: () => ({
    meta: [
      { title: "Searches — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SearchesPage,
});

const rows = [
  { church: "Faith Chapel", role: "Worship Pastor", city: "Orange County, CA", manager: "Sarah J.", status: "Active", candidates: 27, ready: 5, updated: "May 20, 2025" },
  { church: "Mission Hills Church", role: "Creative Director", city: "San Diego, CA", manager: "Jonathan M.", status: "Shortlisting", candidates: 18, ready: 6, updated: "May 20, 2025" },
  { church: "Grace Community", role: "Production Director", city: "Austin, TX", manager: "Desmond L.", status: "Evaluating", candidates: 14, ready: 3, updated: "May 19, 2025" },
  { church: "Mosaic Church", role: "Coaching + Staffing", city: "Brooklyn, NY", manager: "Sarah J.", status: "Planning", candidates: 0, ready: 0, updated: "May 18, 2025" },
  { church: "Elevation Church", role: "Worship Pastor", city: "Charlotte, NC", manager: "Desmond L.", status: "Active", candidates: 23, ready: 7, updated: "May 17, 2025" },
];

const toneFor = (s: string) =>
  s === "Active"
    ? "green"
    : s === "Shortlisting"
      ? "blue"
      : s === "Evaluating"
        ? "gold"
        : "purple";

function SearchesPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Searches"
        title="Manage every search in progress."
        subtitle="Track momentum, review candidates, and deliver great leaders for the great commission."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Search churches, roles, or managers…"
            className="h-12 pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
        <Button className="ml-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Search
        </Button>
      </div>
      <ShellCard className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.1fr_1.1fr_.8fr_.5fr_.5fr_.9fr] bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.16em] text-foreground/42">
          <div>Church</div>
          <div>Role</div>
          <div>Search Manager</div>
          <div>Status</div>
          <div>Candidates</div>
          <div>Ready</div>
          <div>Last Updated</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.church}
            className="grid grid-cols-[1.4fr_1.1fr_1.1fr_.8fr_.5fr_.5fr_.9fr] items-center border-t border-foreground/10 px-5 py-4 text-sm hover:bg-[color:var(--soft)]"
          >
            <div>
              <div className="font-semibold">{r.church}</div>
              <div className="text-xs text-foreground/42">{r.city}</div>
            </div>
            <div>{r.role}</div>
            <div>{r.manager}</div>
            <div>
              <Pill tone={toneFor(r.status)}>{r.status}</Pill>
            </div>
            <div className="font-semibold">{r.candidates}</div>
            <div className="font-semibold">{r.ready}</div>
            <div className="text-foreground/55">{r.updated}</div>
          </div>
        ))}
      </ShellCard>
    </div>
  );
}
