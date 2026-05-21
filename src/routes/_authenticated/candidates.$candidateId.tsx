import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Printer,
  Trash2,
  Upload,

} from "lucide-react";
import { toast } from "sonner";

import { Pill, ShellCard } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  getCandidate,
  updateCandidate,
} from "@/lib/candidates.functions";
import { candidateStatusEnum } from "@/lib/schemas";
import {
  attachUploadedFile,
  createSignedDownloadUrl,
  createSignedUploadUrl,
  deleteSourceItem,
  listSourceItems,
  updateSourceItemStatus,
} from "@/lib/source.functions";
import {
  generateProfileSection,
  listProfileSections,
  saveProfileSection,
} from "@/lib/profile.functions";
import { PresentationTab } from "@/components/presentation/presentation-tab";


export const Route = createFileRoute("/_authenticated/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Candidate — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CandidateDetailPage,
});

function CandidateDetailPage() {
  const { candidateId } = useParams({
    from: "/_authenticated/candidates/$candidateId",
  });
  const get = useServerFn(getCandidate);
  const update = useServerFn(updateCandidate);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => get({ data: { id: candidateId } }),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      update({ data: { id: candidateId, status } as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return <div className="p-8 text-sm text-foreground/45">Loading…</div>;
  if (!data) return <div className="p-8 text-sm text-foreground/45">Not found</div>;

  const { candidate, searches } = data;

  return (
    <div className="p-6 lg:p-8">
      <Link
        to="/candidates"
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All candidates
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-[color:var(--gold)]/20" />
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[color:var(--gold-deep)]">
              {candidate.city ?? "—"}
            </div>
            <h1 className="font-serif text-5xl tracking-[-0.05em]">
              {candidate.full_name}
            </h1>
            <p className="mt-2 text-foreground/65">
              {candidate.current_title ?? "—"}
              {candidate.current_org ? ` · ${candidate.current_org}` : ""}
            </p>
          </div>
        </div>
        <Select
          value={candidate.status}
          onValueChange={(v) => statusMut.mutate(v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {candidateStatusEnum.options.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="source">Source Package</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="presentation">Presentation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ShellCard className="p-6 xl:col-span-2">
              <h3 className="font-serif text-xl">Profile snapshot</h3>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Row label="Email" value={candidate.email} />
                <Row label="Phone" value={candidate.phone} />
                <Row label="Fit role" value={candidate.fit_role} />
                <Row label="Source" value={candidate.source} />
              </dl>
            </ShellCard>
            <ShellCard className="p-6">
              <h3 className="font-serif text-xl">Linked searches</h3>
              <div className="mt-4 space-y-3">
                {searches.length === 0 && (
                  <p className="text-sm text-foreground/55">
                    Not yet attached to any search.
                  </p>
                )}
                {searches.map((s) => (
                  <Link
                    key={s.id}
                    to="/searches/$searchId"
                    params={{ searchId: s.search_id }}
                    className="block rounded-2xl border border-foreground/10 bg-[color:var(--soft)] p-3 hover:border-[color:var(--gold)]/40"
                  >
                    <div className="font-semibold">
                      {s.search?.church ?? "Search"}
                    </div>
                    <div className="text-xs text-foreground/45">
                      {s.search?.role ?? ""} · {s.stage}
                    </div>
                  </Link>
                ))}
              </div>
            </ShellCard>
          </div>
        </TabsContent>

        <TabsContent value="source">
          <SourcePackageTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="presentation">
          <PresentationTab candidateId={candidateId} candidate={candidate} />
        </TabsContent>


      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[.16em] text-foreground/45">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function SourcePackageTab({ candidateId }: { candidateId: string }) {
  const list = useServerFn(listSourceItems);
  const updateStatus = useServerFn(updateSourceItemStatus);
  const sign = useServerFn(createSignedUploadUrl);
  const attach = useServerFn(attachUploadedFile);
  const download = useServerFn(createSignedDownloadUrl);
  const del = useServerFn(deleteSourceItem);
  const qc = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: items, isLoading } = useQuery({
    queryKey: ["source", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["source", candidateId] });

  async function handleFile(itemId: string, kind: string, file: File) {
    try {
      setUploadingId(itemId);
      const { path, token } = await sign({
        data: { candidate_id: candidateId, file_name: file.name },
      });
      const { error: upErr } = await supabase.storage
        .from("source-files")
        .uploadToSignedUrl(path, token, file);
      if (upErr) throw upErr;
      await attach({
        data: {
          id: itemId,
          candidate_id: candidateId,
          kind: kind as never,
          storage_path: path,
          file_name: file.name,
        },
      });
      toast.success("File uploaded");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownload(id: string) {
    try {
      const { url } = await download({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }

  if (isLoading)
    return <div className="text-sm text-foreground/45">Loading…</div>;

  return (
    <ShellCard className="overflow-hidden">
      <div className="border-b border-foreground/10 bg-[color:var(--soft)] px-5 py-4">
        <h3 className="font-serif text-xl">Source package builder</h3>
        <p className="mt-1 text-xs text-foreground/55">
          Upload directly or mark items needed from ONE39's intake.
        </p>
      </div>
      <div className="divide-y divide-foreground/10">
        {(items ?? []).map((item) => {
          const hasFile = !!item.storage_path;
          const isUploading = uploadingId === item.id;
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                {hasFile ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-foreground/25" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {item.label ?? item.kind.replace("_", " ")}
                  </div>
                  <div className="text-xs text-foreground/45">
                    {item.file_name ?? "No file attached"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill
                  tone={
                    item.status === "verified"
                      ? "green"
                      : item.status === "uploaded"
                        ? "blue"
                        : item.status === "linked"
                          ? "gold"
                          : "soft"
                  }
                >
                  {item.status}
                </Pill>
                <input
                  ref={(el) => {
                    fileInputs.current[item.id] = el;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(item.id, item.kind, f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputs.current[item.id]?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {hasFile ? "Replace" : isUploading ? "Uploading…" : "Upload"}
                </Button>
                {hasFile && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(item.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {item.status !== "verified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateStatus({
                            data: { id: item.id, status: "verified" },
                          }).then(invalidate)
                        }
                      >
                        Verify
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    del({ data: { id: item.id } }).then(invalidate)
                  }
                  className="text-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ShellCard>
  );
}

function ProfileTab({ candidateId }: { candidateId: string }) {
  const list = useServerFn(listProfileSections);
  const save = useServerFn(saveProfileSection);
  const generate = useServerFn(generateProfileSection);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["profile-sections", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
  });

  const active = sections?.find((s) => s.id === activeId) ?? sections?.[0];
  const activeKey = active?.id;

  // Sync editor when active section changes (and not currently streaming)
  if (activeKey && activeKey !== streamingId) {
    const expected = active?.body_md ?? "";
    if (draft === "" && expected !== "") setDraft(expected);
  }

  async function handleGenerate() {
    if (!active) return;
    setStreamingId(active.id);
    setDraft("");
    try {
      const stream = await generate({
        data: {
          section_id: active.id,
          candidate_id: candidateId,
          section_key: active.section_key,
        },
      });
      for await (const chunk of stream as AsyncIterable<{ delta?: string; done?: boolean }>) {
        if (chunk.delta) setDraft((prev) => prev + chunk.delta);
      }
      toast.success("Draft ready for review");
      qc.invalidateQueries({ queryKey: ["profile-sections", candidateId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wilson failed");
    } finally {
      setStreamingId(null);
    }
  }

  async function handleSave(status?: "edited" | "approved") {
    if (!active) return;
    try {
      await save({ data: { id: active.id, body_md: draft, status } });
      toast.success(status === "approved" ? "Section approved" : "Section saved");
      qc.invalidateQueries({ queryKey: ["profile-sections", candidateId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (isLoading)
    return <div className="text-sm text-foreground/45">Loading…</div>;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <ShellCard className="xl:col-span-4 p-5">
        <Pill>Sections</Pill>
        <div className="mt-5 space-y-2">
          {(sections ?? []).map((s, i) => {
            const isActive = (active?.id ?? "") === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveId(s.id);
                  setDraft(s.body_md ?? "");
                }}
                className={`w-full text-left rounded-2xl border p-3 transition ${
                  isActive
                    ? "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/8"
                    : "border-foreground/10 bg-card hover:border-foreground/25"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/35">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <Pill
                    tone={
                      s.status === "approved"
                        ? "green"
                        : s.status === "edited"
                          ? "blue"
                          : s.status === "draft"
                            ? "gold"
                            : "soft"
                    }
                  >
                    {s.status.replace("_", " ")}
                  </Pill>
                </div>
                <div className="mt-1 text-sm font-medium">{s.title}</div>
              </button>
            );
          })}
        </div>
      </ShellCard>

      <ShellCard className="xl:col-span-8 overflow-hidden">
        <div className="border-b border-foreground/10 bg-[color:var(--soft)] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold-deep)]">
              Wilson AI · grounded in source package
            </div>
            <h3 className="mt-1 font-serif text-xl">
              {active?.title ?? "Select a section"}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!active || streamingId !== null}
              onClick={handleGenerate}
            >
              {streamingId === active?.id ? "Drafting…" : "Ask Wilson to draft"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!active || streamingId !== null}
              onClick={() => handleSave("edited")}
            >
              Save
            </Button>
            <Button
              size="sm"
              disabled={!active || streamingId !== null || !draft.trim()}
              onClick={() => handleSave("approved")}
            >
              Approve
            </Button>
          </div>
        </div>
        <div className="p-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="No draft yet. Ask Wilson to compose this section from the source package, then refine the prose."
            className="min-h-[420px] w-full resize-y rounded-2xl border border-foreground/10 bg-card p-5 font-serif text-[15px] leading-8 text-foreground/85 outline-none focus:border-[color:var(--gold)]/50"
          />
          {streamingId === active?.id && (
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-[color:var(--gold-deep)]">
              Wilson is writing…
            </div>
          )}
        </div>
      </ShellCard>
    </div>
  );
}
