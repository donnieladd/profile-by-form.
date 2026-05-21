import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import {
  CinematicPresentation,
  type PresentationSection,
} from "@/components/presentation/cinematic-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicPresentation } from "@/lib/presentations.functions";
import { logPresentationView } from "@/lib/presentation-analytics.functions";

export const Route = createFileRoute("/p/$shareSlug")({
  head: () => ({
    meta: [
      { title: "Candidate Profile" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicSharePage,
});

function PublicSharePage() {
  const { shareSlug } = Route.useParams();
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | undefined>(
    undefined,
  );
  const [logged, setLogged] = useState(false);

  const loadMut = useMutation({
    mutationFn: () =>
      getPublicPresentation({
        data: { share_slug: shareSlug, access_code: submittedCode },
      }),
  });

  if (loadMut.isIdle) loadMut.mutate();

  const result = loadMut.data;

  // log view once a successful payload comes back
  useEffect(() => {
    if (logged || !result || "error" in result) return;
    setLogged(true);
    logPresentationView({
      data: {
        share_slug: shareSlug,
        user_agent:
          typeof navigator !== "undefined"
            ? navigator.userAgent.slice(0, 500)
            : undefined,
        referrer:
          typeof document !== "undefined"
            ? (document.referrer ?? "").slice(0, 500) || undefined
            : undefined,
      },
    }).catch(() => {});
  }, [result, logged, shareSlug]);

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
              This presentation is protected. Enter the code shared with you.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              className="mt-5"
              autoFocus
            />
            <Button type="submit" className="mt-4 w-full">
              View presentation
            </Button>
          </form>
        </div>
      );
    }
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--paper,#FAF7EE)] p-6 text-center">
        <div>
          <h1 className="font-serif text-3xl">Presentation unavailable</h1>
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
      <CinematicPresentation
        candidate={result.candidate}
        sections={result.sections as PresentationSection[]}
        showCover={true}
        approvalState={result.approvalState}
      />
      <footer className="border-t border-foreground/10 py-6 text-center text-xs text-foreground/40">
        Profile by form. · ONE39
      </footer>
    </div>
  );
}
