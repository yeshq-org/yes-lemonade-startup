-- Accounts, competitions, and leaderboards for Y.E.S. Lemonade Startup.
-- Leaderboard rank is net_cents descending. earnings_per_hour_cents is only a tie-breaker.
-- scoring_version 1 is the shipped 8-hour day: net profit / hours, stand fee $1.50, no helper.

create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'player' check (role in ('player', 'host', 'admin')),
  created_at timestamptz not null default now(),
  constraint users_display_name_unique unique (display_name),
  constraint users_display_name_len check (char_length(display_name) between 2 and 24),
  constraint users_display_name_public check (display_name !~ '@')
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  competition_name text not null,
  visibility text not null check (visibility in ('public', 'private')),
  mode text not null check (mode in ('individual_7', 'team_30')),
  join_code text unique,
  host_user_id uuid references public.users (id),
  status text not null default 'open' check (status in ('open', 'closed')),
  registration_open boolean not null default true,
  scoring_version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint competitions_name_len check (char_length(competition_name) between 2 and 48),
  constraint competitions_private_code check (
    (visibility = 'public' and join_code is null)
    or (visibility = 'private' and join_code ~ '^YES-[0-9]{4}$')
  )
);

insert into public.competitions (
  id, competition_name, visibility, mode, join_code, host_user_id, scoring_version
) values
  ('00000000-0000-4000-8000-000000000007', 'Public Individual', 'public', 'individual_7', null, null, 1),
  ('00000000-0000-4000-8000-000000000030', 'Public Team', 'public', 'team_30', null, null, 1);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  constraint teams_name_len check (char_length(name) between 2 and 32),
  unique (competition_id, name)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  role text not null default 'player' check (role in ('player', 'host')),
  joined_at timestamptz not null default now(),
  unique (user_id, competition_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id),
  team_id uuid references public.teams (id),
  competition_id uuid not null references public.competitions (id),
  mode text not null check (mode in ('individual_7', 'team_30')),
  scoring_version integer not null,
  season_days integer not null check (season_days in (7, 30)),
  seed bigint not null,
  keeper text not null check (keeper in ('guy', 'girl')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  writer_user_id uuid references public.users (id),
  locked_day integer,
  state jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint games_mode_days check (
    (mode = 'individual_7' and season_days = 7 and team_id is null)
    or (mode = 'team_30' and season_days = 30 and team_id is not null)
  )
);

create unique index games_one_individual_active
  on public.games (user_id, competition_id)
  where status = 'in_progress' and mode = 'individual_7';

create unique index games_one_team_active
  on public.games (team_id)
  where status = 'in_progress' and mode = 'team_30';

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games (id),
  competition_id uuid not null references public.competitions (id),
  mode text not null check (mode in ('individual_7', 'team_30')),
  scoring_version integer not null,
  display_name text not null,
  team_name text,
  revenue_cents integer not null,
  cogs_cents integer not null,
  gross_cents integer not null,
  other_cents integer not null,
  net_cents integer not null,
  total_hours integer not null,
  earnings_per_hour_cents integer,
  net_worth_cents integer not null,
  tier text not null check (tier in ('side', 'growing', 'scalable', 'boss')),
  submitted_at timestamptz not null default now()
);

comment on table public.scores is
  'Leaderboard rank is net_cents descending. earnings_per_hour_cents is only a tie-breaker.';

create index scores_by_net_profit
  on public.scores (competition_id, scoring_version, net_cents desc, earnings_per_hour_cents desc);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_member(p_competition uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where competition_id = p_competition and user_id = auth.uid()
  );
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger users_no_role_escalation
  before update on public.users
  for each row execute function public.prevent_role_escalation();

alter table public.users enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.games enable row level security;
alter table public.scores enable row level security;

alter table public.users force row level security;
alter table public.competitions force row level security;
alter table public.teams force row level security;
alter table public.memberships force row level security;
alter table public.games force row level security;
alter table public.scores force row level security;

create policy users_read_names on public.users
  for select to authenticated
  using (true);

create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid() and role = 'player');

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy competitions_read on public.competitions
  for select to authenticated
  using (
    visibility = 'public'
    or host_user_id = auth.uid()
    or public.is_member(id)
    or public.is_admin()
  );

create policy teams_read on public.teams
  for select to authenticated
  using (public.is_member(competition_id) or public.is_admin());

create policy memberships_read on public.memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_member(competition_id)
    or public.is_admin()
  );

create policy games_read on public.games
  for select to authenticated
  using (
    user_id = auth.uid()
    or writer_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.team_id = games.team_id
    )
    or exists (
      select 1 from public.competitions c
      where c.id = games.competition_id and c.host_user_id = auth.uid()
    )
  );

create policy scores_read on public.scores
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.competitions c
      where c.id = scores.competition_id
        and (c.visibility = 'public' or public.is_member(c.id) or c.host_user_id = auth.uid())
    )
  );

-- Direct writes go through the functions below so locks and codes stay consistent.
revoke all on public.users, public.competitions, public.teams, public.memberships, public.games, public.scores from anon;
grant select, insert, update on public.users to authenticated;
grant select on public.competitions, public.teams, public.memberships, public.games, public.scores to authenticated;

