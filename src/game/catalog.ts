import type { DayPrices, ItemId } from './types'

export interface Pack {
  qty: number
  baseCents: number
}

/**
 * Every bigger pack is clearly cheaper per piece (about 15% off, then about 30% off).
 * Prices move day to day, but one factor moves a whole item so the bulk discount never flips.
 */
export const CATALOG: Record<ItemId, [Pack, Pack, Pack]> = {
  cups: [
    { qty: 25, baseCents: 250 },
    { qty: 50, baseCents: 425 },
    { qty: 100, baseCents: 700 },
  ],
  lemons: [
    { qty: 10, baseCents: 500 },
    { qty: 30, baseCents: 1260 },
    { qty: 75, baseCents: 2625 },
  ],
  sugar: [
    { qty: 8, baseCents: 240 },
    { qty: 20, baseCents: 500 },
    { qty: 48, baseCents: 960 },
  ],
  ice: [
    { qty: 100, baseCents: 150 },
    { qty: 250, baseCents: 300 },
    { qty: 500, baseCents: 450 },
  ],
}

export const ITEM_COPY: Record<ItemId, { name: string; unit: string }> = {
  cups: { name: 'Cups', unit: 'cup' },
  lemons: { name: 'Lemons', unit: 'lemon' },
  sugar: { name: 'Sugar', unit: 'cup' },
  ice: { name: 'Ice', unit: 'cube' },
}

export function packLabel(item: ItemId, qty: number): string {
  if (item === 'sugar') return `${qty} cups`
  if (item === 'ice') return `${qty} cubes`
  if (item === 'lemons') return `${qty} lemons`
  return `${qty} cups`
}

export function emptyPrices(): DayPrices {
  return {
    cups: [0, 0, 0],
    lemons: [0, 0, 0],
    sugar: [0, 0, 0],
    ice: [0, 0, 0],
  }
}
