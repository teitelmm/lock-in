-- Lock In schema. Run this once in the Supabase SQL editor (or with `supabase db push`).

create table public.study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  subject text not null default '',
  source_file_path text,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.study_sets (id) on delete cascade,
  position int not null default 0,
  term text not null,
  definition text not null
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.study_sets (id) on delete cascade,
  position int not null default 0,
  type text not null check (type in ('mcq', 'true_false', 'short')),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  answer text not null,
  explanation text not null default ''
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_id uuid not null references public.study_sets (id) on delete cascade,
  mode text not null check (mode in ('quiz', 'flashcards', 'speed', 'falling')),
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('tutor', 'solve')),
  problem_text text not null default '',
  image_path text,
  created_at timestamptz not null default now()
);

create table public.homework_messages (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index on public.study_sets (user_id, created_at desc);
create index on public.cards (set_id, position);
create index on public.questions (set_id, position);
create index on public.attempts (user_id, created_at desc);
create index on public.homework (user_id, created_at desc);
create index on public.homework_messages (homework_id, created_at);

-- Row-level security: every row belongs to one user, and only that user can see it.
alter table public.study_sets enable row level security;
alter table public.cards enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.homework enable row level security;
alter table public.homework_messages enable row level security;

create policy "own sets" on public.study_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own cards" on public.cards
  for all using (exists (select 1 from public.study_sets s where s.id = set_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.study_sets s where s.id = set_id and s.user_id = auth.uid()));

create policy "own questions" on public.questions
  for all using (exists (select 1 from public.study_sets s where s.id = set_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.study_sets s where s.id = set_id and s.user_id = auth.uid()));

create policy "own attempts" on public.attempts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own homework" on public.homework
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own homework messages" on public.homework_messages
  for all using (exists (select 1 from public.homework h where h.id = homework_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.homework h where h.id = homework_id and h.user_id = auth.uid()));

-- Private bucket for uploaded notes, slides and homework photos. Files live under <user id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 52428800)
on conflict (id) do nothing;

create policy "upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
