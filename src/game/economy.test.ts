import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS, STARTING_CASH_CENTS } from './constants'
import { IDEAL_ICE, buyRate, dayFees, expectedVisitors, fairPriceCents, iceComfort, tasteScore } from './demand'
import { addStock, consume, cupsFromInventory, emptyInventory, inventoryValueCents } from './inventory'
import { createGame } from './setup'
import { simulateDay } from './simulate'
import { summarize } from './scoring'
import { reducer } from '../state/reducer'
import type { GameState, Hours, ItemId } from './types'

function assertIdentity(day: GameState['history'][number]) {
  expect(day.grossCents).toBe(day.revenueCents - day.cogsCents)
  expect(day.netCents).toBe(day.grossCents - day.otherCents)
  expect(day.otherCents).toBe(day.standFeeCents + day.helperCents)
  expect(day.sold + day.walkedAway + day.soldOutMissed).toBe(day.potential)
  if (day.hours === 0) expect(day.earningsPerHourCents).toBeNull()
  else expect(day.earningsPerHourCents).toBe(Math.sign(day.netCents / day.hours) * Math.round(Math.abs(day.netCents / day.hours)))
}

function assertBooks(state: GameState) {
  const summary = summarize(state)
  const melt = state.history.reduce((sum, day) => sum + day.iceMeltCents, 0)
  const spoiled = state.history.reduce((sum, day) => sum + day.spoilLemonsCents + day.spoilSugarCents, 0)
  const net = state.history.reduce((sum, day) => sum + day.netCents, 0)
  expect(summary.totalNetCents).toBe(net)
  expect(summary.totalGrossCents).toBe(summary.totalRevenueCents - summary.totalCogsCents)
  expect(summary.netWorthCents).toBe(state.cashCents + inventoryValueCents(state.inventory))
  expect(summary.netWorthCents).toBe(STARTING_CASH_CENTS + net - melt - spoiled)
  for (const day of state.history) assertIdentity(day)
}

function stockOf(state: GameState, item: ItemId): number {
  const raw = state.inventory[item].reduce((sum, lot) => sum + lot.qty, 0)
  return item === 'lemons' || item === 'sugar' ? raw / 12 : raw
}

function reserved(state: GameState, item: ItemId): number {
  return state.cart
    .filter((line) => line.item === item)
    .reduce((sum, line) => sum + line.packs * CATALOG[item][line.packIndex].qty, 0)
}

function cashAfterCart(state: GameState): number {
  const prices = state.priceBook[state.day - 1]!
  const spent = state.cart.reduce((sum, line) => sum + line.packs * prices[line.item][line.packIndex]!, 0)
  return state.cashCents - spent
}

/** Buy what the day needs, but leave the stand fee in the till. */
function buyToCover(state: GameState, item: ItemId, need: number, keepCents: number): GameState {
  let next = state
  let guard = 0
  while (stockOf(next, item) + reserved(next, item) < need && guard < 20) {
    guard += 1
    const remaining = need - stockOf(next, item) - reserved(next, item)
    const affordable = CATALOG[item]
      .map((pack, index) => ({ index, qty: pack.qty }))
      .filter((pack) => {
        const drafted = reducer(next, { type: 'add-pack', item, packIndex: pack.index })
        return drafted !== null && drafted !== next && cashAfterCart(drafted) >= keepCents
      })
    if (affordable.length === 0) break
    const pick = affordable.find((pack) => pack.qty >= remaining) ?? affordable[0]!
    const drafted = reducer(next, { type: 'add-pack', item, packIndex: pick.index })
    if (!drafted || drafted === next) break
    next = drafted
  }
  return next
}

function holdSmall(state: GameState, item: ItemId, keepCents: number): GameState {
  if (stockOf(state, item) + reserved(state, item) > 0) return state
  const drafted = reducer(state, { type: 'add-pack', item, packIndex: 0 })
  if (!drafted || drafted === state || cashAfterCart(drafted) < keepCents) return state
  return drafted
}

