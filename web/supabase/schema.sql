-- Shepherd Desk — Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------- tables
create table if not exists public.churches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  owner      uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  church_id  uuid not null references public.churches on delete cascade,
  role       text not null default 'admin',
  full_name  text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_church_idx on public.profiles (church_id);

-- Every record the app stores (members, services, income, ...) is one JSON
-- document in this table, scoped to a church. The app treats `col` as the
-- collection name and `doc_id` as the record id.
create table if not exists public.records (
  church_id  uuid not null references public.churches on delete cascade,
  col        text not null,
  doc_id     text not null,
  doc        jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  primary key (church_id, col, doc_id)
);
create index if not exists records_church_col_idx on public.records (church_id, col);

-- ------------------------------------------------------------- helpers
-- The church of the signed-in user. security definer so the policies below
-- can read profiles without recursing through its own RLS.
create or replace function public.current_church()
returns uuid language sql stable security definer set search_path = public as $$
  select church_id from public.profiles where user_id = auth.uid()
$$;

-- Sign-up path 1: start a new church. Returns the new church id.
create or replace function public.create_church(p_name text, p_full_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'This account already belongs to a church';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.churches (name, join_code, owner) values (coalesce(nullif(trim(p_name), ''), 'My church'), v_code, auth.uid())
    returning id into v_id;
  insert into public.profiles (user_id, church_id, role, full_name) values (auth.uid(), v_id, 'admin', p_full_name);
  return v_id;
end $$;

-- Sign-up path 2: join an existing church with its code (Settings shows it).
create or replace function public.join_church(p_code text, p_full_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_id from public.churches where join_code = upper(trim(p_code));
  if v_id is null then raise exception 'That church code was not found'; end if;
  insert into public.profiles (user_id, church_id, role, full_name) values (auth.uid(), v_id, 'secretary', p_full_name)
    on conflict (user_id) do update set church_id = excluded.church_id;
  return v_id;
end $$;

-- --------------------------------------------------------------- RLS
alter table public.churches enable row level security;
alter table public.profiles enable row level security;
alter table public.records  enable row level security;

drop policy if exists churches_read on public.churches;
create policy churches_read on public.churches for select using (id = public.current_church());
drop policy if exists churches_update on public.churches;
create policy churches_update on public.churches for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (church_id = public.current_church());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists records_all on public.records;
create policy records_all on public.records for all
  using (church_id = public.current_church())
  with check (church_id = public.current_church());

-- ---------------------------------------------------------- realtime
-- So every open tab sees other people's changes live.
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
