export type DeliverableType = "profile" | "media" | "review";

export type CandidateDelivery = {
  template: "profile" | "profile_alt" | "media_review" | string;
  shareSlug: string;
};

const DEFAULT_DELIVERABLE_BY_TEMPLATE: Record<string, DeliverableType> = {
  profile: "profile",
  profile_alt: "profile",
  media_review: "media",
};

function deriveDeliverable(template: string): DeliverableType {
  return DEFAULT_DELIVERABLE_BY_TEMPLATE[template] ?? "profile";
}

function inferHostOverride(deliverable: DeliverableType) {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    switch (deliverable) {
      case "profile":
        return process.env.APP_PROFILE_DOMAIN;
      case "media":
        return process.env.APP_MEDIA_DOMAIN;
      case "review":
        return process.env.APP_REVIEW_DOMAIN;
      default:
        return process.env.APP_PROFILE_DOMAIN;
    }
  }
  return undefined;
}

function toOriginLikeString(base: string) {
  if (/^https?:\/\//i.test(base)) return base;
  return `https://${base}`;
}

export function getDeliveryHost(deliverable: DeliverableType) {
  const envHost = inferHostOverride(deliverable);
  if (envHost) return envHost.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    if (isLocalhost) return window.location.origin;

    const baseParts = host.split(".");
    const isProfileLike = host.startsWith("profile.") ||
      host.endsWith(".profiles.one39files.co");
    const isMediaLike = host.startsWith("media.") ||
      host.endsWith(".media.one39files.co");

    if (isProfileLike) return `https://profile.one39files.co`;
    if (isMediaLike) return `https://media.one39files.co`;
    if (host.includes("one39files.co")) return `https://${baseParts[0]}.one39files.co`;

    return window.location.origin;
  }

  return "https://one39files.co";
}

export function buildCandidateDeliveryUrl({ template, shareSlug }: CandidateDelivery) {
  const deliverable = deriveDeliverable(template);
  const host = getDeliveryHost(deliverable);
  const path = `/${shareSlug}`;
  return `${toOriginLikeString(host)}${path}`;
}

export function getDeliverableLabel(template: string) {
  switch (template) {
    case "media_review":
      return "media";
    case "profile":
    case "profile_alt":
      return "profile";
    default:
      return "profile";
  }
}
