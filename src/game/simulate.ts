import {
  buyRate,
  dayFees,
  expectedVisitors,
  fairPriceCents,
  iceComfort,
  nextPopularity,
  satisfactionScore,
  tasteScore,
} from './demand'
import { cloneInventory, consume, cupsFromInventory, inventoryValueCents, onHandRaw } from './inventory'
import { roundHalfAway } from './money'
import { mulberry32 } from './rng'
import type { DayResult, Hours, Inventory, Recipe, Weather } from './types'

/**
 * One open day at the stand.
 *
 * Buying supplies already took cash. Cost of goods is only the FIFO cost basis
 * of what today's cups actually used. The stand fee and helper leave cash when
 * the day runs. Leftover ice is still an asset until the caller melts it overnight;
 * that waste is not operating profit.
 */
export function simulateDay(input: {
  day: number
  seed: number
  weather: Weather
  inventory: Inventory
  recipe: Recipe
  hours: Hours
  popularity: number
  previousSatisfaction: number | null
}): { result: DayResult; inventory: Inventory; cashDeltaCents: number; popularity: number } {
  const { recipe, weather, hours } = input
  const taste = tasteScore(recipe.lemons, recipe.sugar)
  const comfort = iceComfort(recipe.ice, weather.heat)
  const fair = fairPriceCents(weather, taste, comfort)
  const rate = buyRate(recipe.priceCents, fair, taste)
  const rng = mulberry32((input.seed ^ Math.imul(input.day, 0x9e3779b1)) >>> 0)
  const variance = 0.9 + rng() * 0.2
  const expected = expectedVisitors(weather, hours, input.popularity)
  const potential = hours <= 0 ? 0 : Math.max(0, Math.round(expected * variance))
  const willing = potential === 0 ? 0 : Math.min(potential, Math.round(potential * rate))
  const cupsReady = cupsFromInventory(input.inventory, recipe)
  const sold = Math.min(willing, cupsReady)
  const walkedAway = potential - willing
  const soldOutMissed = willing - sold

  let inventory = cloneInventory(input.inventory)
  let cogsCents = 0
  if (sold > 0) {
    const cups = consume(inventory.cups, sold)
    const lemons = consume(inventory.lemons, sold * recipe.lemons)
    const sugar = consume(inventory.sugar, sold * recipe.sugar)
    const ice = consume(inventory.ice, sold * recipe.ice)
    inventory = { cups: cups.lots, lemons: lemons.lots, sugar: sugar.lots, ice: ice.lots }
    cogsCents = cups.costCents + lemons.costCents + sugar.costCents + ice.costCents
  }

  const revenueCents = sold * recipe.priceCents
  const fees = dayFees(hours)
  const otherCents = fees.standFeeCents + fees.helperCents
  const grossCents = revenueCents - cogsCents
  const netCents = grossCents - otherCents
  const earningsPerHourCents = hours > 0 ? roundHalfAway(netCents / hours) : null
  const ratio = recipe.priceCents / Math.max(1, fair)
  const satisfaction =
    hours <= 0 || potential === 0 ? null : Math.round(satisfactionScore(taste, comfort, ratio))
  const soldOutRatio = willing > 0 ? soldOutMissed / willing : 0
  const popularity = nextPopularity(input.popularity, satisfaction, soldOutRatio, input.previousSatisfaction)
  const iceLots = inventory.ice
  const iceMeltQty = iceLots.reduce((sum, lot) => sum + lot.qty, 0)
  const iceMeltCents = iceLots.reduce((sum, lot) => sum + lot.costCents, 0)

  const result: DayResult = {
    day: input.day,
    weather,
    recipe: { ...recipe },
    hours,
    potential,
    willing,
    sold,
    walkedAway,
    soldOutMissed,
    revenueCents,
    cogsCents,
    grossCents,
    standFeeCents: fees.standFeeCents,
    helperCents: fees.helperCents,
    otherCents,
    netCents,
    earningsPerHourCents,
    satisfaction,
    taste: Math.round(taste),
    iceComfort: Math.round(comfort),
    popularityBefore: input.popularity,
    popularityAfter: popularity,
    iceMeltQty,
    iceMeltCents,
    spoilLemonsQty: 0,
    spoilLemonsCents: 0,
    spoilSugarQty: 0,
    spoilSugarCents: 0,
    fairPriceCents: fair,
    cupsReady,
    onHand: onHandRaw(inventory),
    suppliesValueCents: inventoryValueCents(inventory),
  }

  return {
    result,
    inventory,
    cashDeltaCents: revenueCents - otherCents,
    popularity,
  }
}

export function cupsYouCanMake(inventory: Inventory, recipe: Recipe): number {
  return cupsFromInventory(inventory, recipe)
}
