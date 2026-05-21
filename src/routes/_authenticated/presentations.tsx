import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";

import { DarkCard, PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/presentations")({
  head: () => ({
    meta: [
      { title: "Presentations — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PresentationsPage,
});

const sections = [
  "Access gate",
  "Hero",
  "Story",
  "Leadership profile",
  "Experience cards",
  "Ministry credits",
  "Insights",
  "Family",
  "References",
  "Education",
  "Compensation",
  "Footer",
];

function PresentationsPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Presentation builder"
        title="Cinematic candidate presentations."
        subtitle="Section-based editor with a live HTML preview, ready to share with an access code."
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <ShellCard className="xl:col-span-3 p-5">
          <Pill>Template sections</Pill>
          <div className="mt-5 space-y-2">
            {sections.map((s) => (
              <div
                key={s}
                className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card p-3"
              >
                <Layers className="h-4 w-4 text-[color:var(--gold-deep)]" />
                <span className="text-sm text-foreground/65">{s}</span>
              </div>
            ))}
          </div>
        </ShellCard>

        <DarkCard className="xl:col-span-9 overflow-hidden bg-[color:var(--deep)]">
          <div className="flex items-center justify-between border-b border-[color:var(--gold)]/15 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--gold)]">
              Live HTML preview
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-[color:var(--gold)]/30 text-[color:var(--gold)]">
                Preview
              </Button>
              <Button size="sm">Export</Button>
            </div>
          </div>
          <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-10">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
                ONE39 Presents
              </div>
              <div className="mt-8 font-serif text-5xl leading-none md:text-6xl">
                SHEMYAH
              </div>
              <div className="mt-2 font-serif text-3xl leading-none text-[color:var(--gold)] md:text-4xl">
                WILSON
              </div>
              <div className="mt-8 font-serif text-2xl text-white/80">
                Worship Pastor Candidate
              </div>
              <div className="mt-6 text-xs uppercase tracking-[0.32em] text-white/45">
                Mission Hills Church · San Diego, CA
              </div>
            </div>
            <div className="relative overflow-hidden bg-[url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1400&auto=format&fit=crop')] bg-cover bg-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
