import { CATALOG } from './catalog'
import type { DayPrices, Heat, Sky, Weather } from './types'

const HEATS: Heat[] = ['hot', 'warm', 'cool', 'cold']
const SKIES: Sky[] = ['clear', 'cloudy', 'rain']

const TEMP: Record<Heat, [number, number]> = {
  hot: [90, 99],
  warm: [76, 89],
  cool: [62, 75],
  cold: [46, 61],
}

function pickWeighted<T>(rng: () => number, rows: { value: T; weight: number }[]): T {
  const total = rows.reduce((sum, row) => sum + row.weight, 0)
  let cursor = rng() * total
  for (const row of rows) {
    cursor -= row.weight
    if (cursor <= 0) return row.value
  }
  return rows[rows.length - 1]!.value
}

export function rollWeather(rng: () => number): Weather {
  const heat = pickWeighted(rng, [
    { value: HEATS[0]!, weight: 34 },
    { value: HEATS[1]!, weight: 34 },
    { value: HEATS[2]!, weight: 20 },
    { value: HEATS[3]!, weight: 12 },
  ])
  const sky = pickWeighted(rng, [
    { value: SKIES[0]!, weight: 42 },
    { value: SKIES[1]!, weight: 33 },
    { value: SKIES[2]!, weight: 25 },
  ])
  const [min, max] = TEMP[heat]
  const tempF = min + Math.floor(rng() * (max - min + 1))
  return { heat, sky, tempF }
}

function jitter(baseCents: number, rng: () => number): number {
  const factor = 0.9 + rng() * 0.2
  return Math.max(1, Math.round(baseCents * factor))
}

export function rollPrices(rng: () => number): DayPrices {
  const item = (key: keyof DayPrices): [number, number, number] => [
    jitter(CATALOG[key][0].baseCents, rng),
    jitter(CATALOG[key][1].baseCents, rng),
    jitter(CATALOG[key][2].baseCents, rng),
  ]
  return {
    cups: item('cups'),
    lemons: item('lemons'),
    sugar: item('sugar'),
    ice: item('ice'),
  }
}

export function weatherPhrase(weather: Weather): string {
  const heat = { hot: 'Hot', warm: 'Warm', cool: 'Cool', cold: 'Cold' }[weather.heat]
  const sky = { clear: 'clear', cloudy: 'cloudy', rain: 'rainy' }[weather.sky]
  return `${heat} and ${sky}`
}

export function weekdayName(dayNumber: number): string {
  const names = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  return names[(dayNumber - 1) % 7]!
}
