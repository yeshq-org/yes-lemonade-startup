import { DAY_HOURS } from './constants'
import type { Arrival, DayShelf, GameState, Inventory, Keeper, Lot, SeasonLength } from './types'

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

export function normalizeSave(value: unknown): GameState | null {
  if (!isGameState(value)) return null
  const keeper: Keeper = value.keeper === 'guy' ? 'guy' : 'girl'
  return {
    ...value,
    hours: DAY_HOURS,
    keeper,
    inventory: stampPurchaseDay(value.inventory, value.day),
    shelf: normalizeShelf(value.shelf, value.day),
    arrivals: normalizeArrivals(value.arrivals),
    history: value.history.map((day) => ({
      ...day,
      spoilLemonsQty: day.spoilLemonsQty ?? 0,
      spoilLemonsCents: day.spoilLemonsCents ?? 0,
      spoilSugarQty: day.spoilSugarQty ?? 0,
      spoilSugarCents: day.spoilSugarCents ?? 0,
    })),
  }
}

function normalizeShelf(value: DayShelf | null | undefined, day: number): DayShelf | null {
  if (!value || typeof value !== 'object' || typeof value.cashAfterFeesCents !== 'number' || !value.inventory) return null
  return { cashAfterFeesCents: value.cashAfterFeesCents, inventory: stampPurchaseDay(value.inventory, day) }
}

function normalizeArrivals(value: Arrival[] | null | undefined): Arrival[] | null {
  if (!Array.isArray(value)) return null
  const arrivals = value.filter(
    (row) =>
      !!row &&
      (row.kind === 'buy' || row.kind === 'pass' || row.kind === 'out') &&
      typeof row.take === 'number' &&
      typeof row.weight === 'number' &&
      typeof row.arrive === 'number',
  )
  return arrivals.length === value.length ? arrivals : null
}

function stampPurchaseDay(inv: Inventory, day: number): Inventory {
  const stamp = (lots: Lot[]): Lot[] => lots.map((lot) => ({ ...lot, boughtDay: typeof lot.boughtDay === 'number' ? lot.boughtDay : day }))
  return { cups: stamp(inv.cups), lemons: stamp(inv.lemons), sugar: stamp(inv.sugar), ice: stamp(inv.ice) }
}

export function loadGame(): GameState | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return normalizeSave(parsed)
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
