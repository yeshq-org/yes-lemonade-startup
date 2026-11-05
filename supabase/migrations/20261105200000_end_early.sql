-- End a game early: a season can finish before its last day.
-- finish_game (20261105180000) already closes only the caller's own in-progress game when its state is in the
-- 'career' phase, which an ended-early season is. Here it also checks the history is not longer than the season.
-- Scores record the days actually played (total_hours is 8 per day played, enforced by submit_score).
alter table public.scores
  add column if not exists days_played integer generated always as (total_hours / 8) stored;

create or replace function public.finish_game(p_game_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  played int := jsonb_array_length(coalesce(p_state->'history', '[]'::jsonb));
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if (p_state->>'phase') is distinct from 'career' then
    raise exception 'Only a finished season can be closed';
  end if;
  if played < 1 then raise exception 'Play at least one day before ending the game'; end if;
  update public.games
  set status = 'completed',
      state = p_state,
      writer_user_id = null,
      locked_day = null,
      completed_at = coalesce(completed_at, now())
  where id = p_game_id
    and status = 'in_progress'
    and played <= season_days
    and (user_id = auth.uid() or writer_user_id = auth.uid());
end;
$$;

revoke all on function public.finish_game(uuid, jsonb) from public;
grant execute on function public.finish_game(uuid, jsonb) to authenticated;
