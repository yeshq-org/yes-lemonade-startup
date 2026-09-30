import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Recipe } from '../components/screens/Recipe'
import { Report } from '../components/screens/Report'
import { morningBrief } from './coach'
import { addStock, emptyInventory, spoilProduce } from './inventory'
import { createGame } from './setup'
import { normalizeSave } from './storage'
import { reducer } from '../state/reducer'
import { GameProvider } from '../state/GameContext'
import { celsiusFromFahrenheit, weatherReadout } from './weather'

describe('celsius', () => {
  it('rounds half away from zero', () => {
    expect(celsiusFromFahrenheit(90)).toBe(32)
    expect(celsiusFromFahrenheit(32)).toBe(0)
    expect(celsiusFromFahrenheit(212)).toBe(100)
    expect(celsiusFromFahrenheit(31)).toBe(-1)
    expect(weatherReadout({ heat: 'hot', sky: 'clear', tempF: 90 })).toBe('Hot and clear · 32°C / 90°F')
  })
})

describe('spoilage', () => {
  it('keeps lemons through the next two mornings and sugar through nine', () => {
    let inv = emptyInventory()
    inv = addStock(inv, 'lemons', 10, 680, 1)
    inv = addStock(inv, 'sugar', 8, 288, 1)
    inv = addStock(inv, 'cups', 25, 282, 1)
    expect(spoilProduce(inv, 3).lemonsQty).toBe(0)
    expect(spoilProduce(inv, 4).lemonsQty).toBe(120)
    expect(spoilProduce(inv, 4).lemonsCents).toBe(680)
    expect(spoilProduce(inv, 4).inventory.sugar).toHaveLength(1)
    expect(spoilProduce(inv, 10).sugarQty).toBe(0)
    expect(spoilProduce(inv, 11).sugarQty).toBe(96)
    expect(spoilProduce(inv, 11).sugarCents).toBe(288)
    expect(spoilProduce(inv, 11).inventory.cups).toHaveLength(1)
  })

  it('removes lemons on the morning of day 4 and sugar on the morning of day 11', () => {
    let state = createGame(14, 5)
    state = reducer(state, { type: 'ack-morning' })!
    state = reducer(state, { type: 'add-pack', item: 'lemons', packIndex: 0 })!
    state = reducer(state, { type: 'add-pack', item: 'sugar', packIndex: 0 })!
    state = reducer(state, { type: 'add-pack', item: 'cups', packIndex: 0 })!
    const lemonCost = state.priceBook[0]!.lemons[0]!
    const sugarCost = state.priceBook[0]!.sugar[0]!
    state = reducer(state, { type: 'checkout' })!
    expect(state.inventory.lemons[0]?.boughtDay).toBe(1)
    state = reducer(state, { type: 'set-hours', hours: 0 })!
    state = reducer(state, { type: 'open' })!
    state = reducer(state, { type: 'to-report' })!
    expect(state.pending?.spoilLemonsCents).toBe(0)
    expect(state.pending?.spoilSugarCents).toBe(0)
    state = reducer(state, { type: 'advance' })!
    while (state.day < 4) state = closeDay(state)
    expect(state.day).toBe(4)
    expect(state.inventory.lemons).toEqual([])
    expect(state.inventory.sugar.length).toBeGreaterThan(0)
    expect(state.inventory.cups.length).toBeGreaterThan(0)
    expect(state.history.find((day) => day.spoilLemonsCents > 0)?.spoilLemonsCents).toBe(lemonCost)
    while (state.day < 11) state = closeDay(state)
    expect(state.day).toBe(11)
    expect(state.inventory.sugar).toEqual([])
    expect(state.inventory.cups.length).toBeGreaterThan(0)
    const sugarNight = state.history.find((day) => day.spoilSugarCents > 0)
    expect(sugarNight?.day).toBe(10)
    expect(sugarNight?.spoilSugarCents).toBe(sugarCost)
    expect(state.history.reduce((sum, day) => sum + day.cogsCents, 0)).toBe(0)
  })

  it('treats an old save with no purchase day as bought today and defaults the keeper to the girl', () => {
    const game = createGame(7, 3, 'guy')
    const stale = {
      ...game,
      keeper: undefined,
      inventory: {
        ...game.inventory,
        lemons: [{ qty: 120, costCents: 680 }],
      },
    }
    const loaded = normalizeSave(stale)
    expect(loaded?.keeper).toBe('girl')
    expect(loaded?.inventory.lemons[0]?.boughtDay).toBe(game.day)
    expect(normalizeSave(createGame(7, 1, 'guy'))?.keeper).toBe('guy')
  })
})

describe('recipe screen', () => {
  it('does not render a taste score, an ice score, or a suggested price', () => {
    const state = createGame(7, 2)
    state.phase = 'recipe'
    const html = renderToStaticMarkup(
      <GameProvider initialState={state}>
        <Recipe onTitle={() => undefined} />
      </GameProvider>,
    )
    expect(html).not.toMatch(/Ice comfort/)
    expect(html).not.toMatch(/>Taste</)
    expect(html).not.toMatch(/Bright and balanced/)
    expect(html).not.toMatch(/Right chill/)
    expect(html).not.toMatch(/might pay/)
    expect(html).toContain('Lemons / pitcher')
    expect(html).toContain('Sugar / pitcher')
    expect(html).toContain('Ice / cup')
    expect(html).toContain('°C /')
    expect(html).toContain('°F')
  })

  it('does not preview overnight melt on the receipt', () => {
    let state = createGame(7, 8)
    state = reducer(state, { type: 'ack-morning' })!
    state = reducer(state, { type: 'add-pack', item: 'ice', packIndex: 0 })!
    state = reducer(state, { type: 'checkout' })!
    state = reducer(state, { type: 'set-hours', hours: 0 })!
    state = reducer(state, { type: 'open' })!
    state = reducer(state, { type: 'to-report' })!
    expect(state.pending?.iceMeltCents).toBeGreaterThan(0)
    const html = renderToStaticMarkup(
      <GameProvider initialState={state}>
        <Report onTitle={() => undefined} />
      </GameProvider>,
    )
    expect(html).not.toMatch(/melt tonight/i)
    expect(html).not.toMatch(/disappear/)
    expect(html).toContain('°C /')
    expect(morningBrief(state.forecast[0]!, null).text).not.toMatch(/melt/i)
  })
})

function closeDay(state: NonNullable<ReturnType<typeof reducer>>): NonNullable<ReturnType<typeof reducer>> {
  let next = reducer(state, { type: 'ack-morning' })!
  next = reducer(next, { type: 'checkout' })!
  next = reducer(next, { type: 'set-hours', hours: 0 })!
  next = reducer(next, { type: 'open' })!
  next = reducer(next, { type: 'to-report' })!
  return reducer(next, { type: 'advance' })!
}
