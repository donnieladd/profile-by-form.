import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  FileText,
  Presentation,
  Sparkles,
  Users,
} from "lucide-react";

import {
  DarkCard,
  Pill,
  ShellCard,
  Stat,
  WilsonMark,
} from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

const stats = [
  { label: "Active searches", value: "8", hint: "2 new updates", icon: BriefcaseBusiness },
  { label: "Candidates", value: "47", hint: "5 new this week", icon: Users },
  { label: "Profiles in progress", value: "15", hint: "3 pending review", icon: FileText },
  { label: "Presentations ready", value: "6", hint: "2 ready to present", icon: Presentation },
];

const recentSearches = [
  { church: "Faith Chapel", role: "Worship Pastor", city: "Orange County, CA", status: "Active", ready: 5 },
  { church: "Mission Hills Church", role: "Creative Director", city: "San Diego, CA", status: "Shortlisting", ready: 6 },
  { church: "Grace Community", role: "Production Director", city: "Austin, TX", status: "Evaluating", ready: 3 },
  { church: "Elevation Church", role: "Worship Pastor", city: "Charlotte, NC", status: "Active", ready: 7 },
];

function DashboardPage() {
  const { user } = useAuth();
  const name =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-foreground/45">Good to see you,</p>
        <h1 className="mt-1 font-serif text-6xl tracking-[-.06em]">
          {name}
          <span className="text-[color:var(--gold)]">.</span>
        </h1>
        <p className="mt-3 text-foreground/45">
          Here's what's happening across your workspace.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <ShellCard key={s.label} className="p-6">
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[color:var(--gold)]/12 text-[color:var(--gold-deep)]">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-4xl font-semibold tracking-[-.04em]">
                  {s.value}
                </div>
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="mt-1 text-xs text-foreground/40">{s.hint}</div>
              </div>
            </div>
          </ShellCard>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-12">
        <ShellCard className="xl:col-span-8 overflow-hidden">
          <div className="border-b border-foreground/10 bg-[color:var(--soft)] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Pill>ONE39 beta workspace</Pill>
                <h3 className="mt-4 font-serif text-2xl tracking-tight">
                  Active searches
                </h3>
                <p className="mt-1 text-sm text-foreground/45">
                  Pull from Monday.com or create a manual search.
                </p>
              </div>
              <Button asChild variant="default">
                <Link to="/searches">View all searches →</Link>
              </Button>
            </div>
          </div>
          <div className="divide-y divide-foreground/10">
            {recentSearches.map((s) => (
              <div
                key={s.church}
                className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="text-base font-medium">{s.church}</div>
                  <div className="mt-1 text-sm text-foreground/45">
                    {s.role} · {s.city} · {s.ready} ready to present
                  </div>
                </div>
                <Pill
                  tone={
                    s.status === "Active"
                      ? "green"
                      : s.status === "Shortlisting"
                        ? "blue"
                        : "gold"
                  }
                >
                  {s.status}
                </Pill>
              </div>
            ))}
          </div>
        </ShellCard>

        <DarkCard className="xl:col-span-4 p-6">
          <div className="flex items-center gap-2 text-[color:var(--gold)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">
              Wilson status
            </span>
          </div>
          <h3 className="mt-5 font-serif text-2xl tracking-tight">
            AI assistant for ONE39
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Wilson powers candidate synthesis, profile edits, source checks, and
            presentation section generation.
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-white/[0.06] p-4">
              <div className="text-sm">Profile generation ready</div>
              <div className="mt-1 text-xs text-white/40">
                Source-only rule active
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] p-4">
              <div className="text-sm">Presentation editor ready</div>
              <div className="mt-1 text-xs text-white/40">
                One39 v1 template baseline
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="mt-5 w-full bg-[color:var(--gold)] text-[color:var(--deep)] hover:bg-[color:var(--gold)]/90"
          >
            <Link to="/wilson">Open Wilson</Link>
          </Button>
        </DarkCard>
      </div>

      <div className="mt-6">
        <ShellCard className="p-6">
          <div className="flex items-start gap-5 rounded-2xl border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/8 p-5">
            <WilsonMark className="h-20 w-20 shrink-0 text-[color:var(--gold-deep)]" />
            <div>
              <div className="font-semibold">Wilson AI</div>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                I've reviewed 12 new profiles that match your active searches.
                Want me to prioritize the top matches?
              </p>
              <div className="mt-4 flex gap-3">
                <Button>Review matches</Button>
                <Button variant="outline">Ask Wilson</Button>
              </div>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

// Used as a sub-stat label
void Stat;
