import { describe, expect, it } from 'vitest'
import { settleCrowd } from './crowd'
import { addStock, emptyInventory } from './inventory'
import { simulateDay } from './simulate'
import {
  buildSidewalk,
  BUY_COMMENT_HOLD_SEC,
  buyerComments,
  COMMENT_LINGER_SEC,
  commentDurationSec,
  commentVisible,
  crowdProgress,
  OUT_COMMENT_HOLD_SEC,
  pedestrianX,
  reviseCrowd,
  sidewalkClock,
  tallyAt,
} from './sidewalk'
import type { DayResult, Recipe, Weather } from './types'

const weather: Weather = { heat: 'hot', sky: 'clear', tempF: 94 }
const recipe: Recipe = { lemons: 4, sugar: 4, ice: 6, priceCents: 100 }

function day(overrides: Partial<DayResult> = {}): DayResult {
  return {
    day: 1,
    weather,
    recipe,
    hours: 8,
    potential: 40,
    willing: 30,
    sold: 24,
    walkedAway: 10,
    soldOutMissed: 6,
    revenueCents: 2400,
    cogsCents: 300,
    grossCents: 2100,
    standFeeCents: 150,
    helperCents: 0,
    otherCents: 150,
    netCents: 1950,
    earningsPerHourCents: 244,
    satisfaction: 80,
    taste: 96,
    iceComfort: 100,
    popularityBefore: 40,
    popularityAfter: 46,
    iceMeltQty: 0,
    iceMeltCents: 0,
    spoilLemonsQty: 0,
    spoilLemonsCents: 0,
    spoilSugarQty: 0,
    spoilSugarCents: 0,
    fairPriceCents: 110,
    cupsReady: 24,
    onHand: { cups: 0, lemons: 0, sugar: 0, ice: 0 },
    suppliesValueCents: 0,
    ...overrides,
  }
}

describe('sidewalk comments', () => {
  it('keeps the popup up 0.9s after the person starts to leave', () => {
    expect(BUY_COMMENT_HOLD_SEC).toBe(2.5)
    expect(OUT_COMMENT_HOLD_SEC).toBe(1.45)
    expect(COMMENT_LINGER_SEC).toBe(0.9)
    expect(commentDurationSec('buy')).toBeCloseTo(3.4)
    expect(commentDurationSec('out')).toBeCloseTo(2.35)
    const buyer = buildSidewalk(day()).people.find((person) => person.kind === 'buy')!
    expect(buyer.depart - buyer.take).toBeCloseTo(2.5)
    expect(commentVisible(buyer, buyer.take)).toBe(true)
    expect(commentVisible(buyer, buyer.depart)).toBe(true)
    expect(commentVisible(buyer, buyer.depart + 0.9)).toBe(true)
    expect(commentVisible(buyer, buyer.depart + 0.91)).toBe(false)
  })
})

