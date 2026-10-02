import { describe, expect, it } from 'vitest'
import { createGame } from './setup'
import { normalizeSave } from './storage'
import { cleanDisplayName, daysForMode, normalizeJoinCode, rankScores, SCORING_VERSION } from './leaderboard'

describe('leaderboard rank', () => {
  it('orders by net profit, then earnings per hour', () => {
    const ranked = rankScores([
      { name: 'low-net-high-hour', netCents: 100, earningsPerHourCents: 900 },
      { name: 'high-net-low-hour', netCents: 500, earningsPerHourCents: 10 },
      { name: 'same-net-better-hour', netCents: 500, earningsPerHourCents: 40 },
      { name: 'same-net-missing-hour', netCents: 500, earningsPerHourCents: null },
    ])
    expect(ranked.map((row) => row.name)).toEqual([
      'same-net-better-hour',
      'high-net-low-hour',
      'same-net-missing-hour',
      'low-net-high-hour',
    ])
  })
})

describe('display names', () => {
  it('keeps a public name and rejects an email', () => {
    expect(cleanDisplayName('  Alex  P ')).toBe('Alex P')
    expect(cleanDisplayName('a')).toBeNull()
    expect(cleanDisplayName('alex@school.edu')).toBeNull()
  })
})

describe('join codes', () => {
  it('normalizes a four-digit stand code', () => {
    expect(normalizeJoinCode('yes-4827')).toBe('YES-4827')
    expect(normalizeJoinCode('4827')).toBe('YES-4827')
    expect(normalizeJoinCode('YES 4827')).toBe('YES-4827')
    expect(normalizeJoinCode('12')).toBeNull()
    expect(normalizeJoinCode('YES-48270')).toBeNull()
  })
})

describe('modes', () => {
  it('maps individual to 7 days and team to 30', () => {
    expect(daysForMode('individual_7')).toBe(7)
    expect(daysForMode('team_30')).toBe(30)
    expect(SCORING_VERSION).toBe(1)
  })

  it('keeps a saved 14-day season local and unposted', () => {
    const legacy = createGame(14, 5)
    const saved = { ...legacy, mode: undefined, scoringVersion: undefined, competitionId: undefined, gameId: undefined, teamId: undefined }
    const loaded = normalizeSave(saved)
    expect(loaded?.seasonDays).toBe(14)
    expect(loaded?.mode).toBeNull()
    expect(loaded?.gameId).toBeNull()
    expect(loaded?.scoringVersion).toBeNull()
  })

  it('keeps mode and scoring version on a logged-in run', () => {
    const run = createGame(7, 3, 'guy', {
      mode: 'individual_7',
      scoringVersion: 1,
      competitionId: '00000000-0000-4000-8000-000000000007',
      gameId: 'game-1',
      teamId: null,
    })
    const loaded = normalizeSave(run)
    expect(loaded?.mode).toBe('individual_7')
    expect(loaded?.scoringVersion).toBe(1)
    expect(loaded?.gameId).toBe('game-1')
    expect(loaded?.keeper).toBe('guy')
    expect(loaded?.hours).toBe(8)
  })
})
