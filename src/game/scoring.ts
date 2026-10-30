import {
  STARTING_CASH_CENTS,
  TIER_BOSS_EPH,
  TIER_GROW_EPH,
  TIER_SCALE_EPH,
} from './constants'
import { inventoryValueCents } from './inventory'
import { roundHalfAway } from './money'
import type { DayResult, GameState } from './types'

export type TierId = 'side' | 'growing' | 'scalable' | 'boss'

export interface Badge {
  id: string
  name: string
  description: string
  earned: boolean
}

export interface SeasonSummary {
  daysPlayed: number
  daysOpened: number
  totalCustomers: number
  totalSales: number
  totalRevenueCents: number
  totalCogsCents: number
  totalGrossCents: number
  totalOtherCents: number
  totalNetCents: number
  totalHours: number
  earningsPerHourCents: number | null
  cashCents: number
  inventoryCents: number
  netWorthCents: number
  totalIceMeltCents: number
  totalIceBought: number
  avgSatisfaction: number | null
  best: DayResult | null
  worst: DayResult | null
  tier: TierId
  badges: Badge[]
}

export const TIER_META: Record<TierId, { name: string; blurb: string }> = {
  side: {
    name: 'Side Hustle',
    blurb: 'You learned the loop. The stand is not paying you like a real job yet.',
  },
  growing: {
    name: 'Growing',
    blurb: 'Profit showed up. Guard your hours and your waste and it can turn into a model.',
  },
  scalable: {
    name: 'Scalable',
    blurb: 'People want the cup, and the math works. This is a stand you could run again on purpose.',
  },
  boss: {
    name: 'Boss',
    blurb: 'You built a business, not a busy day. Your time was worth real money.',
  },
}

function better(a: DayResult, b: DayResult): boolean {
  const ae = a.earningsPerHourCents ?? -Infinity
  const be = b.earningsPerHourCents ?? -Infinity
  if (ae !== be) return ae > be
  return a.netCents > b.netCents
}

export function summarize(state: GameState): SeasonSummary {
  const days = state.history
  const opened = days.filter((day) => day.hours > 0)
  const totalRevenueCents = days.reduce((sum, day) => sum + day.revenueCents, 0)
  const totalCogsCents = days.reduce((sum, day) => sum + day.cogsCents, 0)
  const totalGrossCents = days.reduce((sum, day) => sum + day.grossCents, 0)
  const totalOtherCents = days.reduce((sum, day) => sum + day.otherCents, 0)
  const totalNetCents = days.reduce((sum, day) => sum + day.netCents, 0)
  const totalHours = days.reduce((sum, day) => sum + day.hours, 0)
  // Receipt and tiers use earnings per hour. Leaderboards rank by net profit, then this figure only breaks a tie.
  const earningsPerHourCents = totalHours > 0 ? roundHalfAway(totalNetCents / totalHours) : null
  const inventoryCents = inventoryValueCents(state.inventory)
  const netWorthCents = state.cashCents + inventoryCents
  const totalIceMeltCents = days.reduce((sum, day) => sum + day.iceMeltCents, 0)
  const rated = opened.filter((day) => day.satisfaction !== null)
  const avgSatisfaction =
    rated.length === 0 ? null : Math.round(rated.reduce((sum, day) => sum + (day.satisfaction ?? 0), 0) / rated.length)

  let best: DayResult | null = null
  let worst: DayResult | null = null
  for (const day of opened) {
    if (!best || better(day, best)) best = day
    if (!worst || better(worst, day)) worst = day
  }

  const summary: SeasonSummary = {
    daysPlayed: days.length,
    daysOpened: opened.length,
    totalCustomers: days.reduce((sum, day) => sum + day.potential, 0),
    totalSales: days.reduce((sum, day) => sum + day.sold, 0),
    totalRevenueCents,
    totalCogsCents,
    totalGrossCents,
    totalOtherCents,
    totalNetCents,
    totalHours,
    earningsPerHourCents,
    cashCents: state.cashCents,
    inventoryCents,
    netWorthCents,
    totalIceMeltCents,
    totalIceBought: 0,
    avgSatisfaction,
    best,
    worst,
    tier: 'side',
    badges: [],
  }
  summary.tier = gradeTier(summary)
  summary.badges = gradeBadges(state, summary)
  return summary
}

