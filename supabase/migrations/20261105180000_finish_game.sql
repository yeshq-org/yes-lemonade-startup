-- Posting to the leaderboard is now the player's choice.
-- finish_game closes a season (so a new one can start and it is kept in the player's own games)
-- without creating a leaderboard score. submit_score still posts it later if the player taps "Post my results".
create or replace function public.finish_game(p_game_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if (p_state->>'phase') is distinct from 'career' then
    raise exception 'Only a finished season can be closed';
  end if;
  update public.games
  set status = 'completed',
      state = p_state,
      writer_user_id = null,
      locked_day = null,
      completed_at = coalesce(completed_at, now())
  where id = p_game_id
    and status = 'in_progress'
    and (user_id = auth.uid() or writer_user_id = auth.uid());
  -- Already closed (or posted) is fine: nothing to do.
end;
$$;

revoke all on function public.finish_game(uuid, jsonb) from public;
grant execute on function public.finish_game(uuid, jsonb) to authenticated;
