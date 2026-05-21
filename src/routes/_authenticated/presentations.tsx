import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Presentation as PresentationIcon, Search } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listPresentationCandidates } from "@/lib/presentations.functions";

export const Route = createFileRoute("/_authenticated/presentations")({
  head: () => ({
    meta: [
      { title: "Presentations — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PresentationsPage,
});

type StatusFilter = "all" | "ready" | "drafting";

function PresentationsPage() {
  const fn = useServerFn(listPresentationCandidates);
  const { data, isLoading } = useQuery({
    queryKey: ["presentation-candidates"],
    queryFn: () => fn(),
  });

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const items = (data ?? []).filter((c) => {
    if (q && !c.full_name.toLowerCase().includes(q.toLowerCase())) return false;
    const ready =
      c.stats.total > 0 && c.stats.approved === c.stats.total;
    if (filter === "ready" && !ready) return false;
    if (filter === "drafting" && ready) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Presentation builder"
        title="Cinematic candidate presentations."
        subtitle="Every candidate with a profile shows here. Open one to preview, export, or share."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Filter by candidate name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        {(["all", "ready", "drafting"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-foreground/45">Loading…</div>
      ) : items.length === 0 ? (
        <ShellCard className="p-12 text-center">
          <PresentationIcon className="mx-auto h-10 w-10 text-foreground/30" />
          <h3 className="mt-4 font-serif text-2xl">No presentations yet.</h3>
          <p className="mt-2 text-sm text-foreground/55">
            Generate profile sections for a candidate to start building their
            cinematic presentation.
          </p>
          <Button asChild className="mt-5">
            <Link to="/candidates">Open candidates</Link>
          </Button>
        </ShellCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => {
            const ready = c.stats.approved === c.stats.total;
            return (
              <Link
                key={c.id}
                to="/candidates/$candidateId"
                params={{ candidateId: c.id }}
                className="group"
              >
                <ShellCard className="h-full p-6 transition hover:border-[color:var(--gold)]/40 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,var(--gold),var(--ink))] font-serif text-xl text-white">
                        {c.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-serif text-xl tracking-tight">
                        {c.full_name}
                      </div>
                      <div className="text-sm text-foreground/55">
                        {c.fit_role ?? c.current_title ?? "Candidate"}
                      </div>
                      {c.current_org && (
                        <div className="text-xs text-foreground/40">
                          {c.current_org}
                        </div>
                      )}
                    </div>
                    <Pill tone={ready ? "green" : "gold"}>
                      {ready ? "Approved" : "Draft"}
                    </Pill>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-foreground/[0.04] p-2">
                      <div className="text-base font-semibold">
                        {c.stats.total}
                      </div>
                      <div className="text-foreground/45">Sections</div>
                    </div>
                    <div className="rounded-lg bg-foreground/[0.04] p-2">
                      <div className="text-base font-semibold">
                        {c.stats.drafted}
                      </div>
                      <div className="text-foreground/45">Drafted</div>
                    </div>
                    <div className="rounded-lg bg-foreground/[0.04] p-2">
                      <div className="text-base font-semibold">
                        {c.stats.approved}
                      </div>
                      <div className="text-foreground/45">Approved</div>
                    </div>
                  </div>
                  {c.presentation?.share_slug && (
                    <div className="mt-4 text-xs text-foreground/45">
                      Share link active ·{" "}
                      <span className="font-mono">
                        /p/{c.presentation.share_slug.slice(0, 8)}…
                      </span>
                    </div>
                  )}
                </ShellCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
