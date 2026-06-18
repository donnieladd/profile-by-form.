import ReactMarkdown from "react-markdown";

export type PresentationCandidate = {
  full_name: string;
  city?: string | null;
  current_title?: string | null;
  current_org?: string | null;
  fit_role?: string | null;
  avatar_url?: string | null;
};

export type PresentationSection = {
  id: string;
  title: string;
  section_key: string;
  body_md: string | null;
  order_index: number;
  status: string;
};

export function ProfileAltPresentation({
  candidate,
  sections,
}: {
  candidate: PresentationCandidate;
  sections: PresentationSection[];
}) {
  const withBody = sections.filter((s) => (s.body_md ?? "").trim().length > 0);

  return (
    <article className="relative isolate min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,248,242,0.98))] px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-foreground/12 bg-white/75 p-8 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.35)] sm:p-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            ONE39 · Profile by form.
          </div>
          <h1 className="mt-4 font-serif text-[clamp(2.3rem,8vw,4.6rem)] leading-[0.97] tracking-[-0.04em]">
            {candidate.full_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/65">
            {candidate.current_title ?? "Candidate profile"}
            {candidate.current_org ? ` · ${candidate.current_org}` : ""}
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-foreground/12 bg-white p-6 sm:p-8">
          <div className="mb-6 text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            Profile blocks
          </div>

          {withBody.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No profile body has been approved yet.
            </p>
          ) : (
            <div className="space-y-8">
              {withBody.map((s) => (
                <section key={s.id} className="grid gap-4 border-b border-foreground/10 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-3xl leading-tight">{s.title}</h2>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-foreground/45">
                      {s.section_key.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="prose-editorial max-w-[78ch] text-[15px] leading-[1.9]">
                    <ReactMarkdown>{s.body_md ?? ""}</ReactMarkdown>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-foreground/12 pt-6 text-center text-xs uppercase tracking-[0.16em] text-foreground/45">
          Candidate profile · profile v2
        </footer>
      </div>
    </article>
  );
}
