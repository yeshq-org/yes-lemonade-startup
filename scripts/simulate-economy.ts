/* Plays full 7-day seasons through the real reducer with several strategies and weather seeds.
 * Run: npx vite-node scripts/simulate-economy.ts */
import { CATALOG } from '../src/game/catalog'
import { DAY_HOURS } from '../src/game/constants'
import { fairPriceCents, iceComfort, IDEAL_ICE, tasteScore, expectedVisitors, buyRate } from '../src/game/demand'
import { createGame } from '../src/game/setup'
import { summarize } from '../src/game/scoring'
import { totalQty } from '../src/game/inventory'
import { reducer } from '../src/state/reducer'
import type { GameState, ItemId } from '../src/game/types'

type Strategy = {
  name: string
  lemons: number
  sugar: number
  ice: (heat: GameState['forecast'][number]['heat']) => number
  price: (s: GameState) => number
  /** How many cups to stock for, as a share of the expected crowd. */
  stockFor: (s: GameState, price: number) => number
}

const per: Record<ItemId, (st: Strategy, s: GameState) => number> = {
  cups: () => 1,
  lemons: (st) => st.lemons / 12,
  sugar: (st) => st.sugar / 12,
  ice: (st, s) => st.ice(s.forecast[s.day - 1]!.heat),
}

function have(s: GameState, item: ItemId) {
  const raw = totalQty(s.inventory[item])
  return item === 'lemons' || item === 'sugar' ? raw / 12 : raw
}
function inCart(s: GameState, item: ItemId) {
  return s.cart.filter((l) => l.item === item).reduce((a, l) => a + l.packs * CATALOG[item][l.packIndex].qty, 0)
}

function buy(s: GameState, st: Strategy, cups: number, reserve: number): GameState {
  for (const item of ['cups', 'lemons', 'sugar', 'ice'] as ItemId[]) {
    const need = Math.ceil(cups * per[item](st, s))
    let guard = 0
    while (have(s, item) + inCart(s, item) < need && guard++ < 40) {
      const short = need - have(s, item) - inCart(s, item)
      // Smallest pack that covers the gap, else the biggest affordable.
      const order = [0, 1, 2].filter((i) => CATALOG[item][i].qty >= short)
      const tries = order.length ? [order[0]!, ...[0, 1, 2].filter((i) => i < order[0]!).reverse()] : [2, 1, 0]
      let next = s
      for (const i of tries) {
        const d = reducer(s, { type: 'add-pack', item, packIndex: i })!
        const prices = s.priceBook[s.day - 1]!
        const spend = d.cart.reduce((a, l) => a + l.packs * prices[l.item][l.packIndex]!, 0)
        if (d !== s && d.cashCents - spend >= reserve) { next = d; break }
      }
      if (next === s) break
      s = next
    }
  }
  return s
}

function play(seed: number, st: Strategy) {
  let s = createGame(7, seed)
  while (s.phase !== 'career') {
    if (s.phase === 'morning') s = reducer(s, { type: 'ack-morning' })!
    if (s.phase === 'shop') {
      const price = st.price(s)
      const want = st.stockFor(s, price)
      s = reducer(s, { type: 'set-lemons', value: st.lemons })!
      s = reducer(s, { type: 'set-sugar', value: st.sugar })!
      s = reducer(s, { type: 'set-ice', value: st.ice(s.forecast[s.day - 1]!.heat) })!
      s = reducer(s, { type: 'set-price', cents: price })!
      // Shrink the plan until every ingredient fits the till, like a real player would.
      let plan = want
      let bought = buy(s, st, plan, 150)
      while (plan > 0 && (['cups', 'lemons', 'sugar', 'ice'] as ItemId[]).some((i) => have(bought, i) + inCart(bought, i) < Math.ceil(plan * per[i](st, s)))) {
        plan = Math.floor(plan * 0.9)
        bought = buy(s, st, plan, 150)
      }
      s = bought
      s = reducer(s, { type: 'checkout' })!
      s = reducer(s, { type: 'open' })!
      s = reducer(s, { type: 'to-report' })!
      s = reducer(s, { type: 'advance' })!
    }
  }
  return summarize(s)
}

function crowdGuess(s: GameState, price: number, st: Strategy, share: number) {
  const w = s.forecast[s.day - 1]!
  const taste = tasteScore(st.lemons, st.sugar)
  const fair = fairPriceCents(w, taste, iceComfort(st.ice(w.heat), w.heat))
  return Math.ceil(expectedVisitors(w, DAY_HOURS, s.popularity) * buyRate(price, fair, taste) * share)
}
function fairFor(s: GameState, st: Strategy) {
  const w = s.forecast[s.day - 1]!
  return fairPriceCents(w, tasteScore(st.lemons, st.sugar), iceComfort(st.ice(w.heat), w.heat))
}
const round25 = (c: number) => Math.round(c / 25) * 25

const strategies: Strategy[] = [
  {
    name: 'Good: reads the weather, prices near fair, ice for the heat',
    lemons: 4, sugar: 4, ice: (h) => IDEAL_ICE[h],
    price: (s) => round25(fairFor(s, strategies[0]!) * 0.95),
    stockFor: (s, p) => crowdGuess(s, p, strategies[0]!, 1.05),
  },
  {
    name: 'Good (realistic): weather-aware, rounds price to 50¢, a bit under fair',
    lemons: 4, sugar: 4, ice: (h) => IDEAL_ICE[h],
    price: (s) => Math.round((fairFor(s, strategies[1]!) * 0.88) / 50) * 50,
    stockFor: (s, p) => crowdGuess(s, p, strategies[1]!, 1.0),
  },
  {
    name: 'Average: decent recipe, flat $4.00, ice 4, stocks for a guess',
    lemons: 4, sugar: 3, ice: () => 4,
    price: () => 400,
    stockFor: (s, p) => crowdGuess(s, p, strategies[2]!, 0.85),
  },
  {
    name: 'Average: weather-aware price but sloppy stock',
    lemons: 3, sugar: 4, ice: (h) => (h === 'hot' || h === 'warm' ? 5 : 2),
    price: (s) => { const h = s.forecast[s.day - 1]!.heat; return h === 'hot' ? 475 : h === 'warm' ? 425 : h === 'cool' ? 325 : 250 },
    stockFor: (s, p) => crowdGuess(s, p, strategies[3]!, 1.3),
  },
  {
    name: 'Cheap: old-habit $2.00 cup',
    lemons: 4, sugar: 4, ice: () => 4,
    price: () => 200,
    stockFor: (s, p) => crowdGuess(s, p, strategies[4]!, 1),
  },
  {
    name: 'Greedy: $7.00 cup',
    lemons: 4, sugar: 4, ice: (h) => IDEAL_ICE[h],
    price: () => 700,
    stockFor: (s, p) => crowdGuess(s, p, strategies[5]!, 1),
  },
]

const seeds = [1, 7, 42, 99, 123, 2024, 31337, 555, 808, 9001]
for (const st of strategies) {
  const rows = seeds.map((seed) => play(seed, st))
  const eph = rows.map((r) => (r.earningsPerHourCents ?? 0) / 100)
  const net = rows.map((r) => r.totalNetCents / 100)
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  console.log(`${st.name}\n  $/hr avg ${avg(eph).toFixed(2)} (min ${Math.min(...eph).toFixed(2)}, max ${Math.max(...eph).toFixed(2)})  net avg $${avg(net).toFixed(0)} (min $${Math.min(...net).toFixed(0)}, max $${Math.max(...net).toFixed(0)})  tiers ${rows.map((r) => r.tier[0]).join('')}`)
}
