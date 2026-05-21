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

export function CinematicPresentation({
  candidate,
  sections,
}: {
  candidate: PresentationCandidate;
  sections: PresentationSection[];
}) {
  const withBody = sections.filter((s) => (s.body_md ?? "").trim().length > 0);

  return (
    <article className="cinematic-doc bg-[color:var(--paper,_#FAF7EE)] text-foreground">
      {/* Cover */}
      <section className="cinematic-cover relative isolate flex min-h-[820px] flex-col justify-between overflow-hidden px-12 py-14 lg:px-20 lg:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1100px 600px at 85% -10%, color-mix(in oklab, var(--gold) 28%, transparent), transparent 60%), radial-gradient(800px 500px at -10% 110%, color-mix(in oklab, var(--gold-deep) 22%, transparent), transparent 65%), var(--soft)",
          }}
        />
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[color:var(--gold)]/80" />
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/55">
              ONE39 · Profile by form.
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/45">
            Confidential candidate brief
          </div>
        </header>

        <div className="max-w-4xl">
          <div className="mb-6 text-xs font-bold uppercase tracking-[0.32em] text-[color:var(--gold-deep)]">
            {candidate.city ?? "Location withheld"}
          </div>
          <h1 className="font-serif text-[clamp(3.5rem,9vw,7rem)] leading-[0.92] tracking-[-0.05em]">
            {candidate.full_name}
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-2xl leading-snug text-foreground/75">
            {candidate.current_title ?? "—"}
            {candidate.current_org ? ` · ${candidate.current_org}` : ""}
          </p>
          {candidate.fit_role && (
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-foreground/55">
              Considered for · {candidate.fit_role}
            </p>
          )}
        </div>

        <footer className="flex items-end justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/40">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/40">
            Prepared for principal review
          </div>
        </footer>
      </section>

      {/* Table of contents */}
      {withBody.length > 0 && (
        <section className="cinematic-page border-t border-foreground/10 px-12 py-16 lg:px-20">
          <div className="mb-10 text-[10px] font-bold uppercase tracking-[0.32em] text-[color:var(--gold-deep)]">
            Contents
          </div>
          <ol className="divide-y divide-foreground/10">
            {withBody.map((s, i) => (
              <li
                key={s.id}
                className="flex items-baseline justify-between gap-6 py-4"
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-[10px] tracking-[0.18em] text-foreground/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-2xl">{s.title}</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/35">
                  {s.status === "approved" ? "Final" : "Draft"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Sections */}
      {withBody.map((s, i) => (
        <section
          key={s.id}
          className="cinematic-page border-t border-foreground/10 px-12 py-20 lg:px-20"
        >
          <div className="grid grid-cols-12 gap-10">
            <aside className="col-span-12 lg:col-span-3">
              <div className="font-mono text-[10px] tracking-[0.22em] text-foreground/35">
                {String(i + 1).padStart(2, "0")} / {withBody.length}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
                {s.section_key.replace(/_/g, " ")}
              </div>
            </aside>
            <div className="col-span-12 lg:col-span-9">
              <h2 className="font-serif text-5xl tracking-[-0.04em]">
                {s.title}
              </h2>
              <div className="prose-editorial mt-8 max-w-[62ch]">
                <ReactMarkdown>{s.body_md ?? ""}</ReactMarkdown>
              </div>
            </div>
          </div>
        </section>
      ))}

      {withBody.length === 0 && (
        <section className="cinematic-page border-t border-foreground/10 px-12 py-24 text-center lg:px-20">
          <p className="font-serif text-2xl text-foreground/55">
            No approved sections yet. Draft and approve profile sections to
            assemble this presentation.
          </p>
        </section>
      )}

      {/* Colophon */}
      <section className="cinematic-page border-t border-foreground/10 px-12 py-16 lg:px-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-[color:var(--gold-deep)]">
              Colophon
            </div>
            <p className="mt-3 max-w-xl font-serif text-lg leading-snug text-foreground/70">
              Prepared by ONE39's executive search team. Editorial drafting
              supported by Wilson, an in-house AI grounded in the candidate's
              source package. All material is confidential.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">
            Profile by form. · one39
          </div>
        </div>
      </section>
    </article>
  );
}
