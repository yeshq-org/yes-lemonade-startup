import type { GameState, SeasonLength } from './types'

export const SAVE_KEY = 'yes-lemonade-startup-v1'

const SEASONS: SeasonLength[] = [7, 14, 30]
const PHASES: GameState['phase'][] = ['morning', 'shop', 'recipe', 'selling', 'report', 'career']

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const game = value as GameState
  return (
    game.version === 1 &&
    SEASONS.includes(game.seasonDays) &&
    PHASES.includes(game.phase) &&
    typeof game.seed === 'number' &&
    Array.isArray(game.forecast) &&
    Array.isArray(game.history) &&
    game.forecast.length === game.seasonDays
  )
}

export function loadGame(): GameState | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isGameState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveGame(state: GameState | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (!state) {
      localStorage.removeItem(SAVE_KEY)
      return
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Private mode and full disks should not crash the stand.
  }
}
