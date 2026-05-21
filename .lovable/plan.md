# Phase 2 — Searches, Candidates & Source Package (Real CRUD)

Replace the mock data in the AppShell sub-pages with real data backed by Lovable Cloud, using TanStack `createServerFn` + React Query. Keep the editorial UI exactly as designed in Phase 1.

## Scope

1. **Searches** — list, create, view, update stage/status
2. **Candidates** — list, create, view, link to a search, update stage
3. **Source Package** — per-candidate intake checklist + file uploads to `source-files` bucket
4. **Shared infrastructure** — server-fn modules, Zod schemas, query keys, toast feedback

Explicitly **out of scope** for this phase: Wilson AI streaming, profile-section builder UI, presentation rendering, public `/p/$shareId`, admin role management. Those remain Phase 3+.

## Server functions (new files)

```
src/lib/
  searches.functions.ts      # listSearches, getSearch, createSearch, updateSearch
  candidates.functions.ts    # listCandidates, getCandidate, createCandidate,
                             #   updateCandidate, linkCandidateToSearch,
                             #   updateSearchStage
  source.functions.ts        # listSourceItems, createSourceItem,
                             #   updateSourceItemStatus, deleteSourceItem,
                             #   createSignedUploadUrl, createSignedDownloadUrl
  schemas.ts                 # shared Zod schemas (client-safe)
```

All protected by `requireSupabaseAuth`; reads/writes go through the user-scoped Supabase client so RLS applies. Storage uploads use `createSignedUploadUrl` so the browser PUTs directly to the `source-files` bucket without exposing the service role.

## Routes refactor (existing files)

- `_authenticated/searches.tsx` → real list + "New search" dialog (church, role, city, reports_to, church_size, compensation, summary). Row click → `/searches/$searchId`.
- `_authenticated/searches.$searchId.tsx` *(new)* → search detail: header, stage stepper (intake → sourcing → screening → presentation → finalist → placed), linked candidates table, "Add candidate" picker.
- `_authenticated/candidates.tsx` → real list with status filter + "New candidate" dialog.
- `_authenticated/candidates.$candidateId.tsx` *(new)* → candidate detail with tabs: **Overview**, **Source Package**, **Profile** (stub), **Presentation** (stub).
- `_authenticated/source.tsx` → redirects to candidates list (per-candidate source lives under the candidate detail tab); keep as an index that lists candidates needing source items.

Pattern for each protected route: `beforeLoad` calls `supabase.auth.getUser()` (already in `_authenticated.tsx` parent — verify), then `loader` uses `queryClient.ensureQueryData(queryOptions)` and component uses `useSuspenseQuery`.

## Data shapes & defaults

- New search → `stage: 'intake'`, `status: 'planning'`, `launched_at: today`.
- New candidate → `status: 'new'`, `created_by: auth.uid()`.
- Linking candidate to search → insert into `search_candidates` with `stage: 'sourcing'`.
- Default source-item checklist seeded on first visit per candidate: Resume, LinkedIn URL, Doctrinal statement, References, Theology questionnaire, Family/spouse note, Photo (each `status: 'needed'`).

## File uploads

`source-files` bucket is private. Flow:
1. Client requests `createSignedUploadUrl({ candidateId, fileName, contentType })`.
2. Server function validates membership + returns signed PUT URL + `storage_path` = `candidates/{candidateId}/{uuid}-{safeName}`.
3. Client PUTs file → calls `createSourceItem` with the returned `storage_path`.
4. Download via `createSignedDownloadUrl({ sourceItemId })` (5-min expiry).

Add storage RLS policies in a migration so `is_team_member(auth.uid())` controls read/write on the `source-files` bucket (currently no storage policies exist).

## React Query conventions

- Query keys: `['searches']`, `['search', id]`, `['candidates', filters]`, `['candidate', id]`, `['source', candidateId]`.
- Mutations invalidate the matching list + detail keys; success/error via `sonner` toast.

## Migrations needed

One migration:
- Storage policies for `source-files` (select/insert/update/delete gated by `is_team_member(auth.uid())`).
- Helpful indexes: `search_candidates(search_id)`, `search_candidates(candidate_id)`, `source_items(candidate_id)`, `candidates(status)`, `searches(stage, status)`.

No schema/column changes — Phase 1 tables already cover this.

## Acceptance

- Create a search → it appears in the list and detail loads.
- Create a candidate, link to a search → shows in search detail and candidate's search column.
- Upload a file to a candidate's source item → status flips to `received`, download link works, file is gated by RLS.
- All pages keep the Phase 1 Paper/Ink/Gold visual language; no `<Spinner>` flashes during navigation (Suspense + skeletons).

## Build order

1. `schemas.ts` + `searches.functions.ts` + searches list/detail + create dialog
2. `candidates.functions.ts` + candidates list/detail + create dialog + link-to-search
3. Storage policies migration + `source.functions.ts` + source-package tab with upload
4. QA pass against acceptance checklist

Proceed?
