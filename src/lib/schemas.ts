import { z } from "zod";

export const searchStageEnum = z.enum([
  "intake",
  "sourcing",
  "assessments",
  "interviews",
  "finalists",
  "presented",
  "placed",
]);
export type SearchStage = z.infer<typeof searchStageEnum>;

export const searchStatusEnum = z.enum([
  "planning",
  "active",
  "shortlisting",
  "evaluating",
  "placed",
  "closed",
]);
export type SearchStatus = z.infer<typeof searchStatusEnum>;

export const candidateStatusEnum = z.enum([
  "new",
  "in_review",
  "ready",
  "presented",
  "declined",
  "placed",
]);
export type CandidateStatus = z.infer<typeof candidateStatusEnum>;

export const sourceItemKindEnum = z.enum([
  "resume",
  "ministry_assessment",
  "life_story",
  "references",
  "spouse",
  "interview_notes",
  "manager_notes",
  "photos",
  "video_links",
  "other",
]);
export type SourceItemKind = z.infer<typeof sourceItemKindEnum>;

export const sourceItemStatusEnum = z.enum([
  "needed",
  "linked",
  "uploaded",
  "verified",
]);
export type SourceItemStatus = z.infer<typeof sourceItemStatusEnum>;

export const createSearchSchema = z.object({
  church: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).optional().nullable(),
  reports_to: z.string().trim().max(120).optional().nullable(),
  church_size: z.string().trim().max(80).optional().nullable(),
  compensation: z.string().trim().max(200).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
});

export const updateSearchSchema = z.object({
  id: z.string().uuid(),
  stage: searchStageEnum.optional(),
  status: searchStatusEnum.optional(),
  summary: z.string().trim().max(4000).optional().nullable(),
});

export const createCandidateSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  current_org: z.string().trim().max(200).optional().nullable(),
  current_title: z.string().trim().max(200).optional().nullable(),
  fit_role: z.string().trim().max(200).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
});

export const updateCandidateSchema = z.object({
  id: z.string().uuid(),
  status: candidateStatusEnum.optional(),
  fit_role: z.string().trim().max(200).optional().nullable(),
  current_title: z.string().trim().max(200).optional().nullable(),
  current_org: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
});

export const DEFAULT_SOURCE_CHECKLIST: { kind: SourceItemKind; label: string }[] = [
  { kind: "resume", label: "Candidate resume" },
  { kind: "ministry_assessment", label: "Ministry assessment form" },
  { kind: "life_story", label: "Life story form" },
  { kind: "references", label: "Candidate references" },
  { kind: "spouse", label: "Spouse materials" },
  { kind: "interview_notes", label: "Interview notes" },
  { kind: "manager_notes", label: "Search manager notes" },
  { kind: "photos", label: "Candidate photos" },
];