function finish(seed: number, style: 'smart' | 'naive' | 'closed'): GameState {
  let state = createGame(7, seed)
  for (let day = 0; day < 7; day += 1) {
    const weather = state.forecast[state.day - 1]!
    state = reducer(state, { type: 'ack-morning' })!
    if (style === 'closed') {
      state = reducer(state, { type: 'checkout' })!
      state = reducer(state, { type: 'set-hours', hours: 0 })!
    } else if (style === 'naive') {
      state = reducer(state, { type: 'set-lemons', value: 4 })!
      state = reducer(state, { type: 'set-sugar', value: 4 })!
      state = reducer(state, { type: 'set-ice', value: 4 })!
      state = reducer(state, { type: 'set-price', cents: PRICE_MIN_CENTS })!
      state = reducer(state, { type: 'set-hours', hours: 8 })!
      for (const item of ['cups', 'lemons', 'sugar', 'ice'] as const) {
        state = reducer(state, { type: 'add-pack', item, packIndex: 0 })!
      }
      state = reducer(state, { type: 'checkout' })!
    } else {
      const ice = IDEAL_ICE[weather.heat]
      const taste = tasteScore(4, 4)
      const comfort = iceComfort(ice, weather.heat)
      const fair = fairPriceCents(weather, taste, comfort)
      const hours: Hours = weather.heat === 'cold' && weather.sky === 'rain' ? 4 : weather.heat === 'cold' ? 6 : 8
      const price = Math.min(PRICE_MAX_CENTS, Math.max(PRICE_MIN_CENTS, Math.round((fair * 0.92) / 5) * 5))
      state = reducer(state, { type: 'set-lemons', value: 4 })!
      state = reducer(state, { type: 'set-sugar', value: 4 })!
      state = reducer(state, { type: 'set-ice', value: ice })!
      state = reducer(state, { type: 'set-price', cents: price })!
      state = reducer(state, { type: 'set-hours', hours })!
      const expectedBuyers = Math.max(
        4,
        Math.ceil(expectedVisitors(weather, hours, state.popularity) * buyRate(price, fair, taste)),
      )
      const fees = dayFees(hours)
      const keep = fees.standFeeCents + fees.helperCents
      state = holdSmall(state, 'cups', keep)
      state = holdSmall(state, 'lemons', keep)
      state = holdSmall(state, 'sugar', keep)
      if (ice > 0) state = holdSmall(state, 'ice', keep)
      state = buyToCover(state, 'cups', expectedBuyers, keep)
      state = buyToCover(state, 'lemons', Math.ceil((expectedBuyers * 4) / 12), keep)
      state = buyToCover(state, 'sugar', Math.ceil((expectedBuyers * 4) / 12), keep)
      if (ice > 0) state = buyToCover(state, 'ice', Math.ceil(expectedBuyers * ice), keep)
      state = reducer(state, { type: 'checkout' })!
    }
    state = reducer(state, { type: 'open' })!
    state = reducer(state, { type: 'to-report' })!
    state = reducer(state, { type: 'advance' })!
    assertBooks(state)
  }
  expect(state.phase).toBe('career')
  expect(state.history).toHaveLength(7)
  expect(state.inventory.ice).toEqual([])
  return state
}

describe('inventory', () => {
  it('recognizes every penny of a pack through FIFO', () => {
    let inv = addStock(emptyInventory(), 'lemons', 10, 680)
    const first = consume(inv.lemons, 4)
    inv = { ...inv, lemons: first.lots }
    const rest = consume(inv.lemons, 116)
    expect(first.costCents + rest.costCents).toBe(680)
    expect(rest.lots).toEqual([])
  })

  it('limits cups by the scarcest ingredient', () => {
    let inv = emptyInventory()
    inv = addStock(inv, 'cups', 100, 898)
    inv = addStock(inv, 'lemons', 10, 680)
    inv = addStock(inv, 'sugar', 48, 1560)
    inv = addStock(inv, 'ice', 100, 188)
    const cups = cupsFromInventory(inv, { lemons: 4, sugar: 4, ice: 4, priceCents: 50 })
    expect(cups).toBe(25)
  })
})

describe('demand shape', () => {
  it('sends more people on a hot clear day than a cold rain', () => {
    const hot = simulateDay({
      day: 1,
      seed: 3,
      weather: { heat: 'hot', sky: 'clear', tempF: 96 },
      inventory: stocked(),
      recipe: { lemons: 4, sugar: 4, ice: 6, priceCents: 100 },
      hours: 8,
      popularity: 40,
      previousSatisfaction: null,
    })
    const cold = simulateDay({
      day: 1,
      seed: 3,
      weather: { heat: 'cold', sky: 'rain', tempF: 48 },
      inventory: stocked(),
      recipe: { lemons: 4, sugar: 4, ice: 6, priceCents: 100 },
      hours: 8,
      popularity: 40,
      previousSatisfaction: null,
    })
    expect(hot.result.potential).toBeGreaterThan(cold.result.potential * 2)
    expect(hot.result.sold).toBeGreaterThan(cold.result.sold)
  })

  it('turns a high price into walkaways', () => {
    const fair = simulateDay({
      day: 2,
      seed: 8,
      weather: { heat: 'warm', sky: 'clear', tempF: 82 },
      inventory: stocked(),
      recipe: { lemons: 4, sugar: 4, ice: 4, priceCents: 150 },
      hours: 8,
      popularity: 50,
      previousSatisfaction: null,
    })
    const steep = simulateDay({
      day: 2,
      seed: 8,
      weather: { heat: 'warm', sky: 'clear', tempF: 82 },
      inventory: stocked(),
      recipe: { lemons: 4, sugar: 4, ice: 4, priceCents: 400 },
      hours: 8,
      popularity: 50,
      previousSatisfaction: null,
    })
    expect(steep.result.walkedAway).toBeGreaterThan(fair.result.walkedAway)
    expect(steep.result.sold).toBeLessThan(fair.result.sold)
  })
})

