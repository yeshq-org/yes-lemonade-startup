export type Heat = 'hot' | 'warm' | 'cool' | 'cold'
export type Sky = 'clear' | 'cloudy' | 'rain'
export type ItemId = 'cups' | 'lemons' | 'sugar' | 'ice'
export type SeasonLength = 7 | 14 | 30
export type Phase = 'morning' | 'shop' | 'recipe' | 'selling' | 'report' | 'career'
export type Hours = 0 | 4 | 6 | 8 | 10 | 12

export interface Weather {
  heat: Heat
  sky: Sky
  tempF: number
}

/** Remaining FIFO lot. qty is cups, ice cubes, or twelfths of a lemon/sugar cup. */
export interface Lot {
  qty: number
  costCents: number
}

export interface Inventory {
  cups: Lot[]
  lemons: Lot[]
  sugar: Lot[]
  ice: Lot[]
}

export interface Recipe {
  /** Lemons mixed into one pitcher. A pitcher yields 12 cups. */
  lemons: number
  /** Cups of sugar mixed into one pitcher. */
  sugar: number
  /** Ice cubes dropped into each cup. */
  ice: number
  priceCents: number
}

export interface DayPrices {
  cups: [number, number, number]
  lemons: [number, number, number]
  sugar: [number, number, number]
  ice: [number, number, number]
}

export interface CartLine {
  item: ItemId
  packIndex: number
  packs: number
}

export interface DayResult {
  day: number
  weather: Weather
  recipe: Recipe
  hours: Hours
  potential: number
  willing: number
  sold: number
  walkedAway: number
  soldOutMissed: number
  revenueCents: number
  cogsCents: number
  grossCents: number
  standFeeCents: number
  helperCents: number
  otherCents: number
  netCents: number
  earningsPerHourCents: number | null
  satisfaction: number | null
  taste: number
  iceComfort: number
  popularityBefore: number
  popularityAfter: number
  iceMeltQty: number
  iceMeltCents: number
  fairPriceCents: number
  cupsReady: number
  /** Raw on-hand quantities after sales, before ice melts. */
  onHand: Record<ItemId, number>
  suppliesValueCents: number
}

export interface GameState {
  version: 1
  seed: number
  seasonDays: SeasonLength
  day: number
  phase: Phase
  cashCents: number
  popularity: number
  inventory: Inventory
  forecast: Weather[]
  priceBook: DayPrices[]
  history: DayResult[]
  cart: CartLine[]
  recipe: Recipe
  hours: Hours
  pending: DayResult | null
  reflections: [string, string, string]
}

export const ITEM_IDS: ItemId[] = ['cups', 'lemons', 'sugar', 'ice']
export const HOUR_CHOICES: Hours[] = [0, 4, 6, 8, 10, 12]
