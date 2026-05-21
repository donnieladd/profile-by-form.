import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, X } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { compareCandidates } from "@/lib/candidates-bulk.functions";

type Search = { ids?: string };

export const Route = createFileRoute("/_authenticated/candidates_compare")({
  head: () => ({
    meta: [
      { title: "Compare candidates — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    ids: typeof search.ids === "string" ? search.ids : undefined,
  }),
  component: CompareCandidatesPage,
});

function CompareCandidatesPage() {
  const search = Route.useSearch();
  const ids = (search.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length === 36);

  const compareFn = useServerFn(compareCandidates);
  const { data, isLoading, error } = useQuery({
    queryKey: ["compare", ids.join(",")],
    queryFn: () => compareFn({ data: { ids } }),
    enabled: ids.length >= 2,
  });

  const [openSection, setOpenSection] = useState<string | null>(null);

  if (ids.length < 2) {
    return (
      <div className="p-8">
        <Link
          to="/candidates"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-foreground/55 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to candidates
        </Link>
        <ShellCard className="p-10 text-center text-sm text-foreground/55">
          Select 2 or 3 candidates from the directory to compare.
        </ShellCard>
      </div>
    );
  }

  if (isLoading)
    return <div className="p-8 text-sm text-foreground/45">Loading…</div>;
  if (error)
    return (
      <div className="p-8 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  if (!data) return null;

  const candidates = data.candidates;
  const sectionKeys = Array.from(
    new Set(data.sections.map((s) => s.section_key)),
  );

  function sectionFor(candId: string, key: string) {
    return data!.sections.find(
      (s) => s.candidate_id === candId && s.section_key === key,
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <Link
        to="/candidates"
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to candidates
      </Link>

      <PageHeader
        eyebrow="Side-by-side"
        title="Compare candidates"
        subtitle={`Comparing ${candidates.length} candidates across their executive profile.`}
      />

      <ShellCard className="overflow-hidden">
        <div
          className="grid border-b border-foreground/10 bg-[color:var(--soft)]"
          style={{
            gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
          }}
        >
          <div className="p-5 text-xs font-bold uppercase tracking-[.14em] text-foreground/40">
            Field
          </div>
          {candidates.map((c) => (
            <div key={c.id} className="border-l border-foreground/10 p-5">
              <Link
                to="/candidates/$candidateId"
                params={{ candidateId: c.id }}
                className="font-serif text-2xl hover:text-[color:var(--gold-deep)]"
              >
                {c.full_name}
              </Link>
              <div className="mt-1 text-sm text-foreground/55">
                {c.current_title ?? "—"}
              </div>
              <div className="mt-2">
                <Pill tone="gold">{c.status.replace("_", " ")}</Pill>
              </div>
            </div>
          ))}
        </div>

        {(
          [
            ["Fit role", "fit_role"],
            ["Current org", "current_org"],
            ["City", "city"],
            ["Source", "source"],
            ["Email", "email"],
          ] as const
        ).map(([label, key]) => (
          <div
            key={key}
            className="grid border-t border-foreground/10"
            style={{
              gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
            }}
          >
            <div className="bg-[color:var(--soft)] p-4 text-xs font-bold uppercase tracking-[.14em] text-foreground/45">
              {label}
            </div>
            {candidates.map((c) => (
              <div
                key={c.id}
                className="border-l border-foreground/10 p-4 text-sm"
              >
                {(c as never as Record<string, string | null>)[key] ?? "—"}
              </div>
            ))}
          </div>
        ))}

        {sectionKeys.map((key) => (
          <div key={key} className="border-t border-foreground/10">
            <button
              onClick={() => setOpenSection(openSection === key ? null : key)}
              className="grid w-full text-left hover:bg-foreground/[0.02]"
              style={{
                gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
              }}
            >
              <div className="bg-[color:var(--soft)] p-4 text-xs font-bold uppercase tracking-[.14em] text-[color:var(--gold-deep)]">
                {sectionFor(candidates[0].id, key)?.title ?? key}
              </div>
              {candidates.map((c) => {
                const s = sectionFor(c.id, key);
                return (
                  <div
                    key={c.id}
                    className="border-l border-foreground/10 p-4 text-xs text-foreground/55"
                  >
                    {s
                      ? `${(s.body_md ?? "").length} chars · ${s.status}`
                      : "—"}
                  </div>
                );
              })}
            </button>
            {openSection === key && (
              <div
                className="grid border-t border-foreground/10"
                style={{
                  gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
                }}
              >
                <div className="bg-[color:var(--soft)]" />
                {candidates.map((c) => {
                  const s = sectionFor(c.id, key);
                  return (
                    <div
                      key={c.id}
                      className="prose prose-sm max-w-none border-l border-foreground/10 p-5 text-sm leading-6"
                    >
                      {s?.body_md ? (
                        <ReactMarkdown>{s.body_md}</ReactMarkdown>
                      ) : (
                        <span className="text-foreground/35">
                          No content yet.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </ShellCard>

      <div className="mt-6 flex justify-end">
        <Button asChild variant="outline">
          <Link to="/candidates">
            <X className="mr-2 h-4 w-4" />
            Close comparison
          </Link>
        </Button>
      </div>
    </div>
  );
}
