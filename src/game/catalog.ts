import type { DayPrices, ItemId } from './types'

export interface Pack {
  qty: number
  baseCents: number
}

export const CATALOG: Record<ItemId, [Pack, Pack, Pack]> = {
  cups: [
    { qty: 25, baseCents: 282 },
    { qty: 50, baseCents: 512 },
    { qty: 100, baseCents: 898 },
  ],
  lemons: [
    { qty: 10, baseCents: 680 },
    { qty: 30, baseCents: 1620 },
    { qty: 75, baseCents: 3300 },
  ],
  sugar: [
    { qty: 8, baseCents: 288 },
    { qty: 20, baseCents: 650 },
    { qty: 48, baseCents: 1560 },
  ],
  ice: [
    { qty: 100, baseCents: 188 },
    { qty: 250, baseCents: 350 },
    { qty: 500, baseCents: 625 },
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
