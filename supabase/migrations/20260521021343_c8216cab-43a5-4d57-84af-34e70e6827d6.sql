
create type public.app_role as enum ('owner', 'admin', 'search_manager', 'consultant', 'recruiting_partner');
create type public.search_status as enum ('planning', 'active', 'shortlisting', 'evaluating', 'placed', 'closed');
create type public.search_stage as enum ('intake', 'sourcing', 'assessments', 'interviews', 'finalists', 'presented', 'placed');
create type public.candidate_status as enum ('new', 'in_review', 'ready', 'presented', 'declined', 'placed');
create type public.profile_section_status as enum ('not_started', 'draft', 'edited', 'approved');
create type public.presentation_status as enum ('draft', 'in_review', 'ready', 'shared', 'archived');
create type public.source_item_kind as enum ('resume', 'ministry_assessment', 'life_story', 'references', 'spouse', 'interview_notes', 'manager_notes', 'photos', 'video_links', 'other');
create type public.source_item_status as enum ('needed', 'linked', 'uploaded', 'verified');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text, avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_team_member(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'consultant')
    on conflict (user_id, role) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  church text not null, role text not null, city text,
  manager_id uuid references auth.users(id),
  status search_status not null default 'planning',
  stage search_stage not null default 'intake',
  monday_id text, share_code text, summary text, compensation text, reports_to text, church_size text,
  launched_at date default current_date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_searches_updated before update on public.searches for each row execute function public.set_updated_at();

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, city text, source text, fit_role text,
  owner_id uuid references auth.users(id),
  status candidate_status not null default 'new',
  email text, phone text, avatar_url text,
  current_title text, current_org text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_candidates_updated before update on public.candidates for each row execute function public.set_updated_at();

create table public.search_candidates (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  stage search_stage not null default 'sourcing',
  presentation_status presentation_status default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  unique (search_id, candidate_id)
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  kind source_item_kind not null, label text,
  status source_item_status not null default 'needed',
  storage_path text, monday_link text, file_name text,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_source_items_updated before update on public.source_items for each row execute function public.set_updated_at();

create table public.profile_sections (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  section_key text not null, title text not null, body_md text,
  status profile_section_status not null default 'not_started',
  order_index int not null default 0,
  edited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, section_key)
);
create trigger trg_profile_sections_updated before update on public.profile_sections for each row execute function public.set_updated_at();

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  search_id uuid references public.searches(id) on delete set null,
  title text not null, subtitle text,
  template_version text not null default 'one39-v1',
  status presentation_status not null default 'draft',
  access_code text, share_slug text unique, hero_image_url text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_presentations_updated before update on public.presentations for each row execute function public.set_updated_at();

create table public.presentation_sections (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  section_key text not null, order_index int not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (presentation_id, section_key)
);
create trigger trg_presentation_sections_updated before update on public.presentation_sections for each row execute function public.set_updated_at();

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id), action text not null,
  target_type text, target_id uuid, payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.searches enable row level security;
alter table public.candidates enable row level security;
alter table public.search_candidates enable row level security;
alter table public.source_items enable row level security;
alter table public.profile_sections enable row level security;
alter table public.presentations enable row level security;
alter table public.presentation_sections enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_select_team" on public.profiles for select to authenticated using (public.is_team_member(auth.uid()));
create policy "profiles_update_self" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_update_admin" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

create policy "roles_select_team" on public.user_roles for select to authenticated using (public.is_team_member(auth.uid()));
create policy "roles_admin_all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

create policy "searches_select_team" on public.searches for select to authenticated using (public.is_team_member(auth.uid()));
create policy "searches_insert_team" on public.searches for insert to authenticated with check (public.is_team_member(auth.uid()));
create policy "searches_update_owner_admin" on public.searches for update to authenticated using (created_by = auth.uid() or manager_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));
create policy "searches_delete_admin" on public.searches for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

create policy "candidates_select_team" on public.candidates for select to authenticated using (public.is_team_member(auth.uid()));
create policy "candidates_insert_team" on public.candidates for insert to authenticated with check (public.is_team_member(auth.uid()));
create policy "candidates_update_owner_admin" on public.candidates for update to authenticated using (created_by = auth.uid() or owner_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));
create policy "candidates_delete_admin" on public.candidates for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

create policy "sc_select_team" on public.search_candidates for select to authenticated using (public.is_team_member(auth.uid()));
create policy "sc_write_team" on public.search_candidates for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

create policy "si_select_team" on public.source_items for select to authenticated using (public.is_team_member(auth.uid()));
create policy "si_write_team" on public.source_items for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

create policy "ps_select_team" on public.profile_sections for select to authenticated using (public.is_team_member(auth.uid()));
create policy "ps_write_team" on public.profile_sections for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

create policy "pres_select_team" on public.presentations for select to authenticated using (public.is_team_member(auth.uid()));
create policy "pres_write_team" on public.presentations for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

create policy "press_select_team" on public.presentation_sections for select to authenticated using (public.is_team_member(auth.uid()));
create policy "press_write_team" on public.presentation_sections for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

create policy "audit_select_admin" on public.audit_log for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));
create policy "audit_insert_team" on public.audit_log for insert to authenticated with check (public.is_team_member(auth.uid()));

insert into storage.buckets (id, name, public) values ('source-files', 'source-files', false) on conflict (id) do nothing;

create policy "sf_team_select" on storage.objects for select to authenticated using (bucket_id = 'source-files' and public.is_team_member(auth.uid()));
create policy "sf_team_insert" on storage.objects for insert to authenticated with check (bucket_id = 'source-files' and public.is_team_member(auth.uid()));
create policy "sf_team_update" on storage.objects for update to authenticated using (bucket_id = 'source-files' and public.is_team_member(auth.uid()));
create policy "sf_team_delete" on storage.objects for delete to authenticated using (bucket_id = 'source-files' and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner')));
