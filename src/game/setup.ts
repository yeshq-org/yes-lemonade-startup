import { STARTING_CASH_CENTS, STARTING_POPULARITY } from './constants'
import { emptyInventory } from './inventory'
import { mulberry32 } from './rng'
import type { GameMode, GameState, Keeper, Recipe, SeasonLength } from './types'
import { rollPrices, rollWeather } from './weather'

export const DEFAULT_RECIPE: Recipe = {
  lemons: 4,
  sugar: 4,
  ice: 4,
  priceCents: 150,
}

export interface RunMeta {
  mode: GameMode
  scoringVersion: number
  competitionId: string
  gameId: string
  teamId: string | null
}

export function createGame(
  seasonDays: SeasonLength,
  seed: number,
  keeper: Keeper = 'girl',
  meta: RunMeta | null = null,
): GameState {
  const rng = mulberry32(seed)
  const forecast = []
  const priceBook = []
  for (let i = 0; i < seasonDays; i += 1) {
    forecast.push(rollWeather(rng))
    priceBook.push(rollPrices(rng))
  }
  return {
    version: 1,
    seed,
    seasonDays,
    day: 1,
    phase: 'morning',
    cashCents: STARTING_CASH_CENTS,
    popularity: STARTING_POPULARITY,
    inventory: emptyInventory(),
    forecast,
    priceBook,
    history: [],
    cart: [],
    recipe: { ...DEFAULT_RECIPE },
    hours: 8,
    keeper,
    pending: null,
    shelf: null,
    arrivals: null,
    reflections: ['', '', ''],
    mode: meta?.mode ?? null,
    scoringVersion: meta?.scoringVersion ?? null,
    competitionId: meta?.competitionId ?? null,
    gameId: meta?.gameId ?? null,
    teamId: meta?.teamId ?? null,
  }
}
