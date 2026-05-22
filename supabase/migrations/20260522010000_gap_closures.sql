-- Gap closure migration: notification preferences, presentation analytics extensions,
-- and an email_log for share-link emails.

-- 1) Notification preferences (per user)
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_share_view boolean not null default true,
  notify_candidate_status boolean not null default true,
  notify_share_email_sent boolean not null default true,
  email_share_view boolean not null default false,
  email_candidate_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "np_select_own" on public.notification_preferences;
drop policy if exists "np_upsert_own" on public.notification_preferences;
drop policy if exists "np_update_own" on public.notification_preferences;

create policy "np_select_own" on public.notification_preferences
  for select to authenticated using (user_id = auth.uid());
create policy "np_upsert_own" on public.notification_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy "np_update_own" on public.notification_preferences
  for update to authenticated using (user_id = auth.uid());

drop trigger if exists trg_notification_preferences_updated on public.notification_preferences;
create trigger trg_notification_preferences_updated
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- 2) Presentation analytics — add dwell + sections viewed.
alter table public.presentation_views
  add column if not exists dwell_ms integer,
  add column if not exists sections_viewed jsonb;

-- 3) Share-link email log
create table if not exists public.share_emails (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  to_email text not null,
  to_name text,
  subject text not null,
  message text,
  sent_by uuid not null references auth.users(id),
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now()
);
create index if not exists share_emails_pres_idx on public.share_emails(presentation_id, created_at desc);

alter table public.share_emails enable row level security;
drop policy if exists "se_select_team" on public.share_emails;
drop policy if exists "se_insert_team" on public.share_emails;
create policy "se_select_team" on public.share_emails
  for select to authenticated using (public.is_team_member(auth.uid()));
-- Insert is bound to the sender's own auth.uid() so direct client writes
-- can't forge sender attribution. Server fn uses service-role + the resolved
-- userId from the auth middleware.
create policy "se_insert_team" on public.share_emails
  for insert to authenticated
  with check (
    public.is_team_member(auth.uid()) and sent_by = auth.uid()
  );
