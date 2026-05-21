import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Printer } from "lucide-react";

import { ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CinematicPresentation,
  type PresentationCandidate,
} from "@/components/presentation/cinematic-presentation";
import { listProfileSections } from "@/lib/profile.functions";

export function PresentationTab({
  candidateId,
  candidate,
}: {
  candidateId: string;
  candidate: PresentationCandidate;
}) {
  const list = useServerFn(listProfileSections);
  const { data: sections, isLoading } = useQuery({
    queryKey: ["profile-sections", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
  });

  const [showCover, setShowCover] = useState(true);

  if (isLoading)
    return <div className="text-sm text-foreground/45">Loading…</div>;

  const total = sections?.length ?? 0;
  const approved = (sections ?? []).filter(
    (s) => s.status === "approved",
  ).length;
  const withBody = (sections ?? []).filter(
    (s) => (s.body_md ?? "").trim().length > 0,
  ).length;
  const allApproved = total > 0 && approved === total;
  const approvalState: "draft" | "approved" = allApproved ? "approved" : "draft";

  function handleExport() {
    // Use the browser print pipeline → "Save as PDF". Our @media print CSS
    // pins the cinematic doc to the page and includes the watermark.
    const previousTitle = document.title;
    document.title = `${candidate.full_name} — Profile by form.`;
    window.print();
    // restore title after print dialog
    setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  }

  return (
    <div className="space-y-5">
      <ShellCard className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            Cinematic presentation
          </div>
          <h3 className="mt-1 font-serif text-2xl">
            {candidate.full_name} · candidate brief
          </h3>
          <p className="mt-1 text-xs text-foreground/55">
            {approved} of {total} sections approved · {withBody} drafted and
            included.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1.5 text-xs">
            <Switch
              checked={showCover}
              onCheckedChange={setShowCover}
              aria-label="Toggle cover page"
            />
            <span className="font-mono uppercase tracking-[0.18em] text-foreground/60">
              Cover page
            </span>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </ShellCard>

      <div className="overflow-hidden rounded-3xl border border-foreground/10 shadow-2xl">
        <CinematicPresentation
          candidate={candidate}
          showCover={showCover}
          approvalState={approvalState}
          sections={(sections ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            section_key: s.section_key,
            body_md: s.body_md,
            order_index: s.order_index,
            status: s.status,
          }))}
        />
      </div>

      <p className="text-center text-xs text-foreground/45">
        Tip: in the print dialog, choose "Save as PDF" as the destination. Page
        backgrounds and the {approvalState} watermark print automatically.
      </p>
    </div>
  );
}
