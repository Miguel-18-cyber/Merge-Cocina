-- Merge Cocina: bloquea estadísticas públicas enviadas directamente por el navegador.
-- Ejecutar después de 20261004000000_online_accounts.sql.
-- El cliente solo puede sincronizar su guardado privado. Un servidor de confianza
-- debe validar la partida antes de publicar monedas, niveles o pedidos.
begin;

alter table public.player_profiles
  add column if not exists progress_verified boolean not null default false;

-- Los valores históricos del cliente no se consideran puntuaciones verificadas.
update public.player_profiles
  set progress_verified = false;

-- El perfil propio se consulta por RPC; la tabla solo expone los campos públicos mínimos.
revoke all on table public.player_profiles from public, anon, authenticated;
grant select (user_id, nickname, progress_verified)
  on table public.player_profiles to authenticated;

create or replace function public.save_private_game_state(p_save_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_save_data is null or jsonb_typeof(p_save_data) <> 'object'
     or octet_length(p_save_data::text) > 1500000 then
    raise exception 'Invalid or oversized private game save' using errcode = '22023';
  end if;

  insert into public.player_game_saves (user_id, save_data, updated_at)
  values (caller_id, p_save_data, now())
  on conflict (user_id) do update
    set save_data = excluded.save_data,
        updated_at = excluded.updated_at;
end;
$$;

-- Compatibilidad con clientes antiguos: ignora estadísticas y eventos que el
-- navegador envíe; únicamente conserva el guardado privado del propietario.
create or replace function public.save_player_state(
  p_save_data jsonb,
  p_current_level integer,
  p_orders_completed integer,
  p_orders_total integer,
  p_important_achievements text[],
  p_coins bigint,
  p_order_events jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.save_private_game_state(p_save_data);
end;
$$;

create or replace function public.get_my_player_profile()
returns table (
  user_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  progress_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins, p.progress_verified
  from public.player_profiles as p
  where p.user_id = auth.uid();
$$;

drop function if exists public.search_players(text);
create function public.search_players(p_query text)
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  friendship_id uuid,
  friendship_status text,
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
  if auth.uid() is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if search_text !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Enter at least 3 letters, numbers, or underscores to search' using errcode = '22023';
  end if;

  return query
    select p.user_id, p.nickname,
      case when p.progress_verified then p.current_level::integer else null end,
      case when p.progress_verified then p.orders_completed::integer else null end,
      case when p.progress_verified then p.orders_total::integer else null end,
      case when p.progress_verified then p.important_achievements else null end,
      case when p.progress_verified then p.coins else null::bigint end,
      f.id, f.status, p.progress_verified
    from public.player_profiles as p
    left join lateral (
      select relation.id, relation.status
      from public.player_friendships as relation
      where (relation.requester_id = auth.uid() and relation.recipient_id = p.user_id)
         or (relation.recipient_id = auth.uid() and relation.requester_id = p.user_id)
      limit 1
    ) as f on true
    where p.user_id <> auth.uid()
      and lower(p.nickname) like lower(search_text) || '%'
    order by p.progress_verified desc, p.current_level desc, p.orders_completed desc
    limit 20;
end;
$$;

drop function if exists public.get_leaderboard();
create function public.get_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  progress_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins, p.progress_verified
  from public.player_profiles as p
  where auth.uid() is not null
    and p.progress_verified
  order by p.current_level desc, p.orders_completed desc, p.coins desc
  limit 50;
$$;

drop function if exists public.get_weekly_leaderboard();
create function public.get_weekly_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  weekly_orders integer,
  progress_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins, coalesce(w.delivered_orders, 0)::integer, p.progress_verified
  from public.player_profiles as p
  left join public.player_weekly_scores as w
    on w.user_id = p.user_id and w.week_start = date_trunc('week', now())::date
  where auth.uid() is not null
    and p.progress_verified
  order by coalesce(w.delivered_orders, 0) desc,
    p.current_level desc, p.orders_completed desc, p.coins desc
  limit 50;
$$;

drop function if exists public.get_my_friendships();
create function public.get_my_friendships()
returns table (
  friendship_id uuid,
  requester_id uuid,
  recipient_id uuid,
  status text,
  created_at timestamptz,
  other_user_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  progress_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.requester_id, f.recipient_id, f.status, f.created_at,
    p.user_id, p.nickname,
    case when p.progress_verified then p.current_level::integer else null end,
    case when p.progress_verified then p.orders_completed::integer else null end,
    case when p.progress_verified then p.orders_total::integer else null end,
    case when p.progress_verified then p.important_achievements else null end,
    case when p.progress_verified then p.coins else null::bigint end,
    p.progress_verified
  from public.player_friendships as f
  join public.player_profiles as p
    on p.user_id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() is not null
    and (f.requester_id = auth.uid() or f.recipient_id = auth.uid())
  order by f.created_at desc;
$$;

-- Cada llamada representa un pedido validado por el servidor. El UUID idempotente
-- evita que reintentar la misma operación sume puntos semanales más de una vez.
create or replace function public.record_verified_order(
  p_user_id uuid,
  p_event_id uuid,
  p_current_level integer,
  p_orders_completed integer,
  p_orders_total integer,
  p_important_achievements text[],
  p_coins bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Verified progress can only be written by the trusted server' using errcode = '42501';
  end if;
  if p_user_id is null or p_event_id is null
     or p_current_level is null or p_current_level < 1 or p_current_level > 999
     or p_orders_completed is null or p_orders_completed < 0 or p_orders_completed > 200
     or p_orders_total is null or p_orders_total < p_orders_completed or p_orders_total > 200
     or p_coins is null or p_coins < 0 then
    raise exception 'Invalid verified progress' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_important_achievements, '{}'::text[])) as items(achievement_id)
    where achievement_id is null or achievement_id not in ('primer-pedido', 'ruta-de-sabores', 'gran-banquete', 'cocina-legendaria', 'tesoro-de-cocina')
  ) then
    raise exception 'Invalid public achievement' using errcode = '22023';
  end if;

  insert into public.player_game_events (user_id, event_id)
  values (p_user_id, p_event_id)
  on conflict (user_id, event_id) do nothing;
  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 then
    return false;
  end if;

  update public.player_profiles
    set current_level = p_current_level::smallint,
        orders_completed = p_orders_completed::smallint,
        orders_total = p_orders_total::smallint,
        important_achievements = coalesce(p_important_achievements, '{}'::text[]),
        coins = p_coins,
        progress_verified = true,
        updated_at = now()
    where user_id = p_user_id;
  if not found then
    raise exception 'Create the player profile before publishing progress' using errcode = 'P0002';
  end if;

  insert into public.player_weekly_scores as current_score (user_id, week_start, delivered_orders)
  values (p_user_id, date_trunc('week', now())::date, 1)
  on conflict (user_id, week_start) do update
    set delivered_orders = current_score.delivered_orders + 1;

  return true;
end;
$$;

revoke all on function public.save_private_game_state(jsonb) from public, anon;
revoke all on function public.save_player_state(jsonb, integer, integer, integer, text[], bigint, jsonb) from public, anon;
revoke all on function public.get_my_player_profile() from public, anon;
revoke all on function public.search_players(text) from public, anon;
revoke all on function public.get_leaderboard() from public, anon;
revoke all on function public.get_weekly_leaderboard() from public, anon;
revoke all on function public.get_my_friendships() from public, anon;
revoke all on function public.record_verified_order(uuid, uuid, integer, integer, integer, text[], bigint) from public, anon, authenticated;

grant execute on function public.save_private_game_state(jsonb) to authenticated;
grant execute on function public.save_player_state(jsonb, integer, integer, integer, text[], bigint, jsonb) to authenticated;
grant execute on function public.get_my_player_profile() to authenticated;
grant execute on function public.search_players(text) to authenticated;
grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.get_weekly_leaderboard() to authenticated;
grant execute on function public.get_my_friendships() to authenticated;
grant execute on function public.record_verified_order(uuid, uuid, integer, integer, integer, text[], bigint) to service_role;

commit;
