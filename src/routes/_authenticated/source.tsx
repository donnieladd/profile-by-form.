import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FolderOpen } from "lucide-react";

import { PageHeader, ShellCard } from "@/components/brand/brand";
import { listCandidates } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/source")({
  head: () => ({
    meta: [
      { title: "Source Package — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SourceIndexPage,
});

function SourceIndexPage() {
  const list = useServerFn(listCandidates);
  const { data, isLoading } = useQuery({
    queryKey: ["candidates", {}],
    queryFn: () => list({}),
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Source intake"
        title="Source packages by candidate."
        subtitle="Open a candidate to upload resumes, references, assessments, and notes — the foundation of every cinematic profile."
      />
      <ShellCard className="overflow-hidden">
        <div className="border-b border-foreground/10 bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.16em] text-foreground/42">
          Candidate
        </div>
        {isLoading && (
          <div className="px-5 py-10 text-sm text-foreground/45">Loading…</div>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-foreground/55">
            No candidates yet. Add one to begin building source packages.
          </div>
        )}
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to="/candidates/$candidateId"
            params={{ candidateId: c.id }}
            className="flex items-center justify-between border-t border-foreground/10 px-5 py-4 hover:bg-[color:var(--soft)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold-deep)]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">{c.full_name}</div>
                <div className="text-xs text-foreground/45">
                  {c.current_title ?? "—"} · {c.city ?? "—"}
                </div>
              </div>
            </div>
            <div className="text-xs text-foreground/45">Open package →</div>
          </Link>
        ))}
      </ShellCard>
    </div>
  );
}