describe('season', () => {
  it('keeps a closed week penny-perfect and melts ice', () => {
    let state = createGame(7, 4)
    state = reducer(state, { type: 'ack-morning' })!
    state = reducer(state, { type: 'add-pack', item: 'ice', packIndex: 0 })!
    const iceCost = state.priceBook[0]!.ice[0]
    state = reducer(state, { type: 'checkout' })!
    state = reducer(state, { type: 'set-hours', hours: 0 })!
    state = reducer(state, { type: 'open' })!
    expect(state.pending?.earningsPerHourCents).toBeNull()
    expect(state.pending?.netCents).toBe(0)
    expect(state.pending?.iceMeltCents).toBe(iceCost)
    state = reducer(state, { type: 'to-report' })!
    state = reducer(state, { type: 'advance' })!
    expect(state.inventory.ice).toEqual([])
    expect(state.cashCents).toBe(STARTING_CASH_CENTS - iceCost)
    assertBooks(state)
  })

  it('plays seven days without breaking the books', () => {
    const state = finish(21, 'smart')
    const summary = summarize(state)
    expect(summary.daysPlayed).toBe(7)
    expect(summary.badges.find((badge) => badge.id === 'closer')?.earned).toBe(true)
    expect(summary.earningsPerHourCents).not.toBeNull()
  })

  it('pays a careful price better than charging the 50 cent floor', () => {
    const seeds = [1, 2, 3, 7, 11, 21, 42, 99]
    let wins = 0
    for (const seed of seeds) {
      const smart = summarize(finish(seed, 'smart'))
      const naive = summarize(finish(seed, 'naive'))
      if ((smart.earningsPerHourCents ?? -99999) > (naive.earningsPerHourCents ?? -99999)) wins += 1
    }
    expect(wins).toBeGreaterThanOrEqual(7)
  })

  it('refuses a cart the till cannot cover', () => {
    let state = createGame(7, 1)
    state = { ...state, cashCents: 50, phase: 'shop' }
    const next = reducer(state, { type: 'add-pack', item: 'cups', packIndex: 2 })
    expect(next?.cart).toEqual([])
    expect(next?.cashCents).toBe(50)
  })

  it('lets the four small packs fit in the starting $20', () => {
    const items = ['cups', 'lemons', 'sugar', 'ice'] as const
    const base = items.reduce((sum, item) => sum + CATALOG[item][0].baseCents, 0)
    expect(base).toBe(282 + 680 + 288 + 188)
    expect(base).toBeLessThanOrEqual(STARTING_CASH_CENTS)
    const worstDay = items.reduce((sum, item) => sum + Math.round(CATALOG[item][0].baseCents * 1.1), 0)
    expect(worstDay).toBeLessThanOrEqual(STARTING_CASH_CENTS)
  })

  it('prices a hot clear cup near $2.10 and a cold rain near 75 cents', () => {
    expect(fairPriceCents({ heat: 'hot', sky: 'clear', tempF: 96 }, 100, 100)).toBe(210)
    expect(fairPriceCents({ heat: 'cold', sky: 'rain', tempF: 48 }, 0, 0)).toBe(75)
  })

  it('prices stay inside a 10 percent band', () => {
    const state = createGame(30, 123)
    for (const day of state.priceBook) {
      for (const item of ['cups', 'lemons', 'sugar', 'ice'] as const) {
        day[item].forEach((price, index) => {
          const base = CATALOG[item][index].baseCents
          expect(price).toBeGreaterThanOrEqual(Math.floor(base * 0.9))
          expect(price).toBeLessThanOrEqual(Math.ceil(base * 1.1))
        })
      }
    }
    expect(state.forecast).toHaveLength(30)
  })
})

function stocked() {
  let inv = emptyInventory()
  inv = addStock(inv, 'cups', 200, 600)
  inv = addStock(inv, 'lemons', 80, 500)
  inv = addStock(inv, 'sugar', 80, 500)
  inv = addStock(inv, 'ice', 800, 600)
  return inv
}
