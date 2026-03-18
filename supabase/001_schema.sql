-- ============================================================
-- PROGRADE — Full Schema Migration
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── DATASET 1: Course Content (admin-owned, learner read-only)

create table public.courses (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  role_title  text not null,
  description text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.phases (
  id                  uuid primary key default uuid_generate_v4(),
  course_id           uuid references public.courses(id) on delete cascade,
  title               text not null,
  description         text,
  "order"             int not null default 0,
  parallel_ok         boolean default false,
  depends_on_phase_id uuid references public.phases(id),
  min_pass_pct        int default 70,
  created_at          timestamptz default now()
);

create table public.resources (
  id          uuid primary key default uuid_generate_v4(),
  phase_id    uuid references public.phases(id) on delete cascade,
  title       text not null,
  description text,
  "order"     int not null default 0,
  created_at  timestamptz default now()
);

create table public.topics (
  id              uuid primary key default uuid_generate_v4(),
  resource_id     uuid references public.resources(id) on delete cascade,
  title           text not null,
  level           text check (level in ('basic','intermediate','advanced')) default 'basic',
  "order"         int not null default 0,
  notes_md        text,
  prereq_topic_id uuid references public.topics(id),
  ai_generated    boolean default false,
  created_at      timestamptz default now()
);

create table public.topic_materials (
  id         uuid primary key default uuid_generate_v4(),
  topic_id   uuid references public.topics(id) on delete cascade,
  type       text check (type in ('article','video','sandbox','docs','exercise')) not null,
  label      text not null,
  url        text not null,
  "order"    int default 0
);

create table public.quiz_questions (
  id           uuid primary key default uuid_generate_v4(),
  topic_id     uuid references public.topics(id) on delete cascade,
  round        int check (round in (1,2,3)) not null,
  question     text not null,
  options      jsonb not null,
  answer_idx   int not null,
  explanation  text,
  ai_generated boolean default false,
  created_at   timestamptz default now()
);

create table public.challenges (
  id           uuid primary key default uuid_generate_v4(),
  topic_id     uuid references public.topics(id) on delete cascade,
  title        text not null,
  description  text not null,
  starter_code text,
  test_fn      text,
  hint         text,
  difficulty   text check (difficulty in ('easy','medium','hard')) default 'medium',
  "order"      int default 0,
  ai_generated boolean default false,
  created_at   timestamptz default now()
);

create table public.phase_tests (
  id              uuid primary key default uuid_generate_v4(),
  phase_id        uuid references public.phases(id) on delete cascade,
  min_pass_pct    int default 70,
  question_ids    uuid[] default '{}',
  created_at      timestamptz default now()
);

-- ── DATASET 2: Learner Progress (user-owned, RLS enforced)

create table public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text,
  email        text,
  role         text check (role in ('admin','learner')) default 'learner',
  course_id    uuid references public.courses(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.phase_progress (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.user_profiles(id) on delete cascade,
  phase_id      uuid references public.phases(id) on delete cascade,
  status        text check (status in ('locked','unlocked','in_progress','completed')) default 'locked',
  prereq_score  int,
  unlocked_at   timestamptz,
  completed_at  timestamptz,
  unique(user_id, phase_id)
);

create table public.topic_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.user_profiles(id) on delete cascade,
  topic_id     uuid references public.topics(id) on delete cascade,
  status       text check (status in ('locked','unlocked','in_progress','completed')) default 'locked',
  started_at   timestamptz,
  completed_at timestamptz,
  unique(user_id, topic_id)
);

create table public.quiz_attempts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.user_profiles(id) on delete cascade,
  topic_id     uuid references public.topics(id) on delete cascade,
  round        int check (round in (1,2,3)) not null,
  score        int not null default 0,
  answers      jsonb default '{}',
  passed       boolean default false,
  attempted_at timestamptz default now()
);

create table public.challenge_submissions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.user_profiles(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  code         text,
  passed       boolean default false,
  attempts     int default 1,
  submitted_at timestamptz default now()
);

create table public.sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.user_profiles(id) on delete cascade,
  topic_id        uuid references public.topics(id),
  punched_in_at   timestamptz default now(),
  punched_out_at  timestamptz,
  duration_sec    int,
  stale           boolean default false
);

create table public.phase_test_attempts (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.user_profiles(id) on delete cascade,
  phase_test_id  uuid references public.phase_tests(id) on delete cascade,
  score          int not null default 0,
  answers        jsonb default '{}',
  passed         boolean default false,
  attempted_at   timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index on public.phases(course_id);
create index on public.resources(phase_id);
create index on public.topics(resource_id);
create index on public.topic_materials(topic_id);
create index on public.quiz_questions(topic_id, round);
create index on public.challenges(topic_id);
create index on public.topic_progress(user_id);
create index on public.quiz_attempts(user_id, topic_id);
create index on public.sessions(user_id);
create index on public.sessions(punched_in_at);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger on_courses_update before update on public.courses
  for each row execute procedure public.handle_updated_at();
create trigger on_profiles_update before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- ── Auto-create profile on signup ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'learner')
  );
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS Policies ─────────────────────────────────────────────
alter table public.courses           enable row level security;
alter table public.phases            enable row level security;
alter table public.resources         enable row level security;
alter table public.topics            enable row level security;
alter table public.topic_materials   enable row level security;
alter table public.quiz_questions    enable row level security;
alter table public.challenges        enable row level security;
alter table public.phase_tests       enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.phase_progress    enable row level security;
alter table public.topic_progress    enable row level security;
alter table public.quiz_attempts     enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.sessions          enable row level security;
alter table public.phase_test_attempts  enable row level security;

-- Course content: everyone authenticated can read; only admins write
create policy "Authenticated can read courses" on public.courses for select to authenticated using (true);
create policy "Admins manage courses" on public.courses for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read phases" on public.phases for select to authenticated using (true);
create policy "Admins manage phases" on public.phases for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read resources" on public.resources for select to authenticated using (true);
create policy "Admins manage resources" on public.resources for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read topics" on public.topics for select to authenticated using (true);
create policy "Admins manage topics" on public.topics for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read materials" on public.topic_materials for select to authenticated using (true);
create policy "Admins manage materials" on public.topic_materials for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read questions" on public.quiz_questions for select to authenticated using (true);
create policy "Admins manage questions" on public.quiz_questions for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read challenges" on public.challenges for select to authenticated using (true);
create policy "Admins manage challenges" on public.challenges for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

create policy "Authenticated can read phase tests" on public.phase_tests for select to authenticated using (true);
create policy "Admins manage phase tests" on public.phase_tests for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

-- Profiles: users own their row; admins see all
create policy "Users read own profile" on public.user_profiles for select to authenticated
  using (id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin');
create policy "Users update own profile" on public.user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins manage profiles" on public.user_profiles for all to authenticated
  using ((select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.user_profiles where id = auth.uid()) = 'admin');

-- Progress tables: users own their rows; admins read all
create policy "Users manage own phase progress" on public.phase_progress for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());

create policy "Users manage own topic progress" on public.topic_progress for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());

create policy "Users manage own quiz attempts" on public.quiz_attempts for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());

create policy "Users manage own submissions" on public.challenge_submissions for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());

create policy "Users manage own sessions" on public.sessions for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());

create policy "Users manage own test attempts" on public.phase_test_attempts for all to authenticated
  using (user_id = auth.uid() or (select role from public.user_profiles where id = auth.uid()) = 'admin')
  with check (user_id = auth.uid());
