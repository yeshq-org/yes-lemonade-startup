import type { GameMode } from './types'

/** Bump this when receipt math changes. Stored on every new game and score. */
export const SCORING_VERSION = 1

export const PUBLIC_INDIVIDUAL_ID = '00000000-0000-4000-8000-000000000007'
export const PUBLIC_TEAM_ID = '00000000-0000-4000-8000-000000000030'

export function daysForMode(mode: GameMode): 7 | 30 {
  return mode === 'individual_7' ? 7 : 30
}

export function publicCompetitionId(mode: GameMode): string {
  return mode === 'individual_7' ? PUBLIC_INDIVIDUAL_ID : PUBLIC_TEAM_ID
}

/** Public label only. Email addresses are rejected so they cannot be used as a name. */
export function cleanDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 24) return null
  if (name.includes('@')) return null
  return name
}

/** Accepts YES-4827, yes4827, or 4827. */
export function normalizeJoinCode(raw: string): string | null {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = compact.match(/^(?:YES)?(\d{4})$/)
  if (!match?.[1]) return null
  return `YES-${match[1]}`
}

export interface RankedScore {
  netCents: number
  /** Tie-breaker only. Leaderboard order is net profit, highest first. */
  earningsPerHourCents: number | null
}

/**
 * Leaderboard rank is net profit (net_cents) descending.
 * Earnings per hour breaks a tie and never outranks a higher net profit.
 */
export function rankScores<T extends RankedScore>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.netCents !== b.netCents) return b.netCents - a.netCents
    return (b.earningsPerHourCents ?? Number.NEGATIVE_INFINITY) - (a.earningsPerHourCents ?? Number.NEGATIVE_INFINITY)
  })
}
