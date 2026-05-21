import { createFileRoute } from "@tanstack/react-router";
import { Edit3, Eye, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";

import { DarkCard, PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile-builder")({
  head: () => ({
    meta: [
      { title: "Profile Builder — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfileBuilderPage,
});

const sections = [
  "Personal background & faith journey",
  "Ministry & leadership journey",
  "Family & spouse profile",
  "Strengths & leadership qualities",
  "Growth areas & considerations",
  "Final assessment & readiness summary",
];

function ProfileBuilderPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Profile builder"
        title="Build the candidate narrative."
        subtitle="Wilson edits only from approved source materials — never invents facts."
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <ShellCard className="xl:col-span-3 p-5">
          <Pill>Sections</Pill>
          <div className="mt-5 space-y-2">
            {sections.map((s, i) => (
              <div
                key={s}
                className={`rounded-2xl border p-3 ${
                  i === 0
                    ? "border-[color:var(--gold)]/50 bg-[color:var(--gold)]/8"
                    : "border-foreground/10 bg-card"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/30">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-sm font-medium">{s}</div>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard className="xl:col-span-6 overflow-hidden">
          <div className="border-b border-foreground/10 bg-[color:var(--soft)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold-deep)]">
                  Visual document editor
                </div>
                <h3 className="mt-2 font-serif text-xl">Narrative profile draft</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-3 w-3" />
                  Preview
                </Button>
                <Button size="sm">Approve</Button>
              </div>
            </div>
          </div>
          <div className="p-7">
            <div className="rounded-[28px] border border-foreground/10 bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--gold-deep)]">
                Editable section
              </div>
              <h4 className="mt-4 font-serif text-3xl">
                Personal Background & Faith Journey
              </h4>
              <p className="mt-5 text-[15px] leading-8 text-foreground/65">
                Shemyah Wilson is introduced first as a person: a worship
                leader, mother, and ministry-rooted creative shaped by a family
                environment where music, faith, and service were present from
                her earliest years. Her story is one of formation through
                family, worship, motherhood, resilience, and consecration.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Edit3 className="mr-2 h-3 w-3" />
                  Edit text
                </Button>
                <Button variant="outline" size="sm">
                  <ImageIcon className="mr-2 h-3 w-3" />
                  Add photo
                </Button>
                <Button variant="outline" size="sm">
                  <Wand2 className="mr-2 h-3 w-3" />
                  Ask Wilson
                </Button>
              </div>
            </div>
          </div>
        </ShellCard>

        <DarkCard className="xl:col-span-3 p-5">
          <div className="flex items-center gap-2 text-[color:var(--gold)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Wilson</span>
          </div>
          <h3 className="mt-4 font-serif text-xl">Edit by conversation</h3>
          <div className="mt-4 rounded-2xl bg-white/[0.06] p-4 text-sm leading-6 text-white/60">
            "Make the faith journey warmer, but do not add anything not found in
            the MAF or life story."
          </div>
          <div className="mt-4 rounded-2xl bg-[color:var(--gold)]/15 p-4 text-sm leading-6 text-[color:var(--gold)]">
            Wilson can revise this section using only approved source material.
          </div>
          <div className="mt-5 rounded-full bg-white px-4 py-3 text-sm text-foreground/40">
            Ask Wilson…
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
