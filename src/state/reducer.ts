import { settleCrowd } from '../game/crowd'
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS } from '../game/constants'
import { dayFees } from '../game/demand'
import { applyCart, cartCostCents, cloneInventory, meltIce, spoilProduce } from '../game/inventory'
import { simulateDay } from '../game/simulate'
import { createGame } from '../game/setup'
import { planCrowd, reviseCrowd } from '../game/sidewalk'
import type { CartLine, GameState, Hours, ItemId, Keeper, SeasonLength } from '../game/types'
import { HOUR_CHOICES } from '../game/types'
import { clamp } from '../game/util'

export type Action =
  | { type: 'start'; seasonDays: SeasonLength; seed: number; keeper: Keeper }
  | { type: 'abandon' }
  | { type: 'ack-morning' }
  | { type: 'add-pack'; item: ItemId; packIndex: number }
  | { type: 'remove-pack'; item: ItemId; packIndex: number }
  | { type: 'clear-cart' }
  | { type: 'checkout' }
  | { type: 'to-shop' }
  | { type: 'set-lemons'; value: number }
  | { type: 'set-sugar'; value: number }
  | { type: 'set-ice'; value: number }
  | { type: 'set-price'; cents: number; at?: number }
  | { type: 'set-hours'; hours: Hours }
  | { type: 'open' }
  | { type: 'to-report' }
  | { type: 'advance' }
  | { type: 'reflect'; index: 0 | 1 | 2; text: string }

function todayPrices(state: GameState) {
  return state.priceBook[state.day - 1]
}

function withLine(cart: CartLine[], item: ItemId, packIndex: number, delta: number): CartLine[] {
  const existing = cart.find((line) => line.item === item && line.packIndex === packIndex)
  if (!existing) {
    if (delta <= 0) return cart
    return [...cart, { item, packIndex, packs: delta }]
  }
  const packs = existing.packs + delta
  if (packs <= 0) return cart.filter((line) => line !== existing)
  return cart.map((line) => (line === existing ? { ...line, packs } : line))
}

export function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'abandon') return null
  if (action.type === 'start') return createGame(action.seasonDays, action.seed, action.keeper)
  if (!state) return state

  switch (action.type) {
    case 'ack-morning':
      if (state.phase !== 'morning') return state
      return { ...state, phase: 'shop', cart: [] }
    case 'add-pack': {
      if (state.phase !== 'shop') return state
      const prices = todayPrices(state)
      if (!prices) return state
      if (action.packIndex < 0 || action.packIndex > 2) return state
      const nextCart = withLine(state.cart, action.item, action.packIndex, 1)
      if (cartCostCents(nextCart, prices) > state.cashCents) return state
      const line = nextCart.find((entry) => entry.item === action.item && entry.packIndex === action.packIndex)
      if (line && line.packs > 12) return state
      return { ...state, cart: nextCart }
    }
    case 'remove-pack': {
      if (state.phase !== 'shop') return state
      return { ...state, cart: withLine(state.cart, action.item, action.packIndex, -1) }
    }
    case 'clear-cart':
      if (state.phase !== 'shop') return state
      return { ...state, cart: [] }
    case 'checkout': {
      if (state.phase !== 'shop') return state
      const prices = todayPrices(state)
      if (!prices) return state
      const cost = cartCostCents(state.cart, prices)
      if (cost > 0 && cost > state.cashCents) return state
      return {
        ...state,
        cashCents: state.cashCents - cost,
        inventory: applyCart(state.inventory, state.cart, prices, state.day),
        cart: [],
        phase: 'recipe',
      }
    }
    case 'to-shop':
      if (state.phase !== 'recipe') return state
      return { ...state, phase: 'shop' }
    case 'set-lemons':
      return { ...state, recipe: { ...state.recipe, lemons: clamp(Math.round(action.value), 1, 8) } }
    case 'set-sugar':
      return { ...state, recipe: { ...state.recipe, sugar: clamp(Math.round(action.value), 1, 8) } }
    case 'set-ice':
      return { ...state, recipe: { ...state.recipe, ice: clamp(Math.round(action.value), 0, 8) } }
    case 'set-price': {
      const priceCents = clamp(Math.round(action.cents), PRICE_MIN_CENTS, PRICE_MAX_CENTS)
      if (state.phase !== 'selling') return { ...state, recipe: { ...state.recipe, priceCents } }
      if (!state.shelf || !state.arrivals || !state.pending || priceCents === state.recipe.priceCents) return state
      const arrivals = reviseCrowd(state.arrivals, action.at ?? 0, priceCents, state.pending)
      const settled = settleCrowd(state.pending, arrivals, state.shelf.inventory, priceCents)
      return {
        ...state,
        recipe: { ...state.recipe, priceCents },
        arrivals,
        pending: settled.result,
        inventory: settled.inventory,
        cashCents: state.shelf.cashAfterFeesCents + settled.result.revenueCents,
        popularity: settled.result.popularityAfter,
      }
    }
    case 'set-hours':
      if (!HOUR_CHOICES.includes(action.hours)) return state
      return { ...state, hours: action.hours }
    case 'open': {
      if (state.phase !== 'recipe') return state
      const weather = state.forecast[state.day - 1]
      if (!weather) return state
      const previous = state.history[state.history.length - 1]
      const played = simulateDay({
        day: state.day,
        seed: state.seed,
        weather,
        inventory: state.inventory,
        recipe: state.recipe,
        hours: state.hours,
        popularity: state.popularity,
        previousSatisfaction: previous?.satisfaction ?? null,
      })
      const fees = dayFees(state.hours)
      const cashAfterFeesCents = state.cashCents - fees.standFeeCents - fees.helperCents
      return {
        ...state,
        inventory: played.inventory,
        cashCents: cashAfterFeesCents + played.result.revenueCents,
        popularity: played.popularity,
        pending: played.result,
        shelf: { inventory: cloneInventory(state.inventory), cashAfterFeesCents },
        arrivals: planCrowd(played.result),
        phase: 'selling',
      }
    }
    case 'to-report':
      if (state.phase !== 'selling' || !state.pending) return state
      return { ...state, phase: 'report', arrivals: null, shelf: null }
    case 'advance': {
      if (state.phase !== 'report' || !state.pending) return state
      const melted = meltIce(state.inventory)
      const nextMorning = state.day + 1
      const spoiled =
        state.day >= state.seasonDays
          ? { inventory: melted.inventory, lemonsQty: 0, lemonsCents: 0, sugarQty: 0, sugarCents: 0 }
          : spoilProduce(melted.inventory, nextMorning)
      const record = {
        ...state.pending,
        iceMeltQty: melted.meltQty,
        iceMeltCents: melted.meltCents,
        spoilLemonsQty: spoiled.lemonsQty,
        spoilLemonsCents: spoiled.lemonsCents,
        spoilSugarQty: spoiled.sugarQty,
        spoilSugarCents: spoiled.sugarCents,
      }
      const history = [...state.history, record]
      if (state.day >= state.seasonDays) {
        return { ...state, inventory: melted.inventory, history, pending: null, phase: 'career', cart: [] }
      }
      return {
        ...state,
        inventory: spoiled.inventory,
        history,
        pending: null,
        day: state.day + 1,
        phase: 'morning',
        cart: [],
      }
    }
    case 'reflect': {
      const text = action.text.slice(0, 280)
      const reflections: [string, string, string] = [...state.reflections]
      reflections[action.index] = text
      return { ...state, reflections }
    }
    default:
      return state
  }
}

