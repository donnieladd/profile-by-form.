import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/candidates")({
  head: () => ({
    meta: [
      { title: "Candidates — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CandidatesPage,
});

const candidates = [
  { name: "Shemyah Wilson", city: "Nashville, TN", source: "Referral", fit: "Worship Pastor", profile: "Ready", presentation: "Presented", owner: "Melissa Grant" },
  { name: "Jonathan Montgomery", city: "Atlanta, GA", source: "Website", fit: "Executive Pastor", profile: "In Progress", presentation: "In Review", owner: "Aaron Davis" },
  { name: "Tori Reed", city: "Charlotte, NC", source: "Referral", fit: "Worship Pastor", profile: "Ready", presentation: "Ready", owner: "Jessica Lee" },
  { name: "Henry Curry", city: "Birmingham, AL", source: "Network", fit: "Next Gen Pastor", profile: "Draft", presentation: "Not Started", owner: "Michael Turner" },
  { name: "Emily McLaurin", city: "Richmond, VA", source: "Website", fit: "Discipleship Pastor", profile: "In Progress", presentation: "In Review", owner: "Amanda Roberts" },
];

function CandidatesPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Candidates Directory"
        subtitle="Discover, evaluate, and manage candidates for your leadership needs."
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Candidate
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Search candidates by name, keyword, or church"
            className="h-12 pl-10"
          />
        </div>
      </div>
      <ShellCard className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_.9fr_1fr_.9fr_.9fr_.9fr] bg-[color:var(--soft)] px-5 py-4 text-xs font-bold uppercase tracking-[.14em] text-foreground/42">
          <div>Candidate</div>
          <div>Source</div>
          <div>Fit Target</div>
          <div>Profile</div>
          <div>Presentation</div>
          <div>Owner</div>
        </div>
        {candidates.map((c) => (
          <div
            key={c.name}
            className="grid grid-cols-[1.4fr_.9fr_1fr_.9fr_.9fr_.9fr] items-center border-t border-foreground/10 px-5 py-4 text-sm hover:bg-[color:var(--soft)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[color:var(--gold)]/20" />
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-foreground/42">{c.city}</div>
              </div>
            </div>
            <div>{c.source}</div>
            <div>{c.fit}</div>
            <div>
              <Pill
                tone={
                  c.profile === "Ready"
                    ? "green"
                    : c.profile === "Draft"
                      ? "soft"
                      : "gold"
                }
              >
                {c.profile}
              </Pill>
            </div>
            <div>
              <Pill
                tone={
                  c.presentation === "Ready"
                    ? "green"
                    : c.presentation === "Presented"
                      ? "blue"
                      : c.presentation === "Not Started"
                        ? "soft"
                        : "purple"
                }
              >
                {c.presentation}
              </Pill>
            </div>
            <div>{c.owner}</div>
          </div>
        ))}
      </ShellCard>
    </div>
  );
}
