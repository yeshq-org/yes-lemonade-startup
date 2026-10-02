import { summarize } from '../game/scoring'
import type { GameMode, GameState } from '../game/types'
import { supabase } from '../lib/supabase'
import { normalizeJoinCode, SCORING_VERSION } from '../game/leaderboard'

export interface CompetitionRow {
  id: string
  competition_name: string
  visibility: 'public' | 'private'
  mode: GameMode
  join_code: string | null
  host_user_id: string | null
  scoring_version: number
  status: string
}

export interface TeamRow {
  id: string
  competition_id: string
  name: string
}

export interface GameRow {
  id: string
  user_id: string
  team_id: string | null
  competition_id: string
  mode: GameMode
  scoring_version: number
  status: 'in_progress' | 'completed' | 'abandoned'
  writer_user_id: string | null
  locked_day: number | null
  state: GameState
}

export interface ScoreRow {
  id: string
  display_name: string
  team_name: string | null
  net_cents: number
  earnings_per_hour_cents: number | null
  revenue_cents: number
  mode: GameMode
  scoring_version: number
  competition_id: string
}

function client() {
  if (!supabase) throw new Error('Accounts are not configured')
  return supabase
}

export function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Something went wrong. Try again.'
}

export async function createPrivateCompetition(name: string, mode: GameMode): Promise<CompetitionRow> {
  const { data, error } = await client().rpc('create_private_competition', { p_name: name, p_mode: mode })
  if (error) throw error
  return data as CompetitionRow
}

export async function joinByCode(raw: string): Promise<CompetitionRow> {
  const code = normalizeJoinCode(raw)
  if (!code) throw new Error('Enter a code like YES-4827')
  const { data, error } = await client().rpc('join_by_code', { p_code: code })
  if (error) throw error
  return data as CompetitionRow
}

export async function joinPublic(mode: GameMode): Promise<CompetitionRow> {
  const { data, error } = await client().rpc('join_public', { p_mode: mode })
  if (error) throw error
  return data as CompetitionRow
}

export async function createTeam(competitionId: string, name: string): Promise<TeamRow> {
  const { data, error } = await client().rpc('create_team', { p_competition_id: competitionId, p_name: name })
  if (error) throw error
  return data as TeamRow
}

export async function joinTeam(teamId: string): Promise<TeamRow> {
  const { data, error } = await client().rpc('join_team', { p_team_id: teamId })
  if (error) throw error
  return data as TeamRow
}

export async function listTeams(competitionId: string): Promise<TeamRow[]> {
  const { data, error } = await client().from('teams').select('id, competition_id, name').eq('competition_id', competitionId)
  if (error) throw error
  return (data ?? []) as TeamRow[]
}

export async function startGame(competitionId: string, teamId: string | null, state: GameState): Promise<GameRow> {
  const { data, error } = await client().rpc('start_game', {
    p_competition_id: competitionId,
    p_team_id: teamId,
    p_state: state,
  })
  if (error) throw error
  return data as GameRow
}

export async function saveSnapshot(gameId: string, state: GameState): Promise<void> {
  const { error } = await client().rpc('save_snapshot', { p_game_id: gameId, p_state: state })
  if (error) throw error
}

export async function releaseDay(gameId: string, state: GameState): Promise<void> {
  const { error } = await client().rpc('release_day', { p_game_id: gameId, p_state: state })
  if (error) throw error
}

export async function claimDay(gameId: string): Promise<GameRow> {
  const { data, error } = await client().rpc('claim_day', { p_game_id: gameId })
  if (error) throw error
  return data as GameRow
}

export async function listOpenGames(): Promise<GameRow[]> {
  const { data, error } = await client()
    .from('games')
    .select('id, user_id, team_id, competition_id, mode, scoring_version, status, writer_user_id, locked_day, state')
    .eq('status', 'in_progress')
  if (error) throw error
  return (data ?? []) as GameRow[]
}

export async function listMyPrivateCompetitions(): Promise<CompetitionRow[]> {
  const { data: memberships, error } = await client().from('memberships').select('competition_id')
  if (error) throw error
  const ids = (memberships ?? []).map((row) => row.competition_id as string)
  if (ids.length === 0) return []
  const { data, error: compError } = await client()
    .from('competitions')
    .select('id, competition_name, visibility, mode, join_code, host_user_id, scoring_version, status')
    .in('id', ids)
    .eq('visibility', 'private')
  if (compError) throw compError
  return (data ?? []) as CompetitionRow[]
}

export async function loadBoard(competitionId: string): Promise<ScoreRow[]> {
  const { data, error } = await client()
    .from('scores')
    .select('id, display_name, team_name, net_cents, earnings_per_hour_cents, revenue_cents, mode, scoring_version, competition_id')
    .eq('competition_id', competitionId)
    .eq('scoring_version', SCORING_VERSION)
  if (error) throw error
  return (data ?? []) as ScoreRow[]
}

export async function submitFinishedGame(state: GameState, displayName: string, teamName: string | null): Promise<void> {
  if (!state.gameId || !state.mode || state.scoringVersion !== SCORING_VERSION) return
  const summary = summarize(state)
  const { error } = await client().rpc('submit_score', {
    p_game_id: state.gameId,
    p_state: state,
    p_display_name: displayName,
    p_team_name: teamName,
    p_revenue_cents: summary.totalRevenueCents,
    p_cogs_cents: summary.totalCogsCents,
    p_gross_cents: summary.totalGrossCents,
    p_other_cents: summary.totalOtherCents,
    p_net_cents: summary.totalNetCents,
    p_total_hours: summary.totalHours,
    p_earnings_per_hour_cents: summary.earningsPerHourCents,
    p_net_worth_cents: summary.netWorthCents,
    p_tier: summary.tier,
  })
  if (error) throw error
}
