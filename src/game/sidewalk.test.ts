import { describe, expect, it } from 'vitest'
import { buildSidewalk, buyerComments, pedestrianX } from './sidewalk'
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
    fairPriceCents: 110,
    cupsReady: 24,
    onHand: { cups: 0, lemons: 0, sugar: 0, ice: 0 },
    suppliesValueCents: 0,
    ...overrides,
  }
}

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
    expect(lines[0]).toMatch(/sweet/i)
    expect(lines.join(' ')).toContain('$2.50')
    expect(lines.join(' ')).toMatch(/ice/i)
    const cast = buildSidewalk(sweet)
    expect(cast.people.some((person) => person.kind === 'pass')).toBe(true)
    expect(cast.people.some((person) => person.kind === 'buy' && person.comment)).toBe(true)
  })

  it('still shows walkers when every willing customer bought', () => {
    const cast = buildSidewalk(day({ sold: 12, walkedAway: 0, soldOutMissed: 0, potential: 12, willing: 12 }))
    expect(cast.people.some((person) => person.kind === 'pass')).toBe(true)
    expect(cast.people.filter((person) => person.kind === 'buy').length).toBeGreaterThan(0)
  })
})
