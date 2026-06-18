import { createFileRoute } from "@tanstack/react-router";

import { PublicSharePage } from "./p.$shareSlug";

export const Route = createFileRoute("/$shareSlug")({
  head: () => ({
    meta: [
      { title: "Candidate Profile" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicSharePage,
});
