import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import {
  CinematicPresentation,
  type PresentationSection,
} from "@/components/presentation/cinematic-presentation";
import { MediaReviewPresentation } from "@/components/presentation/media-review-presentation";
import { ProfileAltPresentation } from "@/components/presentation/profile-alt-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicPresentation } from "@/lib/presentations.functions";
import { updatePresentationViewDwell } from "@/lib/presentation-analytics.functions";

export const Route = createFileRoute("/p/$shareSlug")({
  head: () => ({
    meta: [
      { title: "Candidate Profile" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicSharePage,
});

export type PublicSharePageProps = {
  shareSlug: string;
};

export function PublicSharePageContent({ shareSlug }: PublicSharePageProps) {
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | undefined>(
    undefined,
  );

  const viewRef = useRef<{ view_id: string; token: string } | null>(null);
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  const startRef = useRef<number>(Date.now());
  const lastReportRef = useRef<number>(0);

  const loadMut = useMutation({
    mutationFn: () =>
      getPublicPresentation({
        data: { share_slug: shareSlug, access_code: submittedCode },
      }),
  });

  if (loadMut.isIdle) loadMut.mutate();

  const result = loadMut.data;

  // Capture the signed view token returned by the server fn.
  useEffect(() => {
    if (!result || "error" in result) return;
    if (result.view && !viewRef.current) {
      viewRef.current = result.view;
      startRef.current = Date.now();
    }
  }, [result]);

  // Track section visibility + dwell time, beacon updates back to server.
  useEffect(() => {
    if (!viewRef.current) return;

    function reportDwell(reason: "interval" | "hidden") {
      const view = viewRef.current;
      if (!view) return;
      const dwellMs = Date.now() - startRef.current;
      if (
        reason === "interval" &&
        Date.now() - lastReportRef.current < 10_000
      )
        return;
      lastReportRef.current = Date.now();

      const payload = {
        view_id: view.view_id,
        share_slug: shareSlug,
        token: view.token,
        dwell_ms: dwellMs,
        sections_viewed: Array.from(sectionsViewedRef.current),
      };

      // Prefer the typed server-fn call during interval reports. For unload
      // moments, fall back to fetch(keepalive) which is the modern, spec-
      // compliant transport that browsers honor when the page is closing.
      if (reason === "interval") {
        updatePresentationViewDwell({ data: payload }).catch(() => {});
        return;
      }

      try {
        // The server fn is also reachable via a stable URL exposed at runtime.
        const url = (updatePresentationViewDwell as unknown as { url?: string })
          .url;
        const body = JSON.stringify({ data: payload });
        if (url && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          const blob = new Blob([body], { type: "application/json" });
          if (navigator.sendBeacon(url, blob)) return;
        }
        if (url) {
          void fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            keepalive: true,
          });
        } else {
          // Fall back to the typed call; may be dropped on unload in old browsers.
          updatePresentationViewDwell({ data: payload }).catch(() => {});
        }
      } catch {
        /* no-op */
      }
    }

    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-key]"),
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.4) {
            const k = (e.target as HTMLElement).dataset.sectionKey;
            if (k) sectionsViewedRef.current.add(k);
          }
        }
      },
      { threshold: [0.4] },
    );
    els.forEach((el) => io.observe(el));

    const interval = setInterval(() => reportDwell("interval"), 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") reportDwell("hidden");
    };
    const onPageHide = () => reportDwell("hidden");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      reportDwell("hidden");
      clearInterval(interval);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [shareSlug, result]);

  if (loadMut.isPending && !result) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--paper,#FAF7EE)] text-foreground/50">
        Loading…
      </div>
    );
  }

  if (result && "error" in result) {
    if (result.error === "code_required") {
      return (
        <div className="grid min-h-screen place-items-center bg-[color:var(--paper,#FAF7EE)] p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedCode(code);
              setTimeout(() => loadMut.mutate(), 0);
            }}
            className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-8 shadow-lg"
          >
            <h1 className="font-serif text-2xl">Access code required</h1>
            <p className="mt-2 text-sm text-foreground/55">
              This profile is protected. Enter the code shared with you.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              className="mt-5"
              autoFocus
            />
            <Button type="submit" className="mt-4 w-full">
              View profile
            </Button>
          </form>
        </div>
      );
    }
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--paper,#FAF7EE)] p-6 text-center">
        <div>
          <h1 className="font-serif text-3xl">Profile unavailable</h1>
          <p className="mt-2 text-sm text-foreground/55">
            This link is no longer active or hasn't been shared yet.
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="bg-[color:var(--paper,#FAF7EE)]">
      {result.template_version === "media_review" ? (
        <MediaReviewPresentation
          candidateName={result.candidate.full_name}
          title={result.title}
          subtitle={result.subtitle}
          city={result.candidate.city}
          avatarUrl={result.candidate.avatar_url}
          videos={result.mediaVideos ?? []}
        />
      ) : result.template_version === "profile_alt" ? (
        <ProfileAltPresentation
          candidate={result.candidate}
          sections={result.sections as PresentationSection[]}
        />
      ) : (
        <CinematicPresentation
          candidate={result.candidate}
          sections={result.sections as PresentationSection[]}
          showCover={true}
          approvalState={result.approvalState}
        />
      )}
      <footer className="border-t border-foreground/10 py-6 text-center text-xs text-foreground/40">
        Profile by form. · ONE39
      </footer>
    </div>
  );
}

export function PublicSharePage() {
  const { shareSlug } = Route.useParams();

  return <PublicSharePageContent shareSlug={shareSlug} />;
}
