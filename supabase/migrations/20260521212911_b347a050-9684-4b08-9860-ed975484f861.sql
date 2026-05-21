
-- Presentation view analytics
create table public.presentation_views (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null,
  share_slug text not null,
  viewer_hash text,
  user_agent text,
  referrer text,
  viewed_at timestamptz not null default now()
);
create index presentation_views_pres_idx on public.presentation_views(presentation_id, viewed_at desc);
create index presentation_views_slug_idx on public.presentation_views(share_slug, viewed_at desc);
alter table public.presentation_views enable row level security;

create policy "pv_select_team" on public.presentation_views
  for select to authenticated using (is_team_member(auth.uid()));
-- Inserts happen via supabaseAdmin from the public share route; no client insert policy needed.

-- Wilson conversations
create table public.wilson_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wilson_conversations_user_idx on public.wilson_conversations(user_id, updated_at desc);
alter table public.wilson_conversations enable row level security;

create policy "wc_select_own" on public.wilson_conversations
  for select to authenticated using (user_id = auth.uid());
create policy "wc_insert_own" on public.wilson_conversations
  for insert to authenticated with check (user_id = auth.uid());
create policy "wc_update_own" on public.wilson_conversations
  for update to authenticated using (user_id = auth.uid());
create policy "wc_delete_own" on public.wilson_conversations
  for delete to authenticated using (user_id = auth.uid());

create trigger wilson_conversations_updated_at
  before update on public.wilson_conversations
  for each row execute function public.set_updated_at();

create table public.wilson_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.wilson_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index wilson_messages_conv_idx on public.wilson_messages(conversation_id, created_at asc);
alter table public.wilson_messages enable row level security;

create policy "wm_select_own" on public.wilson_messages
  for select to authenticated
  using (exists (select 1 from public.wilson_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()));
create policy "wm_insert_own" on public.wilson_messages
  for insert to authenticated
  with check (exists (select 1 from public.wilson_conversations c
                      where c.id = conversation_id and c.user_id = auth.uid()));
create policy "wm_delete_own" on public.wilson_messages
  for delete to authenticated
  using (exists (select 1 from public.wilson_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()));

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

create policy "notif_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notif_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy "notif_insert_team" on public.notifications
  for insert to authenticated with check (is_team_member(auth.uid()));
create policy "notif_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
