import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { listCandidates } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/profile-builder")({
  head: () => ({
    meta: [
      { title: "Profile Builder — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfileBuilderIndex,
});

function ProfileBuilderIndex() {
  const list = useServerFn(listCandidates);
  const { data, isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => list({ data: {} as never }),
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Profile builder"
        title="Choose a candidate to shape."
        subtitle="Open a candidate to draft, refine, and preview the executive narrative with Wilson."
      />
      {isLoading ? (
        <p className="text-sm text-foreground/45">Loading candidates…</p>
      ) : (data ?? []).length === 0 ? (
        <ShellCard className="p-10 text-center">
          <h3 className="font-serif text-2xl">No candidates yet</h3>
          <p className="mt-3 text-sm text-foreground/55">
            Add a candidate first, then return here to build the profile.
          </p>
          <Link
            to="/candidates"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--gold-deep)]"
          >
            Go to candidates <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </ShellCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((c) => (
            <Link
              key={c.id}
              to="/profile-builder/$candidateId"
              params={{ candidateId: c.id }}
              className="group"
            >
              <ShellCard className="p-6 transition group-hover:border-[color:var(--gold)]/40">
                <div className="flex items-start justify-between">
                  <Pill tone="soft">{c.status.replace("_", " ")}</Pill>
                  <Sparkles className="h-4 w-4 text-[color:var(--gold-deep)] opacity-0 transition group-hover:opacity-100" />
                </div>
                <h3 className="mt-4 font-serif text-2xl tracking-[-0.02em]">
                  {c.full_name}
                </h3>
                <p className="mt-1 text-sm text-foreground/55">
                  {c.current_title ?? "—"}
                  {c.current_org ? ` · ${c.current_org}` : ""}
                </p>
                <div className="mt-5 text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                  {c.city ?? "Location TBD"} · {c.fit_role ?? "Role TBD"}
                </div>
              </ShellCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