create or replace function public.create_private_competition(p_name text, p_mode text)
returns public.competitions
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  row public.competitions;
  tries int := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_mode not in ('individual_7', 'team_30') then raise exception 'Unknown mode'; end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 48 then
    raise exception 'Name the competition in 2 to 48 characters';
  end if;
  loop
    tries := tries + 1;
    code := 'YES-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.competitions where join_code = code);
    if tries > 30 then raise exception 'Could not assign a join code'; end if;
  end loop;
  insert into public.competitions (
    competition_name, visibility, mode, join_code, host_user_id, scoring_version
  ) values (
    trim(p_name), 'private', p_mode, code, auth.uid(), 1
  ) returning * into row;
  insert into public.memberships (user_id, competition_id, role)
  values (auth.uid(), row.id, 'host');
  return row;
end;
$$;

create or replace function public.join_by_code(p_code text)
returns public.competitions
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.competitions;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into row from public.competitions
  where join_code = upper(trim(p_code)) and visibility = 'private';
  if row.id is null then raise exception 'That code does not match a competition'; end if;
  if row.status <> 'open' or not row.registration_open then
    raise exception 'Registration is closed';
  end if;
  insert into public.memberships (user_id, competition_id, role)
  values (auth.uid(), row.id, 'player')
  on conflict (user_id, competition_id) do nothing;
  return row;
end;
$$;

create or replace function public.join_public(p_mode text)
returns public.competitions
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.competitions;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_mode not in ('individual_7', 'team_30') then raise exception 'Unknown mode'; end if;
  select * into row from public.competitions
  where visibility = 'public' and mode = p_mode
  limit 1;
  if row.id is null then raise exception 'Public competition is missing'; end if;
  insert into public.memberships (user_id, competition_id, role)
  values (auth.uid(), row.id, 'player')
  on conflict (user_id, competition_id) do nothing;
  return row;
end;
$$;