function gradeTier(summary: SeasonSummary): TierId {
  const hourly = summary.earningsPerHourCents
  if (hourly === null) return 'side'
  const grew = summary.netWorthCents > STARTING_CASH_CENTS
  const held = summary.netWorthCents >= STARTING_CASH_CENTS
  if (hourly >= TIER_BOSS_EPH && grew && (summary.avgSatisfaction ?? 0) >= 60) return 'boss'
  if (hourly >= TIER_SCALE_EPH && held) return 'scalable'
  if (hourly >= TIER_GROW_EPH && summary.netWorthCents >= STARTING_CASH_CENTS - 500) return 'growing'
  return 'side'
}

function icePurchasedQty(state: GameState): number {
  const used = state.history.reduce((sum, day) => sum + day.sold * day.recipe.ice, 0)
  const melted = state.history.reduce((sum, day) => sum + day.iceMeltQty, 0)
  const still = state.inventory.ice.reduce((sum, lot) => sum + lot.qty, 0)
  return used + melted + still
}

function gradeBadges(state: GameState, summary: SeasonSummary): Badge[] {
  const boughtIce = icePurchasedQty(state)
  const wastedIce = state.history.reduce((sum, day) => sum + day.iceMeltQty, 0)
  const wasteRate = boughtIce > 0 ? wastedIce / boughtIce : 1
  const grossMargin = summary.totalRevenueCents > 0 ? summary.totalGrossCents / summary.totalRevenueCents : 0
  const rainWin = state.history.some((day) => day.weather.sky === 'rain' && day.netCents > 0 && day.sold >= 5)
  const hadLoss = state.history.some((day) => day.netCents < 0)
  const finished = state.history.length === state.seasonDays

  return [
    {
      id: 'ice-wisely',
      name: 'Ice Wisely',
      description: 'Wasted under a quarter of the ice you bought.',
      earned: boughtIce >= 50 && wasteRate <= 0.25,
    },
    {
      id: 'crowd-favorite',
      name: 'Crowd Favorite',
      description: 'Average satisfaction stayed at 80 or higher on days you opened.',
      earned: summary.daysOpened > 0 && (summary.avgSatisfaction ?? 0) >= 80,
    },
    {
      id: 'rain-ready',
      name: 'Rain Ready',
      description: 'You made a profit on a rainy day and still served at least 5 cups.',
      earned: rainWin,
    },
    {
      id: 'real-margin',
      name: 'Real Margin',
      description: 'At least 55% of revenue survived the cost of goods.',
      earned: summary.totalSales >= 20 && grossMargin >= 0.55,
    },
    {
      id: 'worth-your-time',
      name: 'Worth Your Time',
      description: 'Season earnings reached $4.00 an hour or more.',
      earned: (summary.earningsPerHourCents ?? 0) >= 400,
    },
    {
      id: 'closer',
      name: 'Closer',
      description: 'You played every day you signed up for.',
      earned: finished,
    },
    {
      id: 'bounce-back',
      name: 'Bounce Back',
      description: 'A losing day happened, and you still finished richer than your $20 start.',
      earned: hadLoss && summary.netWorthCents > STARTING_CASH_CENTS,
    },
  ]
}

export function chainFromDay(day: DayResult): ChainStats {
  return {
    customers: day.potential,
    sales: day.sold,
    revenueCents: day.revenueCents,
    costCents: day.cogsCents + day.otherCents,
    profitCents: day.netCents,
    hours: day.hours,
    hourlyCents: day.earningsPerHourCents,
  }
}

export function chainFromSummary(summary: SeasonSummary): ChainStats {
  return {
    customers: summary.totalCustomers,
    sales: summary.totalSales,
    revenueCents: summary.totalRevenueCents,
    costCents: summary.totalCogsCents + summary.totalOtherCents,
    profitCents: summary.totalNetCents,
    hours: summary.totalHours,
    hourlyCents: summary.earningsPerHourCents,
  }
}

export interface ChainStats {
  customers: number
  sales: number
  revenueCents: number
  costCents: number
  profitCents: number
  hours: number
  hourlyCents: number | null
}

