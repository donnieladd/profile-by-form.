import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Cloud, MoreHorizontal, Upload } from "lucide-react";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";

export const Route = createFileRoute("/_authenticated/source")({
  head: () => ({
    meta: [
      { title: "Source Package — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SourcePage,
});

const items = [
  "Candidate resume",
  "Ministry assessment form",
  "Life story form",
  "Candidate references",
  "Spouse materials",
  "Interview notes",
  "Search manager notes",
  "Candidate photos",
];

function SourcePage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Source intake"
        title="Build the source package."
        subtitle="Upload directly, pull from ONE39's Monday.com boards, or combine both into one reviewed package."
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <ShellCard className="xl:col-span-7 overflow-hidden">
          <div className="bg-[color:var(--soft)] p-6">
            <Pill>Source intake</Pill>
            <h2 className="mt-4 font-serif text-3xl tracking-tight">
              Choose where the candidate materials come from
            </h2>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-dashed border-[color:var(--gold)]/45 bg-[color:var(--gold)]/8 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-[color:var(--gold-deep)]" />
              <div className="mt-4 text-lg font-medium">Upload files</div>
              <div className="mt-1 text-sm text-foreground/45">
                PDF, DOCX, images, notes, resumes
              </div>
            </div>
            <div className="rounded-[28px] border border-foreground/10 bg-[color:var(--deep)] p-8 text-center text-white">
              <Cloud className="mx-auto h-10 w-10 text-[color:var(--gold)]" />
              <div className="mt-4 text-lg font-medium">Pull from Monday</div>
              <div className="mt-1 text-sm text-white/45">
                Jobs, candidates, files, updates
              </div>
            </div>
          </div>
        </ShellCard>
        <ShellCard className="xl:col-span-5 p-6">
          <h3 className="font-serif text-xl">Source package builder</h3>
          <div className="mt-5 space-y-3">
            {items.map((item, i) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-[color:var(--soft)] p-3"
              >
                <span className="text-sm text-foreground/70">{item}</span>
                {i < 4 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <MoreHorizontal className="h-4 w-4 text-foreground/25" />
                )}
              </div>
            ))}
          </div>
        </ShellCard>
      </div>
    </div>
  );
}
