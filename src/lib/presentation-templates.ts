// Template registry for profile output rendering.
//
// How to add a new template:
// 1) Add a new entry here with a stable id, label, and DB value.
// 2) Add template-specific metadata if needed (coverEnabled, supportsVideos, etc.).
// 3) Add a dedicated component under src/components/presentation/.
// 4) Wire it in the presentation-tab render switch and public share switch.
// 5) Update DB migration/presentation schema only if a new template token is required.

export const templateConfig = {
  profile: {
    id: "profile" as const,
    label: "Profile",
    dbValue: "one39-v1",
    supportsCover: true,
  },
  profile_alt: {
    id: "profile_alt" as const,
    label: "Profile (v2)",
    dbValue: "one39-v2",
    supportsCover: true,
  },
  media_review: {
    id: "media_review" as const,
    label: "Media review",
    dbValue: "media-review-v1",
    supportsCover: false,
  },
} as const;

export type PresentationTemplate = keyof typeof templateConfig;
export type PresentationTemplateDbValue = (typeof templateConfig)[PresentationTemplate]["dbValue"];

export const templateOptions: Array<{
  id: PresentationTemplate;
  label: string;
  supportsCover: boolean;
}> = Object.values(templateConfig).map((value) => ({
  id: value.id,
  label: value.label,
  supportsCover: value.supportsCover,
}));

export const templateToDbValue: Record<PresentationTemplate, PresentationTemplateDbValue> = {
  profile: templateConfig.profile.dbValue,
  profile_alt: templateConfig.profile_alt.dbValue,
  media_review: templateConfig.media_review.dbValue,
};

export const dbValueToTemplate: Record<string, PresentationTemplate> = {
  [templateConfig.profile.dbValue]: "profile",
  [templateConfig.profile_alt.dbValue]: "profile_alt",
  [templateConfig.media_review.dbValue]: "media_review",
};

export const legacyTemplateDbValueToTemplate: Record<string, PresentationTemplate> = {
  [templateConfig.profile.dbValue]: "profile",
  // Existing data patterns we still support for backward compatibility:
  one39: "profile",
  v1: "profile",
  media_review: "media_review",
};

export function normalizeTemplate(dbValue?: string | null): PresentationTemplate {
  if (!dbValue) return "profile";

  if (dbValue in dbValueToTemplate) {
    return dbValueToTemplate[dbValue];
  }

  if (dbValue in legacyTemplateDbValueToTemplate) {
    return legacyTemplateDbValueToTemplate[dbValue];
  }

  return "profile";
}

export const templateIds = Object.keys(templateConfig) as PresentationTemplate[];
