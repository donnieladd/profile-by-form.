## Goal
Replace all remaining stubs/mocks with real, working features so the app is end-to-end functional.

## Scope (5 areas)

### 1. Dashboard — real data
`src/routes/_authenticated/dashboard.tsx`
- New server fn `getDashboardStats` returning: active searches, candidates in flight, presentations sent, approvals pending.
- New server fn `getRecentSearches` (last 5 with stage + candidate count).
- New server fn `getRecentActivity` from `audit_log` (last 10 entries with actor name).
- Wire via `useQuery`; remove hardcoded values.

### 2. Presentations hub — real data
`src/routes/_authenticated/presentations.tsx`
- New server fn `listPresentations` joining `presentations` + `candidates` + `searches`.
- Grid of cards (candidate name, search/role, status badge, updated_at, link to `/candidates/$id?tab=presentation`).
- Filters: status (draft/approved/sent), search-by-candidate.
- Remove mocked "Shemyah Wilson" data.

### 3. Wilson chat — working AI assistant
`src/routes/_authenticated/wilson.tsx`
- New streaming server fn `streamWilsonChat` (Lovable AI gateway, `google/gemini-2.5-flash`, async generator pattern from server-functions knowledge).
- System prompt frames Wilson as an executive-search research assistant with context about the firm's workflow.
- Optional candidate context selector (pick a candidate → injects their source-package summary into the prompt).
- Chat UI: message list, streaming assistant bubbles, input box, new-conversation button. In-memory per-session (no persistence this round).

### 4. Admin / team roles
`src/routes/_authenticated/admin.tsx`
- Gate behind `has_role('admin' | 'owner')` (server-fn check; redirect otherwise).
- New server fns: `listTeamMembers` (join `profiles` + `user_roles`), `updateUserRole`, `inviteTeamMember` (uses `supabaseAdmin.auth.admin.inviteUserByEmail`).
- Table: name, email, role dropdown (consultant/admin/owner), invite button, audit trail link.

### 5. Public share links
- New route `src/routes/p.$shareSlug.tsx` (public, no auth).
- New public server fn `getPublicPresentation` using `supabaseAdmin`, scoped strictly by `share_slug` + `status='approved'`, returning only safe fields.
- Optional access-code gate (`access_code` field on presentation).
- Renders `CinematicPresentation` read-only (no edit, no print watermark when approved).
- Add "Copy share link" + "Regenerate slug" actions in `PresentationTab`.
- Server fn `createShareLink` (generates random slug, sets status).

### 6. Global search (⌘K)
`src/components/app-shell.tsx`
- shadcn `CommandDialog` opened by ⌘K / Ctrl+K.
- New server fn `globalSearch(q)` → searches candidates (name/email/org), searches (church/role), presentations (title).
- Grouped results; each item navigates to its detail route.

## Out of scope
- Email delivery of share links (just copy-to-clipboard).
- Wilson chat persistence to DB.
- Realtime presence on admin page.

## Order of implementation
1. Dashboard stats (smallest, validates server-fn pattern)
2. Presentations hub
3. Global search (⌘K)
4. Public share links
5. Wilson streaming chat
6. Admin team management

I'll create one migration if needed (only for `presentations.access_code` defaults or indexes — schema already has the columns). No destructive changes.
