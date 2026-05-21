## Goal

Transform the current TanStack Start scaffold into **Profile by form. for ONE39** — an internal executive search workspace. Use the uploaded `profile_by_form_lovable_v_1_code.jsx` as the canonical visual/functional reference, the alternate `profile_by_form_v_1_app_visual.jsx` for layout cues, and `one39_candidate_profile_concept.html` as the cinematic presentation template.

## Design system (locked from references)

- **Tokens** (`src/styles.css`): paper `#F6F1E8`, soft `#FBF8F2`, ink `#11100E`, deep `#070605`, gold `#C8A15A` (accent). Serif display (Georgia/Cormorant) for headlines + sans (Inter) for UI. Generous radii (`rounded-2xl/3xl`), soft shadows, gold hairline dividers. Map all of these to semantic shadcn tokens — no raw hex in components.
- **Components**: `ShellCard`, `DarkCard`, `Pill`, `Stat`, `WilsonMark`, `One39Logo`, `Button` variants (primary gold, dark, outline, ghost, darkOutline) — ported as proper shadcn-styled primitives under `src/components/brand/` and `src/components/ui/` extensions.
- Fully responsive (sidebar collapses below `lg`, stacks on mobile) — matches reference breakpoints.

## Architecture (preserved + extended)

- **Stack stays as-is**: TanStack Start v1, file-based routing in `src/routes/`, shadcn/Tailwind v4, React Query.
- **Auth**: enable Lovable Cloud → Google OAuth + email/password. Gate the app behind a pathless `_authenticated` layout (`beforeLoad` redirects to `/login`). Public routes: `/` (marketing landing), `/login`, `/p/$shareId` (client-facing presentation share).
- **Roles**: `user_roles` table + `has_role()` security-definer function. Roles: `owner`, `admin`, `search_manager`, `consultant`, `recruiting_partner`. Admin route group `_authenticated/_admin/*`.
- **Server-side data**: server functions (`createServerFn` + `requireSupabaseAuth`) under `src/lib/*.functions.ts` for all CRUD. No direct Supabase queries from components.
- **Wilson AI**: TanStack server route `src/routes/api/wilson.ts` calling Lovable AI Gateway (`google/gemini-3-flash-preview`) via the shared `createLovableAiGatewayProvider` helper. Streaming for chat edits, `Output.object` for structured profile-section generation. Wilson never references provider names in UI.

## Route map

```text
src/routes/
  __root.tsx                         shell + providers
  index.tsx                          Marketing landing (hero, value props, request access)
  login.tsx                          Google + email login
  _authenticated.tsx                 Auth gate + AppShell (sidebar + top bar)
    dashboard.tsx                    Stats, Monday-connected searches, Wilson status
    searches.index.tsx               Search list/grid + filters
    searches.$searchId.tsx           Search detail (candidates, source, presentation links)
    candidates.index.tsx             Candidate directory + filters
    candidates.$candidateId.tsx      Candidate record (source package completeness)
    source.$candidateId.tsx          Source intake (upload + Monday pull, package checklist)
    profile.$candidateId.tsx         Wilson-assisted profile builder (sections + chat)
    presentations.index.tsx          Presentation library
    presentations.$presentationId.tsx  Section-based editor with live HTML preview
    wilson.tsx                       Wilson workspace (prompts, sources, history)
    _admin/admin.tsx                 Users, roles, audit log
    settings.tsx                     Workspace + profile settings
  p.$shareId.tsx                     Public access-coded candidate presentation
  api/wilson.ts                      AI Gateway server route (streaming + structured)
  api/public/monday-webhook.ts       Monday.com webhook (HMAC-verified, optional)
```

## Data model (Lovable Cloud / Postgres + RLS)

