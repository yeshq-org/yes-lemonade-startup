import { STARTING_CASH_CENTS, STARTING_POPULARITY } from './constants'
import { emptyInventory } from './inventory'
import { mulberry32 } from './rng'
import type { GameState, Keeper, Recipe, SeasonLength } from './types'
import { rollPrices, rollWeather } from './weather'

export const DEFAULT_RECIPE: Recipe = {
  lemons: 4,
  sugar: 4,
  ice: 4,
  priceCents: 150,
}

export function createGame(seasonDays: SeasonLength, seed: number, keeper: Keeper = 'girl'): GameState {
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
    reflections: ['', '', ''],
  }
}
