import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  WilsonMark,
} from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getDashboardStats,
  getRecentActivity,
  getRecentSearches,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const statsFn = useServerFn(getDashboardStats);
  const searchesFn = useServerFn(getRecentSearches);
  const activityFn = useServerFn(getRecentActivity);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
  });
  const { data: recent } = useQuery({
    queryKey: ["dashboard-recent-searches"],
    queryFn: () => searchesFn(),
  });
  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => activityFn(),
  });

  const name =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const cards = [
    {
      label: "Active searches",
      value: stats?.activeSearches ?? 0,
      icon: BriefcaseBusiness,
    },
    { label: "Candidates", value: stats?.candidates ?? 0, icon: Users },
    {
      label: "Profiles in progress",
      value: stats?.profilesInProgress ?? 0,
      icon: FileText,
    },
    {
      label: "Profiles ready",
      value: stats?.presentationsReady ?? 0,
      icon: Presentation,
    },
  ];

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
        {cards.map((s) => (
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
                <Pill>Recent activity</Pill>
                <h3 className="mt-4 font-serif text-2xl tracking-tight">
                  Active searches
                </h3>
              </div>
              <Button asChild variant="default">
                <Link to="/searches">View all searches →</Link>
              </Button>
            </div>
          </div>
          <div className="divide-y divide-foreground/10">
            {(recent ?? []).length === 0 && (
              <div className="p-8 text-center text-sm text-foreground/45">
                No searches yet.{" "}
                <Link to="/searches" className="underline">
                  Create your first search
                </Link>
                .
              </div>
            )}
            {(recent ?? []).map((s) => (
              <Link
                key={s.id}
                to="/searches/$searchId"
                params={{ searchId: s.id }}
                className="grid gap-4 p-5 transition hover:bg-foreground/[0.03] md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="text-base font-medium">{s.church}</div>
                  <div className="mt-1 text-sm text-foreground/45">
                    {s.role}
                    {s.city ? ` · ${s.city}` : ""} · {s.candidateCount}{" "}
                    candidate{s.candidateCount === 1 ? "" : "s"}
                  </div>
                </div>
                <Pill tone={s.status === "placed" ? "green" : "gold"}>
                  {s.stage}
                </Pill>
              </Link>
            ))}
          </div>
        </ShellCard>

        <DarkCard className="xl:col-span-4 p-6">
          <div className="flex items-center gap-2 text-[color:var(--gold)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">
              Wilson AI
            </span>
          </div>
          <h3 className="mt-5 font-serif text-2xl tracking-tight">
            Your research assistant
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Wilson powers candidate synthesis, profile section drafting, and
            source-grounded review.
          </p>
          <Button
            asChild
            variant="secondary"
            className="mt-5 w-full bg-[color:var(--gold)] text-[color:var(--deep)] hover:bg-[color:var(--gold)]/90"
          >
            <Link to="/wilson">Open Wilson</Link>
          </Button>
          <div className="mt-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Recent activity
            </div>
            <div className="mt-3 space-y-2">
              {(activity ?? []).slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl bg-white/[0.05] p-3 text-xs text-white/65"
                >
                  <div className="font-medium text-white/90">{a.action}</div>
                  <div className="text-white/40">
                    {a.actor_name ?? "Member"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {(activity ?? []).length === 0 && (
                <div className="text-xs text-white/35">
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        </DarkCard>
      </div>

      <div className="mt-6">
        <ShellCard className="p-6">
          <div className="flex items-start gap-5 rounded-2xl border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/8 p-5">
            <WilsonMark className="h-20 w-20 shrink-0 text-[color:var(--gold-deep)]" />
            <div>
              <div className="font-semibold">Wilson is ready</div>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                Generate a candidate's executive profile from their approved
                source package — Wilson will draft each section for review.
              </p>
              <div className="mt-4 flex gap-3">
                <Button asChild>
                  <Link to="/candidates">Open candidates</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/wilson">Ask Wilson</Link>
                </Button>
              </div>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}
