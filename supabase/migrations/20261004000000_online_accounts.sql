-- Merge Cocina: cuentas, progreso sincronizado, perfiles públicos y amistades.
-- Ejecuta este archivo una sola vez desde Supabase > SQL Editor.
create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  current_level smallint not null default 1 check (current_level between 1 and 999),
  orders_completed smallint not null default 0 check (orders_completed between 0 and 200),
  orders_total smallint not null default 0 check (orders_total between 0 and 200),
  important_achievements text[] not null default '{}',
  coins bigint not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_profiles_nickname_format check (nickname ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists player_profiles_nickname_lower_unique
  on public.player_profiles (lower(nickname));

create table if not exists public.player_game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb check (jsonb_typeof(save_data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint player_friendships_no_self check (requester_id <> recipient_id)
);

create unique index if not exists player_friendships_pair_unique
  on public.player_friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create table if not exists public.player_game_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists public.player_weekly_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  delivered_orders integer not null default 0 check (delivered_orders >= 0),
  primary key (user_id, week_start)
);
create index if not exists player_friendships_requester_idx on public.player_friendships (requester_id, status);
create index if not exists player_friendships_recipient_idx on public.player_friendships (recipient_id, status);

alter table public.player_profiles enable row level security;
alter table public.player_game_saves enable row level security;
alter table public.player_friendships enable row level security;
alter table public.player_game_events enable row level security;
alter table public.player_weekly_scores enable row level security;

drop policy if exists "Authenticated players can view public profiles" on public.player_profiles;
create policy "Authenticated players can view public profiles"
  on public.player_profiles for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "Players can create their own public profile" on public.player_profiles;
create policy "Players can create their own public profile"
  on public.player_profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Players can update their own public profile" on public.player_profiles;
create policy "Players can update their own public profile"
  on public.player_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Players can read their own private save" on public.player_game_saves;
create policy "Players can read their own private save"
  on public.player_game_saves for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Players can create their own private save" on public.player_game_saves;
create policy "Players can create their own private save"
  on public.player_game_saves for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Players can update their own private save" on public.player_game_saves;
create policy "Players can update their own private save"
  on public.player_game_saves for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Players can view their own friend requests" on public.player_friendships;
create policy "Players can view their own friend requests"
  on public.player_friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Players can send their own friend requests" on public.player_friendships;
create policy "Players can send their own friend requests"
  on public.player_friendships for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending' and requester_id <> recipient_id);

drop policy if exists "Players can remove their own friendships" on public.player_friendships;
create policy "Players can remove their own friendships"
  on public.player_friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

revoke all on table public.player_profiles, public.player_game_saves, public.player_friendships from public, anon, authenticated;
grant select on table public.player_profiles to authenticated;
grant select on table public.player_game_saves to authenticated;
grant select, insert, delete on table public.player_friendships to authenticated;
revoke all on table public.player_game_events, public.player_weekly_scores from public, anon, authenticated;

create or replace function public.create_player_profile(p_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'The nickname must contain 3 to 20 letters, numbers, or underscores' using errcode = '22023';
  end if;

  insert into public.player_profiles (user_id, nickname)
  values (auth.uid(), btrim(p_nickname))
  on conflict (user_id) do update
    set nickname = excluded.nickname,
        updated_at = now();
end;
$$;

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
declare
  caller_id uuid := auth.uid();
  event_value jsonb;
  event_uuid uuid;
  event_rows integer;
begin
  if caller_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_save_data is null or jsonb_typeof(p_save_data) <> 'object' then
    raise exception 'Invalid game save' using errcode = '22023';
  end if;
  if p_current_level is null or p_current_level < 1 or p_current_level > 999
     or p_orders_completed is null or p_orders_completed < 0 or p_orders_completed > 200
     or p_orders_total is null or p_orders_total < 0 or p_orders_total > 200
     or p_coins is null or p_coins < 0 then
    raise exception 'Invalid public progress' using errcode = '22023';
  end if;

  update public.player_profiles
    set current_level = p_current_level::smallint,
        orders_completed = p_orders_completed::smallint,
        orders_total = p_orders_total::smallint,
        important_achievements = coalesce(p_important_achievements, '{}'),
        coins = p_coins,
        updated_at = now()
    where user_id = caller_id;

  if not found then
    raise exception 'Create your player profile before saving progress' using errcode = 'P0002';
  end if;

  insert into public.player_game_saves (user_id, save_data, updated_at)
  values (caller_id, p_save_data, now())
  on conflict (user_id) do update
    set save_data = excluded.save_data,
        updated_at = now();

  if p_order_events is not null and jsonb_typeof(p_order_events) <> 'array' then
    raise exception 'Invalid order events' using errcode = '22023';
  end if;
  if coalesce(jsonb_array_length(p_order_events), 0) > 5000 then
    raise exception 'Too many pending order events' using errcode = '22023';
  end if;

  for event_value in
    select item.value from jsonb_array_elements(coalesce(p_order_events, '[]'::jsonb)) as item(value)
  loop
    begin
      event_uuid := (event_value->>'id')::uuid;
    exception when others then
      raise exception 'Invalid order event id' using errcode = '22023';
    end;
    insert into public.player_game_events (user_id, event_id)
    values (caller_id, event_uuid)
    on conflict (user_id, event_id) do nothing;
    get diagnostics event_rows = row_count;
    if event_rows > 0 then
      insert into public.player_weekly_scores as current_score (user_id, week_start, delivered_orders)
      values (caller_id, date_trunc('week', now())::date, 1)
      on conflict (user_id, week_start) do update
        set delivered_orders = current_score.delivered_orders + 1;
    end if;
  end loop;
end;
$$;

create or replace function public.search_players(p_query text)
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  friendship_id uuid,
  friendship_status text
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
    select p.user_id, p.nickname, p.current_level::integer,
      p.orders_completed::integer, p.orders_total::integer,
      p.important_achievements, p.coins, f.id, f.status
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
    order by p.current_level desc, p.orders_completed desc, p.coins desc
    limit 20;
end;
$$;

create or replace function public.get_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins
  from public.player_profiles as p
  where auth.uid() is not null
  order by p.current_level desc, p.orders_completed desc, p.coins desc
  limit 50;
$$;

create or replace function public.get_weekly_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  current_level integer,
  orders_completed integer,
  orders_total integer,
  important_achievements text[],
  coins bigint,
  weekly_orders integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins, coalesce(w.delivered_orders, 0)::integer
  from public.player_profiles as p
  left join public.player_weekly_scores as w
    on w.user_id = p.user_id and w.week_start = date_trunc('week', now())::date
  where auth.uid() is not null
  order by coalesce(w.delivered_orders, 0) desc,
    p.current_level desc, p.orders_completed desc, p.coins desc
  limit 50;
$$;

create or replace function public.get_my_friendships()
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
  coins bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.requester_id, f.recipient_id, f.status, f.created_at,
    p.user_id, p.nickname, p.current_level::integer,
    p.orders_completed::integer, p.orders_total::integer,
    p.important_achievements, p.coins
  from public.player_friendships as f
  join public.player_profiles as p
    on p.user_id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() is not null
    and (f.requester_id = auth.uid() or f.recipient_id = auth.uid())
  order by f.created_at desc;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  update public.player_friendships
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_request_id
      and recipient_id = auth.uid()
      and status = 'pending';
  if not found then
    raise exception 'This friend request is no longer available' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.create_player_profile(text) from public, anon;
revoke all on function public.save_player_state(jsonb, integer, integer, integer, text[], bigint, jsonb) from public, anon;
revoke all on function public.search_players(text) from public, anon;
revoke all on function public.get_leaderboard() from public, anon;
revoke all on function public.get_weekly_leaderboard() from public, anon;
revoke all on function public.get_my_friendships() from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.create_player_profile(text) to authenticated;
grant execute on function public.save_player_state(jsonb, integer, integer, integer, text[], bigint, jsonb) to authenticated;
grant execute on function public.search_players(text) to authenticated;
grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.get_weekly_leaderboard() to authenticated;
grant execute on function public.get_my_friendships() to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
