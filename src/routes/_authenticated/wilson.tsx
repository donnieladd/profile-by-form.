import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { DarkCard, PageHeader, WilsonMark } from "@/components/brand/brand";

export const Route = createFileRoute("/_authenticated/wilson")({
  head: () => ({
    meta: [
      { title: "Wilson — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WilsonPage,
});

function WilsonPage() {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Wilson AI"
        title="Ministry-trained intelligence."
        subtitle="Wilson surfaces insights, drafts profile sections, and powers the cinematic presentation builder — using only approved source materials."
      />
      <DarkCard className="p-10">
        <div className="flex items-start gap-8">
          <WilsonMark className="h-24 w-28 text-[color:var(--gold)]" />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[color:var(--gold)]">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">
                Wilson workspace
              </span>
            </div>
            <h2 className="mt-4 font-serif text-3xl">Coming online soon.</h2>
            <p className="mt-3 max-w-2xl text-white/55">
              The Wilson chat surface, prompt library, and source-grounded
              profile generation hook into Lovable AI Gateway. This panel will
              host threaded conversations scoped to each candidate or
              presentation.
            </p>
          </div>
        </div>
      </DarkCard>
    </div>
  );
}
