import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Download,
  Eye,
  Link as LinkIcon,
  Mail,
  Printer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CinematicPresentation,
  type PresentationCandidate,
} from "@/components/presentation/cinematic-presentation";
import { MediaReviewPresentation } from "@/components/presentation/media-review-presentation";
import { ProfileAltPresentation } from "@/components/presentation/profile-alt-presentation";
import { listProfileSections } from "@/lib/profile.functions";
import {
  createOrRefreshShareLink,
  getPresentationTemplateByCandidate,
} from "@/lib/presentations.functions";
import {
  PresentationTemplate,
  templateOptions,
} from "@/lib/presentation-templates";
import { getPresentationStats } from "@/lib/presentation-analytics.functions";
import { listShareEmails, sendShareLinkEmail } from "@/lib/email.functions";
import { listSourceItems } from "@/lib/source.functions";
import { buildCandidateDeliveryUrl } from "@/lib/delivery-routing";

export function PresentationTab({
  candidateId,
  candidate,
}: {
  candidateId: string;
  candidate: PresentationCandidate;
}) {
  const list = useServerFn(listProfileSections);
  const shareFn = useServerFn(createOrRefreshShareLink);
  const templateFn = useServerFn(getPresentationTemplateByCandidate);
  const sourceItemsFn = useServerFn(listSourceItems);
  const statsFn = useServerFn(getPresentationStats);
  const qc = useQueryClient();
  const { data: sections, isLoading } = useQuery({
    queryKey: ["profile-sections", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
  });
  const { data: viewStats } = useQuery({
    queryKey: ["presentation-stats", candidateId],
    queryFn: () => statsFn({ data: { candidate_id: candidateId } }),
    refetchInterval: 30_000,
  });
  const { data: sourceItems } = useQuery({
    queryKey: ["source-items", candidateId],
    queryFn: () => sourceItemsFn({ data: { candidate_id: candidateId } }),
  });
  const { data: persistedTemplate } = useQuery({
    queryKey: ["presentation-template", candidateId],
    queryFn: () =>
      templateFn({ data: { candidate_id: candidateId } }).then((res) => {
        if (!res || !("template_version" in res)) return undefined;
        return res.template_version;
      }),
    staleTime: 5 * 60_000,
  });

  const [showCover, setShowCover] = useState(true);
  const [templateVersion, setTemplateVersion] = useState<PresentationTemplate>(
    "profile",
  );

  const activeTemplate = templateOptions.find((option) => option.id === templateVersion);

  useEffect(() => {
    if (!persistedTemplate) return;
    setTemplateVersion(persistedTemplate);
  }, [persistedTemplate]);

  useEffect(() => {
    if (activeTemplate && !activeTemplate.supportsCover) {
      setShowCover(false);
    }
  }, [activeTemplate]);
  const mediaVideos = (sourceItems ?? [])
    .filter((i: { kind: string; monday_link?: string | null; label?: string | null; file_name?: string | null }) =>
      i.kind === "video_links" && !!(i.monday_link ?? "").trim(),
    )
    .map((i) => ({
      title: i.label ?? i.file_name ?? "Video",
      url: i.monday_link ?? "",
    }));

  const shareMut = useMutation({
    mutationFn: (v: { regenerate?: boolean }) =>
      shareFn({
        data: {
          candidate_id: candidateId,
          regenerate: v.regenerate,
          template_version: templateVersion,
        },
      }),
    onSuccess: (res) => {
      setTemplateVersion(res.template_version ?? templateVersion);
      const url = buildCandidateDeliveryUrl({
        template: res.template_version ?? templateVersion,
        shareSlug: res.share_slug,
      });
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied to clipboard");
      qc.invalidateQueries({ queryKey: ["presentation-candidates"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading)
    return <div className="text-sm text-foreground/45">Loading…</div>;

  const total = sections?.length ?? 0;
  const approved = (sections ?? []).filter(
    (s) => s.status === "approved",
  ).length;
  const withBody = (sections ?? []).filter(
    (s) => (s.body_md ?? "").trim().length > 0,
  ).length;
  const allApproved = total > 0 && approved === total;
  const approvalState: "draft" | "approved" = allApproved ? "approved" : "draft";

  function handleExport() {
    const previousTitle = document.title;
    document.title = `${candidate.full_name} — Profile by form.`;
    window.print();
    setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  }

  return (
    <div className="space-y-5">
      <ShellCard className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            Profile template
          </div>
          <h3 className="mt-1 font-serif text-2xl">
            {candidate.full_name} · candidate brief
          </h3>
          <p className="mt-1 text-xs text-foreground/55">
            {approved} of {total} sections approved · {withBody} drafted and
            included.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1.5 text-xs">
            <span className="font-mono uppercase tracking-[0.18em] text-foreground/60">
              Template
            </span>
            <Select
              value={templateVersion}
              onValueChange={(value) => setTemplateVersion(value as PresentationTemplate)}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Profile type" />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTemplate?.supportsCover ? (
              <>
                <Switch
                  checked={showCover}
                  onCheckedChange={setShowCover}
                  aria-label="Toggle cover page"
                />
                <span className="font-mono uppercase tracking-[0.18em] text-foreground/60">
                  Cover page
                </span>
              </>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareMut.mutate({ regenerate: false })}
            disabled={shareMut.isPending}
          >
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
            {shareMut.data?.share_slug ? (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy share link
              </>
            ) : (
              "Create share link"
            )}
          </Button>
          {shareMut.data?.share_slug && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareMut.mutate({ regenerate: true })}
              title="Regenerate share link"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <EmailShareDialog candidateId={candidateId} candidate={candidate} />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </ShellCard>

      {templateVersion === "media_review" ? (
        <div className="overflow-hidden rounded-3xl border border-foreground/10 shadow-2xl">
          <MediaReviewPresentation
            candidateName={candidate.full_name}
            title={candidate.full_name}
            subtitle={candidate.fit_role}
            city={candidate.city ?? null}
            avatarUrl={candidate.avatar_url ?? null}
            videos={mediaVideos}
          />
        </div>
      ) : templateVersion === "profile_alt" ? (
        <div className="overflow-hidden rounded-3xl border border-foreground/10 shadow-2xl">
          <ProfileAltPresentation
            candidate={candidate}
            sections={(sections ?? []).map((s) => ({
              id: s.id,
              title: s.title,
              section_key: s.section_key,
              body_md: s.body_md,
              order_index: s.order_index,
              status: s.status,
            }))}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/10 shadow-2xl">
          <CinematicPresentation
            candidate={candidate}
            showCover={showCover}
            approvalState={approvalState}
            sections={(sections ?? []).map((s) => ({
              id: s.id,
              title: s.title,
              section_key: s.section_key,
              body_md: s.body_md,
              order_index: s.order_index,
              status: s.status,
            }))}
          />
        </div>
      )}

      {viewStats && viewStats.total > 0 && (
        <AnalyticsCard candidateId={candidateId} stats={viewStats} />
      )}

      <p className="text-center text-xs text-foreground/45">
        Tip: in the print dialog, choose "Save as PDF" as the destination. Page
        backgrounds and the {approvalState} watermark print automatically.
      </p>
    </div>
  );
}

function formatDwell(ms: number) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem.toString().padStart(2, "0")}s`;
}

function AnalyticsCard({
  candidateId,
  stats,
}: {
  candidateId: string;
  stats: NonNullable<
    Awaited<ReturnType<typeof getPresentationStats>>
  >;
}) {
  const emailsFn = useServerFn(listShareEmails);
  const { data: emails } = useQuery({
    queryKey: ["share-emails", candidateId],
    queryFn: () => emailsFn({ data: { candidate_id: candidateId } }),
  });

  return (
    <ShellCard className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
            Share link analytics
          </div>
          <div className="mt-1 text-sm text-foreground/55">
            {stats.total} view{stats.total === 1 ? "" : "s"} ·{" "}
            {stats.uniqueViewers} unique
            {stats.last
              ? ` · last opened ${new Date(stats.last).toLocaleString()}`
              : ""}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Total views" value={String(stats.total)} />
        <Stat label="Unique viewers" value={String(stats.uniqueViewers)} />
        <Stat label="Avg. time on page" value={formatDwell(stats.avgDwellMs)} />
      </div>

      {stats.topSections.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-foreground/55">
            Most-viewed sections
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.topSections.map((s) => (
              <Pill key={s.key} tone="gold">
                {s.key.replace(/_/g, " ")} · {s.count}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {stats.recent.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-foreground/55">
            Recent activity
          </div>
          <div className="mt-2 divide-y divide-foreground/5 rounded-xl border border-foreground/10">
            {stats.recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Eye className="h-3 w-3 text-foreground/40" />
                  <span className="truncate text-foreground/70">
                    {new Date(r.viewed_at).toLocaleString()}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-foreground/45">
                  {formatDwell(r.dwell_ms ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {emails && emails.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-foreground/55">
            Emails sent
          </div>
          <div className="mt-2 divide-y divide-foreground/5 rounded-xl border border-foreground/10">
            {emails.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {e.to_name ? `${e.to_name} · ` : ""}
                    {e.to_email}
                  </div>
                  <div className="truncate text-[10px] text-foreground/45">
                    {new Date(e.created_at).toLocaleString()} · {e.subject}
                  </div>
                </div>
                <Pill tone={e.status === "sent" ? "soft" : "gold"}>
                  {e.status}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      )}
    </ShellCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-[color:var(--soft)] p-3">
      <div className="text-[10px] font-bold uppercase tracking-[.16em] text-foreground/55">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}

function EmailShareDialog({
  candidateId,
  candidate,
}: {
  candidateId: string;
  candidate: PresentationCandidate;
}) {
  const [open, setOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const sendFn = useServerFn(sendShareLinkEmail);
  const qc = useQueryClient();

  const send = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          candidate_id: candidateId,
          to_email: toEmail.trim(),
          to_name: toName.trim() || null,
          subject: subject.trim() || null,
          message: message.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Email sent");
      qc.invalidateQueries({ queryKey: ["share-emails", candidateId] });
      setOpen(false);
      setToEmail("");
      setToName("");
      setSubject("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const defaultSubject = `${candidate.full_name} — Executive candidate profile`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          Email this
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email this profile</DialogTitle>
          <DialogDescription>
            Sends a branded email with the share link. Create a share link
            first if you haven't yet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-[.14em] text-foreground/55">
              To · email
            </Label>
            <Input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="client@church.org"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-[.14em] text-foreground/55">
              Recipient name (optional)
            </Label>
            <Input
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Pastor Smith"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-[.14em] text-foreground/55">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={defaultSubject}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-[.14em] text-foreground/55">
              Personal note (optional)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="A brief note that will appear above the link…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            disabled={send.isPending || !/^\S+@\S+\.\S+$/.test(toEmail.trim())}
          >
            {send.isPending ? "Sending…" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
