import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, ShellCard } from "@/components/brand/brand";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace preferences."
        subtitle="Profile, integrations, and Wilson behavior."
      />
      <ShellCard className="p-8">
        <div className="text-sm text-foreground/55">Signed in as</div>
        <div className="mt-2 text-xl font-semibold">{user?.email}</div>
      </ShellCard>
    </div>
  );
}
