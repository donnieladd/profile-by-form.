import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile } from "@/lib/settings.functions";
import {
  getMyNotificationPrefs,
  updateMyNotificationPrefs,
} from "@/lib/notification-prefs.functions";

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
        subtitle="Profile, account, notifications, and integrations."
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

        <NotificationPrefsCard />
      </div>
    </div>
  );
}

function NotificationPrefsCard() {
  const getFn = useServerFn(getMyNotificationPrefs);
  const updateFn = useServerFn(updateMyNotificationPrefs);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-notification-prefs"],
    queryFn: () => getFn(),
  });

  const [state, setState] = useState({
    notify_share_view: true,
    notify_candidate_status: true,
    notify_share_email_sent: true,
    email_share_view: false,
    email_candidate_status: false,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setState({
        notify_share_view: data.notify_share_view,
        notify_candidate_status: data.notify_candidate_status,
        notify_share_email_sent: data.notify_share_email_sent,
        email_share_view: data.email_share_view,
        email_candidate_status: data.email_candidate_status,
      });
      setHydrated(true);
    }
  }, [data, hydrated]);

  const save = useMutation({
    mutationFn: (patch: Partial<typeof state>) =>
      updateFn({ data: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notification-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setPref<K extends keyof typeof state>(key: K, value: boolean) {
    setState((s) => ({ ...s, [key]: value }));
    save.mutate({ [key]: value } as Partial<typeof state>);
  }

  return (
    <ShellCard className="p-8 lg:col-span-2">
      <h3 className="font-serif text-2xl">Notifications</h3>
      <p className="mt-1 text-sm text-foreground/55">
        Choose what reaches you in-app and by email.
      </p>
      {isLoading ? (
        <div className="mt-6 text-sm text-foreground/40">Loading…</div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-foreground/55">
              In-app (bell)
            </div>
            <PrefRow
              label="Share link opened"
              hint="When a client views a presentation you shared."
              checked={state.notify_share_view}
              onChange={(v) => setPref("notify_share_view", v)}
            />
            <PrefRow
              label="Candidate status changes"
              hint="When a candidate moves through the pipeline."
              checked={state.notify_candidate_status}
              onChange={(v) => setPref("notify_candidate_status", v)}
            />
            <PrefRow
              label="Share email sent"
              hint="Confirmation when an email leaves your account."
              checked={state.notify_share_email_sent}
              onChange={(v) => setPref("notify_share_email_sent", v)}
            />
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-foreground/55">
              Email
            </div>
            <PrefRow
              label="Email me on share link views"
              hint="Coming soon — email digests of share-link activity."
              checked={state.email_share_view}
              onChange={(v) => setPref("email_share_view", v)}
              disabled
            />
            <PrefRow
              label="Email me on candidate status changes"
              hint="Coming soon — daily email summary of status changes."
              checked={state.email_candidate_status}
              onChange={(v) => setPref("email_candidate_status", v)}
              disabled
            />
            <p className="mt-3 text-[11px] text-foreground/40">
              Outbound transactional email uses Resend (for share links).
              Per-event email notifications ship in a later release.
            </p>
          </div>
        </div>
      )}
    </ShellCard>
  );
}

function PrefRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-foreground/5 py-3 last:border-b-0">
      <div className="min-w-0">
        <div
          className={`text-sm font-medium ${disabled ? "text-foreground/40" : ""}`}
        >
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 text-xs text-foreground/45">{hint}</div>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