- `profiles` (1:1 `auth.users`): full_name, avatar, default_role
- `user_roles` (user_id, role enum) + `has_role()` function
- `searches`: church, role, city, manager_id, status, stage, monday_id, share_code
- `candidates`: name, city, source, fit_role, owner_id
- `search_candidates` (join): search_id, candidate_id, stage, presentation_status
- `source_items`: candidate_id, kind (resume/MAF/life_story/refs/notes/photos/etc.), status, storage_path, monday_link
- `profile_sections`: candidate_id, section_key, title, body_md, status (draft/edited/approved), edited_by, edited_at
- `presentations`: candidate_id, search_id, template_version, status, access_code, share_slug
- `presentation_sections`: presentation_id, section_key, content_json, order
- `wilson_messages`: thread_id (candidate_id or presentation_id scope), role, parts_json
- `audit_log`: actor, action, target, payload, created_at

RLS: every table scoped by ownership or `has_role('admin'|'owner')`. Storage bucket `source-files` (private) for uploads; presentations get signed-URL image refs.

## Feature surfaces (built from reference)

1. **Landing (`/`)** — dark hero with gold accent, "Relational intelligence for church staffing.", stat strip, feature grid. Public.
2. **Login** — split layout, Google OAuth button, value pillars. Public.
3. **AppShell** — fixed dark sidebar (One39 lockup + nav + Wilson card), sticky search/command bar (⌘K placeholder), user menu.
4. **Dashboard** — 4 KPI tiles + "searches connected to Monday.com" list + Wilson status dark card.
5. **Searches** — grid of search cards w/ status pills + presentation context panel; detail view with candidate pipeline.
6. **Candidates** — left directory, right candidate record with **source package completeness** grid (resume, MAF, life story, references, spouse, interview notes, search-manager notes, photos).
7. **Source Intake** — dual entry (upload to Cloud Storage / pull from Monday) + checklist builder.
8. **Profile Builder** — left section nav (6 narrative sections), center visual document editor with per-block edit/photo/Wilson actions, right Wilson chat pane that edits only from approved sources (source-only rule enforced server-side in the prompt).
9. **Presentation Builder** — left template sections (cover, story, leadership, strengths, family, references, compensation, recommendation), center live HTML preview, export to standalone HTML.
10. **Public presentation `/p/$shareId`** — access-code gate then renders the cinematic template from `one39_candidate_profile_concept.html` populated from `presentation_sections`.
11. **Wilson** — thread history, source library, prompt library; chat UI uses AI SDK `useChat` against `/api/wilson`.
12. **Admin** — users + roles table (admin-gated), audit log, integration toggles.
13. **Settings** — profile, workspace branding, Monday + Wilson preferences.

## Technical details

- Server functions: `searches.functions.ts`, `candidates.functions.ts`, `source.functions.ts`, `profiles.functions.ts` (profile sections), `presentations.functions.ts`, `wilson.functions.ts`. All use `requireSupabaseAuth`; mutations re-check role via `has_role()`.
- AI Gateway: shared helper `src/lib/ai-gateway.ts`; default model `google/gemini-3-flash-preview`; system prompt enforces "use only attached source materials; never invent facts". Structured outputs for section drafts via `Output.object` with a Zod schema per section type.
- File uploads: Supabase Storage `source-files/$candidateId/...` via signed upload URLs from a server function; previews via signed download URLs.
- Public share route: server loader reads presentation by `share_slug`, validates `access_code` from search params or cookie, otherwise renders gate.
- SEO: per-route `head()` metadata (no shared boilerplate). Landing + `/p/$shareId` get `og:image` (candidate hero) — auth pages get `noindex`.
- Image assets: replace text One39 lockup + Wilson SVG fallback later (slots ready); generate hero imagery via `imagegen` (premium for any text-bearing artwork).

## Build order

1. Cloud + auth + roles + tokens + AppShell + landing/login.
2. Searches → Candidates → Source intake (data model + CRUD + Storage).
3. Profile Builder + Wilson AI Gateway route (chat + structured section generation).
4. Presentation Builder + public `/p/$shareId` cinematic template.
5. Admin, Settings, audit log, optional Monday webhook.

## Out of scope (this pass)

- Real Monday.com sync (stub UI + webhook endpoint only; OAuth/board sync deferred).
- Email notifications, billing, in-app comments/threads, mobile-native app.
- Multi-tenant client logins — sharing is access-code links only.
