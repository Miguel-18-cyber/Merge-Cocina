-- Merge Cocina: panel administrativo y reinicios autorizados por el servidor.
-- Ejecutar después de 20261004000000 y 20261005000000.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table if not exists app_private.merge_cocina_admin_emails (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);
alter table app_private.merge_cocina_admin_emails enable row level security;
revoke all on table app_private.merge_cocina_admin_emails from public, anon, authenticated;

insert into app_private.merge_cocina_admin_emails (email)
values ('urbanoespanamiguelangel@gmail.com')
on conflict (email) do nothing;

alter table public.player_profiles
  add column if not exists progress_reset_token uuid;

create or replace function app_private.is_merge_cocina_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    join app_private.merge_cocina_admin_emails as allowed
      on allowed.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function app_private.is_merge_cocina_admin() from public, anon, authenticated;

create or replace function public.is_merge_cocina_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_merge_cocina_admin();
$$;

create or replace function public.admin_search_players(p_query text)
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  coins bigint,
  progress_verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  search_text text := btrim(coalesce(p_query, ''));
begin
  if (select auth.uid()) is null or not app_private.is_merge_cocina_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if search_text !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Enter at least 3 letters, numbers, or underscores' using errcode = '22023';
  end if;

  return query
    select p.user_id, p.nickname, p.current_level::integer, p.coins, p.progress_verified
    from public.player_profiles as p
    where strpos(lower(p.nickname), lower(search_text)) > 0
    order by lower(p.nickname)
    limit 25;
end;
$$;

create or replace function public.admin_reset_player_progress(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_nickname text;
  previous_save jsonb;
  reset_token uuid := gen_random_uuid();
  best_score bigint := 0;
begin
  if caller_id is null or not app_private.is_merge_cocina_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_player_id is null then
    raise exception 'Select a player to reset' using errcode = '22023';
  end if;

  select p.nickname into target_nickname
  from public.player_profiles as p
  where p.user_id = p_player_id
  for update;
  if not found then
    raise exception 'Player profile was not found' using errcode = 'P0002';
  end if;

  select s.save_data into previous_save
  from public.player_game_saves as s
  where s.user_id = p_player_id
  for update;

  if (previous_save #>> '{game,mejorPuntuacion}') ~ '^[0-9]{1,10}$' then
    best_score := least((previous_save #>> '{game,mejorPuntuacion}')::bigint, 2147483647);
  end if;

  update public.player_profiles
    set current_level = 1,
        orders_completed = 0,
        orders_total = 0,
        important_achievements = '{}'::text[],
        coins = 0,
        progress_verified = false,
        progress_reset_token = reset_token,
        updated_at = now()
    where user_id = p_player_id;

  delete from public.player_weekly_scores where user_id = p_player_id;
  delete from public.player_game_events where user_id = p_player_id;

  insert into public.player_game_saves (user_id, save_data, updated_at)
  values (
    p_player_id,
    jsonb_build_object(
      '__adminReset', true,
      '__adminResetToken', reset_token::text,
      'mejorPuntuacion', best_score,
      'profile', coalesce(previous_save->'profile', 'null'::jsonb),
      'cosmetics', coalesce(previous_save->'cosmetics', 'null'::jsonb)
    ),
    now()
  )
  on conflict (user_id) do update
    set save_data = excluded.save_data,
        updated_at = excluded.updated_at;

  return jsonb_build_object('nickname', target_nickname, 'reset', true);
end;
$$;

-- A stale browser tab cannot overwrite an administrator reset. The account must
-- first load the server's reset token and save a fresh game state with it.
create or replace function public.save_private_game_state(p_save_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  active_reset_token uuid;
begin
  if caller_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_save_data is null or jsonb_typeof(p_save_data) <> 'object'
     or octet_length(p_save_data::text) > 1500000 then
    raise exception 'Invalid or oversized private game save' using errcode = '22023';
  end if;

  select p.progress_reset_token into active_reset_token
  from public.player_profiles as p
  where p.user_id = caller_id
  for update;
  if not found then
    raise exception 'Create your player profile before saving progress' using errcode = 'P0002';
  end if;
  if p_save_data->>'__adminResetToken' is distinct from active_reset_token::text then
    raise exception 'Your progress was reset by an administrator. Reload the game to sync the reset.' using errcode = '55000';
  end if;

  insert into public.player_game_saves (user_id, save_data, updated_at)
  values (caller_id, p_save_data, now())
  on conflict (user_id) do update
    set save_data = excluded.save_data,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.is_merge_cocina_admin() from public, anon;
revoke all on function public.admin_search_players(text) from public, anon, authenticated;
revoke all on function public.admin_reset_player_progress(uuid) from public, anon, authenticated;
revoke all on function public.save_private_game_state(jsonb) from public, anon;

grant execute on function public.is_merge_cocina_admin() to authenticated;
grant execute on function public.admin_search_players(text) to authenticated;
grant execute on function public.admin_reset_player_progress(uuid) to authenticated;
grant execute on function public.save_private_game_state(jsonb) to authenticated;

commit;