create or replace function public.create_team(p_competition_id uuid, p_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  comp public.competitions;
  row public.teams;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into comp from public.competitions where id = p_competition_id;
  if comp.id is null or comp.mode <> 'team_30' then raise exception 'Teams belong to a 30-day competition'; end if;
  if not public.is_member(p_competition_id) then raise exception 'Join the competition first'; end if;
  if comp.status <> 'open' or not comp.registration_open then raise exception 'Registration is closed'; end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 32 then
    raise exception 'Name the team in 2 to 32 characters';
  end if;
  insert into public.teams (competition_id, name, created_by)
  values (p_competition_id, trim(p_name), auth.uid())
  returning * into row;
  update public.memberships
  set team_id = row.id
  where user_id = auth.uid() and competition_id = p_competition_id;
  return row;
end;
$$;

create or replace function public.join_team(p_team_id uuid)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.teams;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into row from public.teams where id = p_team_id;
  if row.id is null then raise exception 'Team not found'; end if;
  if not public.is_member(row.competition_id) then raise exception 'Join the competition first'; end if;
  update public.memberships
  set team_id = row.id
  where user_id = auth.uid() and competition_id = row.competition_id;
  return row;
end;
$$;

create or replace function public.start_game(p_competition_id uuid, p_team_id uuid, p_state jsonb)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  comp public.competitions;
  days int;
  row public.games;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into comp from public.competitions where id = p_competition_id;
  if comp.id is null then raise exception 'Competition not found'; end if;
  if not public.is_member(p_competition_id) then raise exception 'Join this competition first'; end if;
  if comp.status <> 'open' or not comp.registration_open then raise exception 'Registration is closed'; end if;
  days := case when comp.mode = 'individual_7' then 7 else 30 end;
  if (p_state->>'seasonDays')::int is distinct from days then
    raise exception 'Season length does not match the mode';
  end if;
  if (p_state->>'mode') is distinct from comp.mode then
    raise exception 'Mode does not match the competition';
  end if;
  if (p_state->>'scoringVersion')::int is distinct from 1 then
    raise exception 'Scoring version must be 1';
  end if;
  if comp.mode = 'individual_7' then
    p_team_id := null;
  else
    if p_team_id is null then raise exception 'Pick a team'; end if;
    if not exists (
      select 1 from public.memberships
      where user_id = auth.uid() and competition_id = p_competition_id and team_id = p_team_id
    ) then
      raise exception 'Join this team first';
    end if;
  end if;
  if exists (
    select 1 from public.games g
    where g.status = 'in_progress'
      and (
        (comp.mode = 'individual_7' and g.user_id = auth.uid() and g.competition_id = p_competition_id)
        or (comp.mode = 'team_30' and g.team_id = p_team_id)
      )
  ) then
    raise exception 'A game is already in progress';
  end if;
  insert into public.games (
    user_id, team_id, competition_id, mode, scoring_version, season_days, seed, keeper,
    status, writer_user_id, locked_day, state
  ) values (
    auth.uid(), p_team_id, p_competition_id, comp.mode, 1, days,
    (p_state->>'seed')::bigint, p_state->>'keeper',
    'in_progress', auth.uid(), 1, p_state
  ) returning * into row;
  return row;
end;
$$;

create or replace function public.save_snapshot(p_game_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.games
  set state = p_state,
      locked_day = nullif(p_state->>'day', '')::int
  where id = p_game_id and writer_user_id = auth.uid() and status = 'in_progress';
  if not found then raise exception 'Only the current writer can save this day'; end if;
end;
$$;

create or replace function public.release_day(p_game_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.games
  set state = p_state, writer_user_id = null, locked_day = null
  where id = p_game_id and writer_user_id = auth.uid() and status = 'in_progress' and mode = 'team_30';
  if not found then raise exception 'This day is not yours to pass'; end if;
end;
$$;

create or replace function public.claim_day(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.games;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.games g
  set writer_user_id = auth.uid(),
      locked_day = nullif(g.state->>'day', '')::int
  where g.id = p_game_id
    and g.status = 'in_progress'
    and g.mode = 'team_30'
    and g.writer_user_id is null
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.team_id = g.team_id
    )
  returning * into row;
  if row.id is null then raise exception 'That day is already being played'; end if;
  return row;
end;
$$;

create or replace function public.submit_score(
  p_game_id uuid,
  p_state jsonb,
  p_display_name text,
  p_team_name text,
  p_revenue_cents integer,
  p_cogs_cents integer,
  p_gross_cents integer,
  p_other_cents integer,
  p_net_cents integer,
  p_total_hours integer,
  p_earnings_per_hour_cents integer,
  p_net_worth_cents integer,
  p_tier text
) returns public.scores
language plpgsql
security definer
set search_path = public
as $$
declare
  game public.games;
  existing public.scores;
  team_label text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into existing from public.scores where game_id = p_game_id;
  if existing.id is not null then return existing; end if;
  select * into game from public.games where id = p_game_id;
  if game.id is null then raise exception 'Game not found'; end if;
  if game.writer_user_id is distinct from auth.uid() and game.user_id is distinct from auth.uid() then
    raise exception 'Only the player who finished the season can post it';
  end if;
  if p_display_name is distinct from (select display_name from public.users where id = auth.uid()) then
    raise exception 'Public name must be your display name';
  end if;
  if p_gross_cents <> p_revenue_cents - p_cogs_cents then
    raise exception 'Gross profit does not match revenue minus cost of goods';
  end if;
  if p_net_cents <> p_gross_cents - p_other_cents then
    raise exception 'Net profit does not match gross profit minus other expenses';
  end if;
  if p_total_hours <> 8 * jsonb_array_length(coalesce(p_state->'history', '[]'::jsonb)) then
    raise exception 'Time invested must be 8 hours for each day played';
  end if;
  if p_tier not in ('side', 'growing', 'scalable', 'boss') then
    raise exception 'Unknown tier';
  end if;
  team_label := null;
  if game.mode = 'team_30' then
    select name into team_label from public.teams where id = game.team_id;
    if p_team_name is distinct from team_label then raise exception 'Team name mismatch'; end if;
  end if;
  update public.games
  set status = 'completed',
      state = p_state,
      writer_user_id = null,
      locked_day = null,
      completed_at = now(),
      scoring_version = 1
  where id = game.id;
  insert into public.scores (
    game_id, competition_id, mode, scoring_version, display_name, team_name,
    revenue_cents, cogs_cents, gross_cents, other_cents, net_cents, total_hours,
    earnings_per_hour_cents, net_worth_cents, tier
  ) values (
    game.id, game.competition_id, game.mode, 1, p_display_name, team_label,
    p_revenue_cents, p_cogs_cents, p_gross_cents, p_other_cents, p_net_cents, p_total_hours,
    p_earnings_per_hour_cents, p_net_worth_cents, p_tier
  ) returning * into existing;
  return existing;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.create_private_competition(text, text) from public, anon;
revoke all on function public.join_by_code(text) from public, anon;
revoke all on function public.join_public(text) from public, anon;
revoke all on function public.create_team(uuid, text) from public, anon;
revoke all on function public.join_team(uuid) from public, anon;
revoke all on function public.start_game(uuid, uuid, jsonb) from public, anon;
revoke all on function public.save_snapshot(uuid, jsonb) from public, anon;
revoke all on function public.release_day(uuid, jsonb) from public, anon;
revoke all on function public.claim_day(uuid) from public, anon;
revoke all on function public.submit_score(uuid, jsonb, text, text, integer, integer, integer, integer, integer, integer, integer, integer, text) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.create_private_competition(text, text) to authenticated;
grant execute on function public.join_by_code(text) to authenticated;
grant execute on function public.join_public(text) to authenticated;
grant execute on function public.create_team(uuid, text) to authenticated;
grant execute on function public.join_team(uuid) to authenticated;
grant execute on function public.start_game(uuid, uuid, jsonb) to authenticated;
grant execute on function public.save_snapshot(uuid, jsonb) to authenticated;
grant execute on function public.release_day(uuid, jsonb) to authenticated;
grant execute on function public.claim_day(uuid) to authenticated;
grant execute on function public.submit_score(uuid, jsonb, text, text, integer, integer, integer, integer, integer, integer, integer, integer, text) to authenticated;
