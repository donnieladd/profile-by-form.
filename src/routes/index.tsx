import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { One39Logo, WilsonMark } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Profile by form. — Relational intelligence for church staffing" },
      {
        name: "description",
        content:
          "ONE39 helps growing churches find and hire top-tier ministry leaders through a relational, fully managed process powered by Wilson.",
      },
      {
        property: "og:title",
        content: "Profile by form. — Relational intelligence for church staffing",
      },
      {
        property: "og:description",
        content:
          "An intelligence workspace for building deeper candidate profiles and executive-ready presentations.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--deep)] text-white">
      <section className="relative overflow-hidden px-6 py-8 lg:px-12">
        <div className="absolute inset-0 opacity-65 pointer-events-none">
          <div className="absolute right-0 top-0 h-full w-[54%] bg-[radial-gradient(circle_at_55%_45%,rgba(236,177,90,.42),transparent_12%),linear-gradient(110deg,rgba(7,6,5,1)_0%,rgba(7,6,5,.82)_36%,rgba(0,0,0,.16)_65%),url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(200,161,90,.16),transparent_32%),radial-gradient(circle_at_74%_12%,rgba(255,255,255,.08),transparent_26%)]" />
        </div>

        <header className="relative z-10 flex items-center justify-between">
          <div>
            <One39Logo script />
            <div className="mt-3 text-sm text-[color:var(--gold)]">
              profile by form.{" "}
              <span className="ml-2 text-white/45">beta</span>
            </div>
          </div>
          <nav className="hidden items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 lg:flex">
            {[
              "How It Works",
              "Solutions",
              "Candidate Profiles",
              "Presentation Builder",
              "Resources",
            ].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden text-sm text-white/70 md:block">
              Login
            </Link>
            <Button asChild className="rounded-lg uppercase tracking-[0.18em]">
              <Link to="/login">Request Access</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 grid min-h-[720px] items-center lg:grid-cols-[.92fr_1.08fr]">
          <div className="max-w-3xl pt-20">
            <h1 className="font-serif text-6xl leading-[.9] tracking-[-.055em] md:text-8xl">
              <span className="text-[color:var(--gold)]">Relational</span>
              <br />
              intelligence for
              <br />
              church staffing.
            </h1>
            <div className="mt-8 h-px w-24 bg-[color:var(--gold)]" />
            <p className="mt-8 max-w-xl text-xl leading-8 text-white/72">
              One39 helps growing churches find and hire top-tier ministry
              leaders through a relational, fully managed process powered by{" "}
              <span className="text-[color:var(--gold)]">Wilson</span>.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Button
                asChild
                size="lg"
                className="px-8 uppercase tracking-[0.2em]"
              >
                <Link to="/login">
                  Request Access <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <button className="flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--gold)]">
                  <ArrowRight className="h-4 w-4" />
                </span>{" "}
                Watch Overview
              </button>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <WilsonMark className="h-16 w-16 text-[color:var(--gold)]" />
              <div className="h-14 w-px bg-[color:var(--gold)]/30" />
              <div>
                <div className="font-semibold text-[color:var(--gold)]">
                  Powered by Wilson
                </div>
                <div className="mt-1 text-sm leading-5 text-white/52">
                  Ministry-trained AI. Human wisdom.
                  <br />
                  Better outcomes.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 grid gap-4 border border-[color:var(--gold)]/22 bg-black/20 p-5 backdrop-blur-md md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Top 10%", "Ministry Talent"],
            ["48 Hour", "Fast Track"],
            ["On-Site", "Culture Visits"],
            ["12-Month", "Guarantee"],
            ["Leadership Gap", "Blueprint"],
            ["Done-for-You", "Process"],
          ].map(([a, b]) => (
            <div
              key={a}
              className="flex items-center gap-4 border-[color:var(--gold)]/18 py-3 md:border-r last:border-r-0"
            >
              <Star className="h-7 w-7 text-[color:var(--gold)]" />
              <div>
                <div className="font-semibold">{a}</div>
                <div className="text-sm text-white/45">{b}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[color:var(--paper)] px-6 py-20 text-foreground lg:px-16">
        <div className="mx-auto max-w-6xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.32em] text-[color:var(--gold-deep)]">
            Built for executive search
          </div>
          <h2 className="mt-5 font-serif text-4xl tracking-[-.03em] md:text-5xl">
            Everything you need to find and place great leaders.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-foreground/55">
            Profile by form brings every piece of the staffing process into one
            intelligent workspace — powered by Wilson, refined by the One39
            process.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-5">
          {[
            [
              "Candidate Profile Builder",
              "Capture the full picture with guided intake and relational signals.",
            ],
            [
              "Presentation Builder",
              "Craft executive-ready presentations that tell the right story.",
            ],
            [
              "Monday.com Sync",
              "Keep your data clean, connected, and current.",
            ],
            [
              "Wilson AI",
              "Surface insights, refine sections, and save your team hours.",
            ],
            [
              "Executive Workflows",
              "Move searches from discovery to presentation with clarity.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--gold)]/15 text-[color:var(--gold-deep)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/55">
                {body}
              </p>
              <div className="mt-6 text-xs font-bold uppercase tracking-[0.18em]">
                Learn More →
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center text-xs text-foreground/45">
          © {new Date().getFullYear()} ONE39 · profile by form. · beta
        </div>
      </section>
    </div>
  );
}
