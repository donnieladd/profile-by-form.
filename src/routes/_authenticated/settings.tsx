import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile } from "@/lib/settings.functions";

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
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getFn(),
  });

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dirty, setDirty] = useState(false);

  // hydrate once
  if (data?.profile && !dirty && fullName === "" && avatarUrl === "") {
    if (data.profile.full_name) setFullName(data.profile.full_name);
    if (data.profile.avatar_url) setAvatarUrl(data.profile.avatar_url);
  }

  const save = useMutation({
    mutationFn: () =>
      updateFn({ data: { full_name: fullName, avatar_url: avatarUrl || null } }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function sendPasswordReset() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace preferences."
        subtitle="Profile, account, and integrations."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ShellCard className="p-8">
          <h3 className="font-serif text-2xl">Your profile</h3>
          <p className="mt-1 text-sm text-foreground/55">
            How you appear across the workspace.
          </p>

          {isLoading ? (
            <div className="mt-6 text-sm text-foreground/40">Loading…</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-full bg-[linear-gradient(135deg,var(--gold),var(--ink))] bg-cover bg-center"
                  style={
                    avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined
                  }
                />
                <div className="text-sm text-foreground/55">
                  {data?.roles?.length
                    ? data.roles.map((r) => (
                        <span
                          key={r}
                          className="mr-1 inline-block rounded-full border border-foreground/10 bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.16em]"
                        >
                          {r}
                        </span>
                      ))
                    : null}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-[.16em] text-foreground/55">
                  Email
                </Label>
                <Input value={user?.email ?? ""} disabled />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-[.16em] text-foreground/55">
                  Full name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-[.16em] text-foreground/55">
                  Avatar URL
                </Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="https://…"
                />
              </div>

              <Button
                disabled={!dirty || save.isPending || !fullName.trim()}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </ShellCard>

        <ShellCard className="p-8">
          <h3 className="font-serif text-2xl">Account</h3>
          <p className="mt-1 text-sm text-foreground/55">
            Manage password and sign-in.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[.16em] text-foreground/55">
                Password
              </div>
              <p className="mt-1 text-sm text-foreground/70">
                Reset by email. We'll send a secure link.
              </p>
              <Button
                variant="outline"
                onClick={sendPasswordReset}
                className="mt-3"
              >
                Send password reset email
              </Button>
            </div>

            <div className="border-t border-foreground/10 pt-4">
              <div className="text-xs uppercase tracking-[.16em] text-foreground/55">
                Signed in as
              </div>
              <div className="mt-1 font-semibold">{user?.email}</div>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}
