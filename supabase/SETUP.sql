-- SkillPath AI: run in the Supabase SQL editor as project administrator.
-- Back up existing data first. This transaction creates missing tables/columns;
-- it does not delete records or assign legacy ownerless records to any user.
-- Existing incompatible column types require a reviewed migration before running.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  student_name text default '',
  student_year text default 'Year 1 Undergraduate',
  student_focus text default '',
  student_statement text default '',
  domain_metrics jsonb default '{}'::jsonb,
  assessment_answers jsonb default '{}'::jsonb,
  selected_career_id text default 'frontend-developer',
  plan_progress jsonb default '{}'::jsonb,
  snapshots jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists student_name text default '';
alter table public.profiles add column if not exists student_year text default 'Year 1 Undergraduate';
alter table public.profiles add column if not exists student_focus text default '';
alter table public.profiles add column if not exists student_statement text default '';
alter table public.profiles add column if not exists domain_metrics jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists assessment_answers jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists selected_career_id text default 'frontend-developer';
alter table public.profiles add column if not exists plan_progress jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists snapshots jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select,insert,update,delete on public.profiles to authenticated;
drop policy if exists skillpath_owner_access on public.profiles;
create policy skillpath_owner_access on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Restrictive guard also limits any previously installed broad permissive policies.
drop policy if exists skillpath_owner_guard on public.profiles;
create policy skillpath_owner_guard on public.profiles as restrictive for all to public
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table if not exists public.quiz_attempts (
  id text primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  timestamp bigint,
  date_label text,
  mode text,
  total_questions integer,
  correct_questions integer,
  time_taken_seconds integer,
  overall_score numeric,
  domain_scores jsonb default '{}'::jsonb,
  domain_breakdowns jsonb default '{}'::jsonb,
  strongest_domain text
);
alter table public.quiz_attempts add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.quiz_attempts add column if not exists timestamp bigint;
alter table public.quiz_attempts add column if not exists date_label text;
alter table public.quiz_attempts add column if not exists mode text;
alter table public.quiz_attempts add column if not exists total_questions integer;
alter table public.quiz_attempts add column if not exists correct_questions integer;
alter table public.quiz_attempts add column if not exists time_taken_seconds integer;
alter table public.quiz_attempts add column if not exists overall_score numeric;
alter table public.quiz_attempts add column if not exists domain_scores jsonb default '{}'::jsonb;
alter table public.quiz_attempts add column if not exists domain_breakdowns jsonb default '{}'::jsonb;
alter table public.quiz_attempts add column if not exists strongest_domain text;
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon;
grant select,insert,update,delete on public.quiz_attempts to authenticated;
drop policy if exists skillpath_owner_access on public.quiz_attempts;
create policy skillpath_owner_access on public.quiz_attempts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Restrictive guard also limits any previously installed broad permissive policies.
drop policy if exists skillpath_owner_guard on public.quiz_attempts;
create policy skillpath_owner_guard on public.quiz_attempts as restrictive for all to public
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.quiz_attempts alter column user_id set default auth.uid();
create index if not exists skillpath_quiz_attempts_owner on public.quiz_attempts(user_id);

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  title text,
  kind text,
  domain text,
  tags text[] default '{}'::text[],
  note_text text,
  due_date date,
  submitted_at timestamptz,
  status text,
  score numeric,
  file_path text,
  file_name text,
  file_type text,
  created_at timestamptz default now()
);
alter table public.vault_items add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.vault_items add column if not exists title text;
alter table public.vault_items add column if not exists kind text;
alter table public.vault_items add column if not exists domain text;
alter table public.vault_items add column if not exists tags text[] default '{}'::text[];
alter table public.vault_items add column if not exists note_text text;
alter table public.vault_items add column if not exists due_date date;
alter table public.vault_items add column if not exists submitted_at timestamptz;
alter table public.vault_items add column if not exists status text;
alter table public.vault_items add column if not exists score numeric;
alter table public.vault_items add column if not exists file_path text;
alter table public.vault_items add column if not exists file_name text;
alter table public.vault_items add column if not exists file_type text;
alter table public.vault_items add column if not exists created_at timestamptz default now();
alter table public.vault_items enable row level security;
revoke all on public.vault_items from anon;
grant select,insert,update,delete on public.vault_items to authenticated;
drop policy if exists skillpath_owner_access on public.vault_items;
create policy skillpath_owner_access on public.vault_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Restrictive guard also limits any previously installed broad permissive policies.
drop policy if exists skillpath_owner_guard on public.vault_items;
create policy skillpath_owner_guard on public.vault_items as restrictive for all to public
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.vault_items alter column user_id set default auth.uid();
create index if not exists skillpath_vault_items_owner on public.vault_items(user_id);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  clarity_rating integer,
  self_match_rating integer,
  expected_career text,
  time_to_finish_assessment numeric,
  time_to_finish_quiz numeric,
  device_type text,
  created_at timestamptz default now()
);
alter table public.feedback add column if not exists clarity_rating integer;
alter table public.feedback add column if not exists self_match_rating integer;
alter table public.feedback add column if not exists expected_career text;
alter table public.feedback add column if not exists time_to_finish_assessment numeric;
alter table public.feedback add column if not exists time_to_finish_quiz numeric;
alter table public.feedback add column if not exists device_type text;
alter table public.feedback add column if not exists created_at timestamptz default now();
alter table public.feedback enable row level security;
revoke all on public.feedback from anon;

-- Enforce new/updated attachment metadata without deleting old records.
alter table public.vault_items drop constraint if exists skillpath_vault_path_owner;
alter table public.vault_items add constraint skillpath_vault_path_owner
  check (user_id is not null and (file_path is null or (split_part(file_path,'/',1)=user_id::text and position('..' in file_path)=0))) not valid;

-- Feedback remains private, append-only, and requires sign-in.
revoke all on public.feedback from authenticated;
grant insert on public.feedback to authenticated;
drop policy if exists skillpath_feedback_insert on public.feedback;
create policy skillpath_feedback_insert on public.feedback for insert to authenticated
  with check (clarity_rating between 1 and 5 and self_match_rating between 1 and 5 and length(expected_career)<=200);
drop policy if exists skillpath_feedback_guard on public.feedback;
create policy skillpath_feedback_guard on public.feedback as restrictive for insert to public
  with check ((select auth.uid()) is not null and clarity_rating between 1 and 5 and self_match_rating between 1 and 5 and length(expected_career)<=200);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vault','vault',false,10485760,array['application/pdf','image/png','image/jpeg','image/pjpeg','text/plain','text/markdown','text/x-markdown'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists skillpath_vault_storage_access on storage.objects;
create policy skillpath_vault_storage_access on storage.objects for all to authenticated
  using (bucket_id='vault' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check (bucket_id='vault' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Preserve rules on other buckets; block cross-account and anonymous vault access.
drop policy if exists skillpath_vault_storage_guard on storage.objects;
create policy skillpath_vault_storage_guard on storage.objects as restrictive for all to public
  using (bucket_id<>'vault' or ((select auth.uid()) is not null and (storage.foldername(name))[1]=(select auth.uid())::text))
  with check (bucket_id<>'vault' or ((select auth.uid()) is not null and (storage.foldername(name))[1]=(select auth.uid())::text));
commit;

-- Confirm the bucket and table policies after applying:
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='vault';
select schemaname,tablename,policyname,permissive,roles,cmd from pg_policies
where (schemaname='public' and tablename in ('profiles','quiz_attempts','vault_items','feedback'))
   or (schemaname='storage' and tablename='objects');
