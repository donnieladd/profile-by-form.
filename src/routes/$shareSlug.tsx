import { createFileRoute } from "@tanstack/react-router";

import { PublicSharePageContent } from "./p.$shareSlug";

export const Route = createFileRoute("/$shareSlug")({
  head: () => ({
    meta: [
      { title: "Candidate Profile" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => {
    const { shareSlug } = Route.useParams();
    return <PublicSharePageContent shareSlug={shareSlug} />;
  },
});
