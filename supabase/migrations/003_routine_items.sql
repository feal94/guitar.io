-- guitar.io — routine line items (ordered songs / exercises with per-step duration)
-- Run in Supabase after 001_practice_data_rls.sql

-- ---------------------------------------------------------------------------
-- Routine items
-- ---------------------------------------------------------------------------
create table if not exists public.routine_items (
    id uuid primary key default gen_random_uuid(),
    routine_id uuid not null references public.routines (id) on delete cascade,
    sort_order integer not null,
    item_type text not null check (item_type in ('song', 'exercise')),
    song_id uuid references public.songs (id) on delete cascade,
    exercise_id text,
    duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 180),
    constraint routine_items_song_exercise_ck check (
        (item_type = 'song' and song_id is not null and exercise_id is null)
        or (item_type = 'exercise' and exercise_id is not null and song_id is null)
    )
);

create index if not exists routine_items_routine_id_idx on public.routine_items (routine_id);

alter table public.routine_items enable row level security;

-- Owner of the parent routine may manage items; song rows must belong to the same user.
create policy "routine_items_select_own"
    on public.routine_items for select
    to authenticated
    using (
        exists (
            select 1
            from public.routines r
            where r.id = routine_items.routine_id
              and r.user_id = auth.uid()
        )
    );

create policy "routine_items_insert_own"
    on public.routine_items for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.routines r
            where r.id = routine_items.routine_id
              and r.user_id = auth.uid()
        )
        and (
            (
                item_type = 'song'
                and song_id is not null
                and exists (
                    select 1
                    from public.songs s
                    where s.id = song_id
                      and s.user_id = auth.uid()
                )
            )
            or (item_type = 'exercise' and exercise_id is not null)
        )
    );

create policy "routine_items_update_own"
    on public.routine_items for update
    to authenticated
    using (
        exists (
            select 1
            from public.routines r
            where r.id = routine_items.routine_id
              and r.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.routines r
            where r.id = routine_items.routine_id
              and r.user_id = auth.uid()
        )
        and (
            (
                item_type = 'song'
                and song_id is not null
                and exists (
                    select 1
                    from public.songs s
                    where s.id = song_id
                      and s.user_id = auth.uid()
                )
            )
            or (item_type = 'exercise' and exercise_id is not null)
        )
    );

create policy "routine_items_delete_own"
    on public.routine_items for delete
    to authenticated
    using (
        exists (
            select 1
            from public.routines r
            where r.id = routine_items.routine_id
              and r.user_id = auth.uid()
        )
    );
