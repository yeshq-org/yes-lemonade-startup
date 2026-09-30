import { BASE_TRAFFIC } from './constants'
import type { Heat, Hours, Weather } from './types'
import { clamp } from './util'

export const IDEAL_ICE: Record<Heat, number> = {
  hot: 6,
  warm: 4,
  cool: 2,
  cold: 0,
}

const HEAT_MULT: Record<Heat, number> = {
  hot: 1.18,
  warm: 1,
  cool: 0.7,
  cold: 0.46,
}

const SKY_MULT = {
  clear: 1.22,
  cloudy: 0.92,
  rain: 0.55,
} as const

export function hourMultiplier(hours: number): number {
  switch (hours) {
    case 0:
      return 0
    case 4:
      return 0.55
    case 6:
      return 0.78
    case 8:
      return 1
    case 10:
      return 1.2
    case 12:
      return 1.35
    default:
      return 1
  }
}

export function popularityMultiplier(popularity: number): number {
  return 0.48 + (clamp(popularity, 0, 100) / 100) * 0.92
}

export function expectedVisitors(weather: Weather, hours: number, popularity: number): number {
  if (hours <= 0) return 0
  const mult = HEAT_MULT[weather.heat] * SKY_MULT[weather.sky] * hourMultiplier(hours) * popularityMultiplier(popularity)
  return Math.max(0, Math.round(BASE_TRAFFIC * mult))
}

export function trafficWord(visitors: number): string {
  if (visitors >= 90) return 'Buzzing'
  if (visitors >= 65) return 'Busy'
  if (visitors >= 40) return 'Steady'
  if (visitors >= 20) return 'Light'
  return 'Quiet'
}

/** 100 is a bright, balanced pitcher. Distance from 4 lemons and a 1:1 sugar ratio drops it. */
export function tasteScore(lemons: number, sugar: number): number {
  const lemonFit = Math.max(0, 100 - Math.abs(lemons - 4) * 16)
  const ratio = sugar / Math.max(1, lemons)
  const ratioFit = Math.max(0, 100 - Math.abs(ratio - 1) * 70)
  const richness = Math.min(lemons, sugar)
  const richFit = richness >= 3 ? 100 : richness * 28
  return clamp(lemonFit * 0.4 + ratioFit * 0.4 + richFit * 0.2, 0, 100)
}

export function iceComfort(ice: number, heat: Heat): number {
  return clamp(100 - Math.abs(ice - IDEAL_ICE[heat]) * 20, 0, 100)
}

export function tasteCaption(score: number): string {
  if (score >= 85) return 'Bright and balanced'
  if (score >= 70) return 'Pretty good'
  if (score >= 50) return 'Drinkable'
  return 'People will notice — and not in a good way'
}

export function iceCaption(score: number): string {
  if (score >= 85) return 'Right chill for this weather'
  if (score >= 60) return 'Close enough'
  return 'Wrong chill for today'
}

/** What a happy customer is glad to pay, in cents, before we apply elasticity. */
export function fairPriceCents(weather: Weather, taste: number, comfort: number): number {
  let cents = 100
  cents += { hot: 50, warm: 25, cool: 0, cold: -15 }[weather.heat]
  cents += { clear: 20, cloudy: 5, rain: -15 }[weather.sky]
  cents += Math.round((clamp(taste, 0, 100) / 100) * 25)
  cents += Math.round((clamp(comfort, 0, 100) / 100) * 15)
  return clamp(cents, 75, 250)
}

export function buyRate(priceCents: number, fairCents: number, taste: number): number {
  const ratio = priceCents / Math.max(1, fairCents)
  let rate: number
  if (ratio <= 0.8) rate = 0.97
  else if (ratio <= 1.05) rate = 0.97 - ((ratio - 0.8) / 0.25) * 0.12
  else if (ratio <= 1.45) rate = 0.85 - ((ratio - 1.05) / 0.4) * 0.45
  else rate = Math.max(0.05, 0.4 - (ratio - 1.45) * 0.35)
  const tasteFactor = 0.3 + 0.7 * (taste / 100)
  return clamp(rate * tasteFactor, 0, 0.98)
}

export function priceFeel(ratio: number): number {
  if (ratio <= 0.6) return 80
  if (ratio <= 1.08) return 96
  if (ratio <= 1.35) return 68
  if (ratio <= 1.7) return 42
  return 20
}

export function satisfactionScore(taste: number, comfort: number, ratio: number): number {
  return clamp(taste * 0.48 + comfort * 0.27 + priceFeel(ratio) * 0.25, 0, 100)
}

export function nextPopularity(
  current: number,
  satisfaction: number | null,
  soldOutRatio: number,
  previousSatisfaction: number | null,
): number {
  if (satisfaction === null) return clamp(Math.round(current), 0, 100)
  let delta = 0
  if (satisfaction >= 88) delta += 7
  else if (satisfaction >= 75) delta += 4
  else if (satisfaction >= 60) delta += 2
  else if (satisfaction >= 45) delta -= 3
  else delta -= 7
  if (soldOutRatio >= 0.3) delta -= 5
  else if (soldOutRatio >= 0.15) delta -= 2
  if (satisfaction >= 75 && previousSatisfaction !== null && previousSatisfaction >= 75) delta += 2
  return clamp(Math.round(current + delta), 0, 100)
}

export function dayFees(hours: Hours): { standFeeCents: number; helperCents: number } {
  if (hours <= 0) return { standFeeCents: 0, helperCents: 0 }
  const standFeeCents = hours <= 6 ? 100 : hours <= 8 ? 150 : 200
  const helperCents = hours >= 12 ? 500 : hours >= 10 ? 300 : 0
  return { standFeeCents, helperCents }
}

export function hourNote(hours: Hours): string {
  const fees = dayFees(hours)
  if (hours === 0) return 'No fee. No customers.'
  const helper = fees.helperCents > 0 ? ` + ${fees.helperCents / 100} helper` : ''
  return `Stand fee $${(fees.standFeeCents / 100).toFixed(2)}${helper}`
}
