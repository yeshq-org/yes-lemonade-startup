import type { DayPrices, ItemId } from './types'

export interface Pack {
  qty: number
  baseCents: number
}

export const CATALOG: Record<ItemId, [Pack, Pack, Pack]> = {
  cups: [
    { qty: 25, baseCents: 84 },
    { qty: 50, baseCents: 151 },
    { qty: 100, baseCents: 302 },
  ],
  lemons: [
    { qty: 10, baseCents: 96 },
    { qty: 30, baseCents: 241 },
    { qty: 75, baseCents: 416 },
  ],
  sugar: [
    { qty: 8, baseCents: 72 },
    { qty: 20, baseCents: 159 },
    { qty: 48, baseCents: 347 },
  ],
  ice: [
    { qty: 100, baseCents: 83 },
    { qty: 250, baseCents: 203 },
    { qty: 500, baseCents: 389 },
  ],
}

export const ITEM_COPY: Record<ItemId, { name: string; keeps: string; unit: string }> = {
  cups: { name: 'Cups', keeps: 'Leftovers keep', unit: 'cup' },
  lemons: { name: 'Lemons', keeps: 'Leftovers keep', unit: 'lemon' },
  sugar: { name: 'Sugar', keeps: 'Leftovers keep', unit: 'cup' },
  ice: { name: 'Ice', keeps: 'Melts overnight', unit: 'cube' },
}

export function packLabel(item: ItemId, qty: number): string {
  if (item === 'sugar') return `${qty} cups`
  if (item === 'ice') return `${qty} cubes`
  if (item === 'lemons') return `${qty} lemons`
  return `${qty} cups`
}

export function bestPackIndex(item: ItemId, prices: DayPrices[ItemId]): number {
  let best = 0
  let bestUnit = Infinity
  CATALOG[item].forEach((pack, index) => {
    const unit = prices[index]! / pack.qty
    if (unit < bestUnit - 1e-9) {
      bestUnit = unit
      best = index
    }
  })
  return best
}

export function emptyPrices(): DayPrices {
  return {
    cups: [0, 0, 0],
    lemons: [0, 0, 0],
    sugar: [0, 0, 0],
    ice: [0, 0, 0],
  }
}