describe('sidewalk cast', () => {
  it('stops a buyer at the stand while someone is still walking past', () => {
    const cast = buildSidewalk(day())
    const buyer = cast.people.find((person) => person.kind === 'buy')
    expect(buyer?.comment).toBeTruthy()
    const mid = buyer ? (buyer.arrive + buyer.depart) / 2 : 0
    const walker = cast.people.find((person) => person.kind === 'pass' && mid >= person.start && mid <= person.end)
    expect(walker).toBeTruthy()
    const buyerX = buyer ? pedestrianX(buyer, mid, 390) : null
    const walkerX = walker ? pedestrianX(walker, mid, 390) : null
    expect(buyerX).not.toBeNull()
    expect(walkerX).not.toBeNull()
    expect(buyerX!).toBeGreaterThan(140)
    expect(buyerX!).toBeLessThan(230)
    expect(walkerX!).toBeGreaterThan(buyerX! + 40)
  })

  it('gives buyers a comment about the cup they actually bought', () => {
    const sweet = day({
      recipe: { lemons: 2, sugar: 8, ice: 0, priceCents: 250 },
      taste: 30,
      iceComfort: 20,
      fairPriceCents: 80,
      weather: { heat: 'hot', sky: 'clear', tempF: 96 },
    })
    const lines = buyerComments(sweet)
    expect(lines[0]).toBe('Too sweet.')
    expect(lines[1]).toBe('Too expensive. $2.50.')
    expect(lines[2]).toBe('Not enough ice.')
    expect(lines[3]).toMatch(/not good/i)
    const balanced = buyerComments(day())
    expect(balanced[0]).toBe('Great lemonade!')
    expect(balanced[2]).toBe('Love the ice!')
    const sour = buyerComments(
      day({
        recipe: { lemons: 8, sugar: 2, ice: 6, priceCents: 100 },
        taste: 20,
      }),
    )
    expect(sour[0]).toBe('Too sour.')
    const later = buildSidewalk(day()).people.filter((person) => person.kind === 'buy')
    expect(later[0]?.comment).toBe('Great lemonade!')
    expect(later[4]?.comment).toBe('Love this cup!')
    const cast = buildSidewalk(sweet)
    expect(cast.people.some((person) => person.kind === 'pass')).toBe(true)
    expect(cast.people.some((person) => person.kind === 'buy' && person.comment)).toBe(true)
  })

  it('still shows walkers when every willing customer bought', () => {
    const cast = buildSidewalk(day({ sold: 12, walkedAway: 0, soldOutMissed: 0, potential: 12, willing: 12 }))
    expect(cast.people.some((person) => person.kind === 'pass')).toBe(true)
    expect(cast.people.filter((person) => person.kind === 'buy').length).toBeGreaterThan(0)
  })

  it('starts the tally at zero and adds each share only after that person acts', () => {
    const cast = buildSidewalk(day())
    expect(tallyAt(cast.people, 0)).toEqual({ served: 0, walked: 0, missed: 0, revenueCents: 0 })
    const buyer = cast.people.find((person) => person.kind === 'buy')!
    expect(tallyAt(cast.people, buyer.take - 0.01).served).toBe(0)
    expect(tallyAt(cast.people, buyer.take).served).toBe(buyer.weight)
    const finished = tallyAt(cast.people, cast.duration)
    expect(finished.served).toBe(24)
    expect(finished.walked).toBe(10)
    expect(finished.missed).toBe(6)
    expect(finished.revenueCents).toBe(2400)
    const closed = buildSidewalk(day({ hours: 0, potential: 0, willing: 0, sold: 0, walkedAway: 0, soldOutMissed: 0 }))
    expect(tallyAt(closed.people, closed.duration)).toEqual({ served: 0, walked: 0, missed: 0, revenueCents: 0 })
  })

  it('keeps a price already walked up to and reprices everyone still coming', () => {
    const opening = day({
      sold: 10,
      walkedAway: 6,
      soldOutMissed: 0,
      potential: 16,
      willing: 10,
      cupsReady: 20,
      revenueCents: 1500,
      recipe: { ...recipe, priceCents: 150 },
      fairPriceCents: 150,
      taste: 100,
    })
    const people = buildSidewalk(opening).people
    const first = people.find((person) => person.kind === 'buy')!
    const revised = reviseCrowd(people, first.arrive + 0.01, 400, opening)
    const locked = revised.filter((person) => person.counts && person.arrive <= first.arrive + 0.01 && person.kind === 'buy')
    const later = revised.filter((person) => person.counts && person.arrive > first.arrive + 0.01 && person.kind === 'buy')
    expect(locked.length).toBeGreaterThan(0)
    expect(locked.every((person) => person.priceCents === 150)).toBe(true)
    expect(later.every((person) => person.priceCents === 400)).toBe(true)
    const books = settleCrowd(opening, revised, stockedShelf(), 400)
    const lockedRevenue = locked.reduce((sum, person) => sum + person.weight * person.priceCents, 0)
    const laterRevenue = later.reduce((sum, person) => sum + person.weight * person.priceCents, 0)
    expect(books.result.revenueCents).toBe(lockedRevenue + laterRevenue)
    expect(books.result.revenueCents).not.toBe(books.result.sold * 400)
    expect(books.result.sold + books.result.walkedAway + books.result.soldOutMissed).toBe(16)
    expect(books.result.grossCents).toBe(books.result.revenueCents - books.result.cogsCents)
  })

  it('moves the sidewalk clock from 9:00am to 5:00pm only as people are shown', () => {
    const cast = buildSidewalk(day())
    expect(sidewalkClock(0)).toBe('9:00am')
    expect(sidewalkClock(0.5)).toBe('1:00pm')
    expect(sidewalkClock(1)).toBe('5:00pm')
    expect(crowdProgress(cast.people, 0)).toBe(0)
    const first = cast.people[0]!
    expect(crowdProgress(cast.people, first.take - 0.05)).toBe(0)
    const midway = crowdProgress(cast.people, cast.duration * 0.45)
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(1)
    expect(crowdProgress(cast.people, cast.duration)).toBe(1)
    expect(sidewalkClock(crowdProgress(cast.people, 0))).toBe('9:00am')
    expect(sidewalkClock(crowdProgress(cast.people, cast.duration))).toBe('5:00pm')
  })

  it('matches a single opening price when nobody has arrived yet', () => {
    const played = simulateDay({
      day: 1,
      seed: 4,
      weather,
      inventory: stockedShelf(),
      recipe: { lemons: 4, sugar: 4, ice: 4, priceCents: 150 },
      hours: 8,
      popularity: 40,
      previousSatisfaction: null,
    })
    const people = buildSidewalk(played.result).people
    const same = reviseCrowd(people, 0, 150, played.result)
    expect(tallyAt(same, 999).served).toBe(played.result.sold)
    const higher = reviseCrowd(people, 0, 400, played.result)
    const settled = settleCrowd(played.result, higher, stockedShelf(), 400)
    expect(settled.result.sold).toBeLessThan(played.result.sold)
    expect(settled.result.revenueCents).toBe(settled.result.sold * 400)
    expect(settled.result.walkedAway).toBeGreaterThan(played.result.walkedAway)
  })
})

function stockedShelf() {
  let inv = emptyInventory()
  inv = addStock(inv, 'cups', 100, 898)
  inv = addStock(inv, 'lemons', 75, 3300)
  inv = addStock(inv, 'sugar', 48, 1560)
  inv = addStock(inv, 'ice', 500, 625)
  return inv
}
