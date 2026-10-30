-- Unique usernames. Real/display names may repeat; usernames may not (case-insensitive).
-- Backward compatible: username is nullable, so a client that does not know about it keeps working.

alter table public.users add column if not exists username text;
alter table public.scores add column if not exists username text;

alter table public.users
  add constraint users_username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index if not exists users_username_lower_key on public.users (lower(username));

-- Two players may share a real name. Each score is tied to the player's account, not the name.
alter table public.users drop constraint if exists users_display_name_unique;

-- Insert for an id that already has a profile becomes an update of that player's own names.
-- A username that another player holds raises the unique violation (23505) back to the client.
create or replace function public.users_insert_as_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.users where id = new.id) then
    if new.id = auth.uid() then
      update public.users
      set display_name = new.display_name,
          username = coalesce(new.username, username)
      where id = new.id;
    end if;
    return null;
  end if;
  return new;
end;
$$;

-- Keep the public leaderboard label in step with the player's username.
create or replace function public.sync_score_usernames()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    update public.scores s
    set username = new.username
    from public.games g
    where g.id = s.game_id and g.user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists users_sync_score_usernames on public.users;
create trigger users_sync_score_usernames
  after update of username on public.users
  for each row execute function public.sync_score_usernames();

-- Usable before sign-up (no session yet) so the form can say "That username is taken" up front.
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from public.users where lower(username) = lower(p_username));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- submit_score keeps its signature. It now stamps the player's username on the score row.
create or replace function public.submit_score(
  p_game_id uuid, p_state jsonb, p_display_name text, p_team_name text,
  p_revenue_cents integer, p_cogs_cents integer, p_gross_cents integer, p_other_cents integer,
  p_net_cents integer, p_total_hours integer, p_earnings_per_hour_cents integer,
  p_net_worth_cents integer, p_tier text
)
returns public.scores
language plpgsql
security definer
set search_path = public
as $$
declare
  game public.games;
  existing public.scores;
  team_label text;
  who_name text;
  who_username text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into existing from public.scores where game_id = p_game_id;
  if existing.id is not null then return existing; end if;
  select * into game from public.games where id = p_game_id;
  if game.id is null then raise exception 'Game not found'; end if;
  if game.writer_user_id is distinct from auth.uid() and game.user_id is distinct from auth.uid() then
    raise exception 'Only the player who finished the season can post it';
  end if;
  select display_name, username into who_name, who_username from public.users where id = auth.uid();
  if p_display_name is distinct from who_name then
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
    game_id, competition_id, mode, scoring_version, display_name, username, team_name,
    revenue_cents, cogs_cents, gross_cents, other_cents, net_cents, total_hours,
    earnings_per_hour_cents, net_worth_cents, tier
  ) values (
    game.id, game.competition_id, game.mode, 1, p_display_name, who_username, team_label,
    p_revenue_cents, p_cogs_cents, p_gross_cents, p_other_cents, p_net_cents, p_total_hours,
    p_earnings_per_hour_cents, p_net_worth_cents, p_tier
  ) returning * into existing;
  return existing;
end;
$$;
