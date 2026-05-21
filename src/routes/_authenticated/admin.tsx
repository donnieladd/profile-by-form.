import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteTeamMember,
  listTeamMembers,
  updateUserRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const ROLES = [
  "owner",
  "admin",
  "search_manager",
  "consultant",
  "recruiting_partner",
] as const;

function AdminPage() {
  const listFn = useServerFn(listTeamMembers);
  const updateFn = useServerFn(updateUserRole);
  const inviteFn = useServerFn(inviteTeamMember);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn(),
    retry: false,
  });

  const updateMut = useMutation({
    mutationFn: (v: { user_id: string; role: (typeof ROLES)[number] }) =>
      updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const inviteMut = useMutation({
    mutationFn: (v: { email: string; role: (typeof ROLES)[number] }) =>
      inviteFn({ data: v }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<(typeof ROLES)[number]>("consultant");

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <PageHeader
          eyebrow="Admin"
          title="Admin access required."
          subtitle="You need owner or admin privileges to manage the team."
        />
        <ShellCard className="p-8 text-foreground/55">
          {(error as Error).message}
        </ShellCard>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Admin"
        title="Users, roles, and audit."
        subtitle="Manage your ONE39 team — owners, admins, search managers, consultants, and recruiting partners."
      />

      <ShellCard className="mb-5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Invite by email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@church.org"
              type="email"
              className="mt-1"
            />
          </div>
          <div className="w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Role
            </label>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as (typeof ROLES)[number])}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => inviteMut.mutate({ email, role: inviteRole })}
            disabled={!email || inviteMut.isPending}
          >
            {inviteMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4" />
            )}
            Send invitation
          </Button>
        </div>
      </ShellCard>

      <ShellCard className="overflow-hidden">
        <div className="border-b border-foreground/10 bg-[color:var(--soft)] p-5">
          <h3 className="font-serif text-xl">Team members</h3>
          <p className="mt-1 text-xs text-foreground/50">
            {data?.length ?? 0} member{data?.length === 1 ? "" : "s"}
          </p>
        </div>
        {isLoading ? (
          <div className="p-8 text-sm text-foreground/45">Loading…</div>
        ) : (
          <div className="divide-y divide-foreground/10">
            {(data ?? []).map((m) => {
              const primary = (m.roles[0] ?? "consultant") as (typeof ROLES)[number];
              return (
                <div
                  key={m.id}
                  className="grid items-center gap-4 p-5 md:grid-cols-[1fr_auto_220px]"
                >
                  <div className="flex items-center gap-3">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,var(--gold),var(--ink))] text-sm font-semibold text-white">
                        {(m.full_name ?? m.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {m.full_name ?? m.email ?? "Member"}
                      </div>
                      <div className="text-xs text-foreground/45">
                        {m.email}
                      </div>
                    </div>
                  </div>
                  <Pill
                    tone={
                      primary === "owner" || primary === "admin"
                        ? "gold"
                        : "blue"
                    }
                  >
                    {primary.replace("_", " ")}
                  </Pill>
                  <Select
                    value={primary}
                    onValueChange={(v) =>
                      updateMut.mutate({
                        user_id: m.id,
                        role: v as (typeof ROLES)[number],
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </ShellCard>
    </div>
  );
}
