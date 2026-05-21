import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, ShellCard } from "@/components/brand/brand";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Admin"
        title="Users, roles, and audit."
        subtitle="Manage your ONE39 team — owners, admins, search managers, consultants, and recruiting partners."
      />
      <ShellCard className="p-8 text-foreground/55">
        Role management UI — coming in the next iteration. Default new users are
        assigned the <strong>consultant</strong> role; owners and admins can
        elevate from here.
      </ShellCard>
    </div>
  );
}
