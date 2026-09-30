import { CATALOG } from './catalog'
import type { DayPrices, Inventory, ItemId, Lot, Recipe } from './types'
import { ITEM_IDS } from './types'

/** Lemons and sugar are stored in twelfths so a 12-cup pitcher stays penny-exact. */
const SCALE: Record<ItemId, number> = {
  cups: 1,
  lemons: 12,
  sugar: 12,
  ice: 1,
}

export function emptyInventory(): Inventory {
  return { cups: [], lemons: [], sugar: [], ice: [] }
}

export function cloneInventory(inv: Inventory): Inventory {
  return {
    cups: inv.cups.map((lot) => ({ ...lot })),
    lemons: inv.lemons.map((lot) => ({ ...lot })),
    sugar: inv.sugar.map((lot) => ({ ...lot })),
    ice: inv.ice.map((lot) => ({ ...lot })),
  }
}

export function totalQty(lots: Lot[]): number {
  return lots.reduce((sum, lot) => sum + lot.qty, 0)
}

export function addStock(inv: Inventory, item: ItemId, packQty: number, costCents: number, boughtDay?: number): Inventory {
  const lot: Lot = { qty: packQty * SCALE[item], costCents, ...(boughtDay === undefined ? {} : { boughtDay }) }
  return { ...inv, [item]: [...inv[item], lot] }
}

/**
 * FIFO consume. The last slice of a lot takes every remaining penny of its
 * cost basis, so a pack's purchase price is fully recognized and never duplicated.
 */
export function consume(lots: Lot[], qty: number): { lots: Lot[]; costCents: number } {
  if (qty < 0) throw new Error('Cannot consume a negative quantity')
  let need = qty
  let costCents = 0
  const next: Lot[] = []
  for (const lot of lots) {
    if (need <= 0) {
      if (lot.qty > 0) next.push(lot)
      continue
    }
    if (lot.qty <= 0) continue
    const take = Math.min(lot.qty, need)
    const allocated = take === lot.qty ? lot.costCents : Math.min(lot.costCents, Math.round((lot.costCents * take) / lot.qty))
    costCents += allocated
    need -= take
    const leftQty = lot.qty - take
    if (leftQty > 0) next.push({ qty: leftQty, costCents: lot.costCents - allocated, boughtDay: lot.boughtDay })
  }
  if (need > 0) throw new Error('Inventory shortfall')
  return { lots: next, costCents }
}

export function inventoryValueCents(inv: Inventory): number {
  return ITEM_IDS.reduce((sum, item) => sum + inv[item].reduce((inner, lot) => inner + lot.costCents, 0), 0)
}

export function onHandRaw(inv: Inventory): Record<ItemId, number> {
  return {
    cups: totalQty(inv.cups),
    lemons: totalQty(inv.lemons),
    sugar: totalQty(inv.sugar),
    ice: totalQty(inv.ice),
  }
}

export function displayCount(item: ItemId, rawQty: number): number {
  return rawQty / SCALE[item]
}

export function formatStock(item: ItemId, rawQty: number): string {
  const amount = displayCount(item, rawQty)
  const text = Number.isInteger(amount) ? String(amount) : (Math.round(amount * 10) / 10).toFixed(1)
  const many = amount !== 1
  if (item === 'lemons') return `${text} lemon${many ? 's' : ''}`
  if (item === 'sugar') return `${text} cup${many ? 's' : ''} of sugar`
  if (item === 'ice') return `${text} ice cube${many ? 's' : ''}`
  return `${text} cup${many ? 's' : ''}`
}

export function cupsFromInventory(inv: Inventory, recipe: Recipe): number {
  if (recipe.lemons < 1 || recipe.sugar < 1 || recipe.ice < 0) return 0
  const fromLemons = Math.floor(totalQty(inv.lemons) / recipe.lemons)
  const fromSugar = Math.floor(totalQty(inv.sugar) / recipe.sugar)
  const fromIce = recipe.ice === 0 ? Number.POSITIVE_INFINITY : Math.floor(totalQty(inv.ice) / recipe.ice)
  const fromCups = totalQty(inv.cups)
  const made = Math.min(fromLemons, fromSugar, fromIce, fromCups)
  if (!Number.isFinite(made)) return Math.max(0, fromCups)
  return Math.max(0, made)
}

/** Average supply cost for the next few cups, using today's FIFO lots. */
export function estimateUnitCogsCents(inv: Inventory, recipe: Recipe): number | null {
  const available = cupsFromInventory(inv, recipe)
  const count = Math.min(12, available)
  if (count <= 0) return null
  const draft = cloneInventory(inv)
  const cups = consume(draft.cups, count)
  const lemons = consume(draft.lemons, count * recipe.lemons)
  const sugar = consume(draft.sugar, count * recipe.sugar)
  const ice = consume(draft.ice, count * recipe.ice)
  return (cups.costCents + lemons.costCents + sugar.costCents + ice.costCents) / count
}

/** Lemons last 3 nights. Sugar lasts 10. Cups do not spoil. */
export const SPOIL_NIGHTS = { lemons: 3, sugar: 10 } as const

export interface SpoilResult {
  inventory: Inventory
  lemonsQty: number
  lemonsCents: number
  sugarQty: number
  sugarCents: number
}

/**
 * Drop produce whose shelf life ended before this morning.
 * A lot bought on day N is still in the stand on the morning of day N+nights-1
 * and gone on the morning of day N+nights.
 */
export function spoilProduce(inv: Inventory, morningDay: number): SpoilResult {
  const lemons = splitFresh(inv.lemons, morningDay, SPOIL_NIGHTS.lemons)
  const sugar = splitFresh(inv.sugar, morningDay, SPOIL_NIGHTS.sugar)
  return {
    inventory: { ...inv, lemons: lemons.fresh, sugar: sugar.fresh },
    lemonsQty: lemons.qty,
    lemonsCents: lemons.cents,
    sugarQty: sugar.qty,
    sugarCents: sugar.cents,
  }
}

function splitFresh(lots: Lot[], morningDay: number, nights: number): { fresh: Lot[]; qty: number; cents: number } {
  const fresh: Lot[] = []
  let qty = 0
  let cents = 0
  for (const lot of lots) {
    const bought = lot.boughtDay
    if (typeof bought === 'number' && morningDay >= bought + nights) {
      qty += lot.qty
      cents += lot.costCents
    } else {
      fresh.push(lot)
    }
  }
  return { fresh, qty, cents }
}

export function meltIce(inv: Inventory): { inventory: Inventory; meltQty: number; meltCents: number } {
  return {
    inventory: { ...inv, ice: [] },
    meltQty: totalQty(inv.ice),
    meltCents: inv.ice.reduce((sum, lot) => sum + lot.costCents, 0),
  }
}

export function cartCostCents(
  cart: { item: ItemId; packIndex: number; packs: number }[],
  prices: DayPrices,
): number {
  return cart.reduce((sum, line) => sum + line.packs * prices[line.item][line.packIndex], 0)
}

export function applyCart(
  inv: Inventory,
  cart: { item: ItemId; packIndex: number; packs: number }[],
  prices: DayPrices,
  boughtDay: number,
): Inventory {
  let next = inv
  for (const line of cart) {
    const pack = CATALOG[line.item][line.packIndex]
    const price = prices[line.item][line.packIndex]
    for (let i = 0; i < line.packs; i += 1) {
      next = addStock(next, line.item, pack.qty, price, boughtDay)
    }
  }
  return next
}
