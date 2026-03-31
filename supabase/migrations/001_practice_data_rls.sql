-- guitar.io — practice data with Row Level Security
-- Run in Supabase: SQL Editor → New query → paste → Run
-- Optional: backfill profiles for users created before this migration:
--   insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles (display name; one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id);

create policy "profiles_insert_own"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);

create policy "profiles_update_own"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Songs
-- ---------------------------------------------------------------------------
create table if not exists public.songs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    title text not null,
    artist text,
    notes text,
    created_at timestamptz not null default now(),
    last_practiced timestamptz
);

create index if not exists songs_user_id_idx on public.songs (user_id);

alter table public.songs enable row level security;

create policy "songs_all_own"
    on public.songs for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Routines
-- ---------------------------------------------------------------------------
create table if not exists public.routines (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    name text not null,
    duration_minutes integer,
    description text,
    created_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines (user_id);

alter table public.routines enable row level security;

create policy "routines_all_own"
    on public.routines for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Exercise progress (catalog ids are app-defined strings, not FKs)
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    exercise_id text not null,
    times_practiced integer not null default 0,
    last_practiced timestamptz,
    completed boolean not null default false,
    unique (user_id, exercise_id)
);

create index if not exists exercise_progress_user_idx on public.exercise_progress (user_id);

alter table public.exercise_progress enable row level security;

create policy "exercise_progress_all_own"
    on public.exercise_progress for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Practice sessions
-- ---------------------------------------------------------------------------
create table if not exists public.practice_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    session_date date not null,
    duration_minutes integer,
    routine_id uuid references public.routines (id) on delete set null,
    song_id uuid references public.songs (id) on delete set null,
    exercise_id text,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_date_idx on public.practice_sessions (user_id, session_date);

alter table public.practice_sessions enable row level security;

create policy "practice_sessions_all_own"
    on public.practice_sessions for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New auth users → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
