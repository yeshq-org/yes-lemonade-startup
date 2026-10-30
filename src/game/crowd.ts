import { dayFees, nextPopularity, satisfactionScore } from './demand'
import { cloneInventory, consume, inventoryValueCents, onHandRaw } from './inventory'
import { roundHalfAway } from './money'
import type { Arrival, DayResult, Inventory } from './types'

/**
 * Rebuild the day's books from the crowd that is actually scripted.
 * Revenue is the sum of what each sale pays, so a mid-day price change
 * does not reprice cups that were already taken.
 */
export function settleCrowd(base: DayResult, people: Arrival[], shelf: Inventory, signPrice: number): {
  result: DayResult
  inventory: Inventory
} {
  const counted = people.filter((person) => person.counts && person.weight > 0)
  const sold = counted.filter((person) => person.kind === 'buy').reduce((sum, person) => sum + person.weight, 0)
  const walkedAway = counted.filter((person) => person.kind === 'pass').reduce((sum, person) => sum + person.weight, 0)
  const soldOutMissed = counted.filter((person) => person.kind === 'out').reduce((sum, person) => sum + person.weight, 0)
  const revenueCents = counted
    .filter((person) => person.kind === 'buy')
    .reduce((sum, person) => sum + person.weight * person.priceCents, 0)
  const potential = sold + walkedAway + soldOutMissed
  const willing = sold + soldOutMissed

  let inventory = cloneInventory(shelf)
  let cogsCents = 0
  if (sold > 0) {
    const cups = consume(inventory.cups, sold)
    const lemons = consume(inventory.lemons, sold * base.recipe.lemons)
    const sugar = consume(inventory.sugar, sold * base.recipe.sugar)
    const ice = consume(inventory.ice, sold * base.recipe.ice)
    inventory = { cups: cups.lots, lemons: lemons.lots, sugar: sugar.lots, ice: ice.lots }
    cogsCents = cups.costCents + lemons.costCents + sugar.costCents + ice.costCents
  }

  const fees = dayFees(base.hours)
  const otherCents = fees.standFeeCents + fees.helperCents
  const grossCents = revenueCents - cogsCents
  const netCents = grossCents - otherCents
  const earningsPerHourCents = base.hours > 0 ? roundHalfAway(netCents / base.hours) : null
  const fair = Math.max(1, base.fairPriceCents)
  const faced = counted.length > 0 ? counted : people
  const uniform = faced.every((person) => person.priceCents === faced[0]?.priceCents)
  const ratio = uniform
    ? (faced[0]?.priceCents || signPrice) / fair
    : faced.reduce((sum, person) => sum + (person.priceCents / fair) * person.weight, 0) /
      Math.max(1, faced.reduce((sum, person) => sum + person.weight, 0))
  const satisfaction = base.hours <= 0 || potential === 0 ? null : Math.round(satisfactionScore(base.taste, base.iceComfort, ratio))
  const soldOutRatio = willing > 0 ? soldOutMissed / willing : 0
  const popularity = nextPopularity(base.popularityBefore, satisfaction, soldOutRatio, null)
  const iceMeltQty = inventory.ice.reduce((sum, lot) => sum + lot.qty, 0)
  const iceMeltCents = inventory.ice.reduce((sum, lot) => sum + lot.costCents, 0)

  return {
    inventory,
    result: {
      ...base,
      recipe: { ...base.recipe, priceCents: signPrice },
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
      popularityAfter: popularity,
      iceMeltQty,
      iceMeltCents,
      cupsReady: base.cupsReady,
      onHand: onHandRaw(inventory),
      suppliesValueCents: inventoryValueCents(inventory),
    },
  }
}
