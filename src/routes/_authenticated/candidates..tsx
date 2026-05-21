
function PresentationTab({ candidate }: { candidate: PresentationCandidate }) {
  const list = useServerFn(listProfileSections);
  const candidateId = (candidate as { id?: string }).id ?? "";
  const { data: sections, isLoading } = useQuery({
    queryKey: ["profile-sections", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
    enabled: !!candidateId,
  });

  if (isLoading)
    return <div className="text-sm text-foreground/45">Loading…</div>;

  const approved = (sections ?? []).filter((s) => s.status === "approved").length;
  const total = sections?.length ?? 0;

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
            {approved} of {total} sections approved. Sections with drafted prose
            are included in the brief.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </ShellCard>

      <div className="overflow-hidden rounded-3xl border border-foreground/10 shadow-2xl">
        <CinematicPresentation
          candidate={candidate}
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
        backgrounds print automatically.
      </p>
    </div>
  );
}
