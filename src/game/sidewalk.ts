import { buyRate } from './demand'
import { formatMoney } from './money'
import type { Arrival, DayResult } from './types'

export type PedKind = 'buy' | 'pass' | 'out'
export type Pedestrian = Arrival

const OUT_LINE = 'I wanted a cup. You are already out.'

export interface SidewalkCast {
  people: Pedestrian[]
  duration: number
}

const PASS_TRAVEL = 7.4
const APPROACH = 1.5
/** Buyer comment used to stay up only while they held the cup. */
export const BUY_COMMENT_HOLD_SEC = 2.5
/** Sold-out comment used to stay up only while they stood at an empty stand. */
export const OUT_COMMENT_HOLD_SEC = 1.45
/**
 * Extra time the sidewalk comment stays after the person starts to leave.
 * Buyer popup: 2500ms before, 3400ms now. Sold-out popup: 1450ms before, 2350ms now.
 */
export const COMMENT_LINGER_SEC = 0.9
const LEAVE = 1.4

export function commentDurationSec(kind: 'buy' | 'out'): number {
  const hold = kind === 'buy' ? BUY_COMMENT_HOLD_SEC : OUT_COMMENT_HOLD_SEC
  return hold + COMMENT_LINGER_SEC
}

export function commentVisible(person: { take: number; depart: number }, time: number): boolean {
  return time >= person.take && time <= person.depart + COMMENT_LINGER_SEC
}

function pick(variant: number, lines: readonly string[]): string {
  return lines[Math.abs(variant) % lines.length]!
}

export function buyerComments(result: DayResult): string[] {
  return [tasteLine(result), priceLine(result), iceLine(result), weatherLine(result)]
}

function tasteLine(result: DayResult, variant = 0): string {
  const { recipe, taste } = result
  if (recipe.sugar >= recipe.lemons + 3) return pick(variant, ['Too sweet.', 'Way too sweet.'])
  if (recipe.lemons >= recipe.sugar + 3) return pick(variant, ['Too sour.', 'Way too sour.'])
  if (taste >= 85) return pick(variant, ['Great lemonade!', 'Love this cup!'])
  if (taste >= 65) return pick(variant, ['Pretty good!', 'I like it!'])
  return pick(variant, ['Not great.', 'Did not like it.'])
}

function priceLine(result: DayResult, priceCents = result.recipe.priceCents, variant = 0): string {
  const price = formatMoney(priceCents)
  const ratio = priceCents / Math.max(1, result.fairPriceCents)
  if (ratio < 0.8) return pick(variant, [`Love this price — ${price}!`, `A deal at ${price}!`])
  if (ratio <= 1.15) return pick(variant, [`Fair price. ${price}.`, `Good price. ${price}.`])
  return pick(variant, [`Too expensive. ${price}.`, `${price} is too much.`])
}

function iceLine(result: DayResult, variant = 0): string {
  const { recipe, weather, iceComfort } = result
  const hot = weather.heat === 'hot' || weather.heat === 'warm'
  const cool = weather.heat === 'cold' || weather.heat === 'cool'
  if (hot && recipe.ice <= 1) return pick(variant, ['Not enough ice.', 'Needs more ice.'])
  if (cool && recipe.ice >= 6) return pick(variant, ['Too much ice.', 'Way too much ice.'])
  if (iceComfort >= 85) return pick(variant, ['Love the ice!', 'The ice is perfect!'])
  return pick(variant, ['The ice is off.', 'Did not like the ice.'])
}

function weatherLine(result: DayResult, variant = 0): string {
  const liked = result.taste >= 65
  if (result.weather.sky === 'rain') {
    return liked ? pick(variant, ['Worth the rain!', 'Liked it in the rain!']) : pick(variant, ['Not worth the rain.', 'Rain, and I did not like it.'])
  }
  if (result.weather.heat === 'hot' && result.weather.sky === 'clear') {
    return liked ? pick(variant, ['Perfect on a hot day!', 'Loved it in this heat!']) : pick(variant, ['Hot day. Still not good.', 'Not good, even in this heat.'])
  }
  if (result.weather.heat === 'cold') {
    return liked ? pick(variant, ['Liked it in the cold!', 'Good, even on a cold day!']) : pick(variant, ['Did not like it in the cold.', 'Cold day, and not good.'])
  }
  return liked ? pick(variant, ['Glad I stopped!', 'Liked it!']) : pick(variant, ['Should have kept walking.', 'Did not like it.'])
}

const BUY_CAP = 8
const PASS_CAP = 5
const OUT_CAP = 3

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor(total / parts)
  const extra = total - base * parts
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0))
}

function slotCount(total: number, cap: number): number {
  if (total <= 0) return 0
  return Math.min(total, cap)
}

/** Buyers and walkers alternate, then people who find the stand empty. */
function kindSequence(buySlots: number, passSlots: number, outSlots: number): PedKind[] {
  const kinds: PedKind[] = []
  let buys = buySlots
  let passes = passSlots
  if (buys > 0) {
    kinds.push('buy')
    buys -= 1
    if (passes > 0) {
      kinds.push('pass')
      passes -= 1
    }
  }
  while (buys > 0 || passes > 0) {
    if (buys > 0) {
      kinds.push('buy')
      buys -= 1
    }
    if (passes > 0) {
      kinds.push('pass')
      passes -= 1
    }
  }
  for (let index = 0; index < outSlots; index += 1) kinds.push('out')
  return kinds
}

function commentFor(result: DayResult, kind: PedKind, priceCents: number, buyerIndex: number): string | null {
  if (kind === 'out') return OUT_LINE
  if (kind !== 'buy') return null
  const variant = Math.floor(buyerIndex / 4)
  const lines = [
    tasteLine(result, variant),
    priceLine(result, priceCents, variant),
    iceLine(result, variant),
    weatherLine(result, variant),
  ]
  return lines[buyerIndex % lines.length]!
}

function schedule(
  kind: PedKind,
  id: number,
  start: number,
  comment: string | null,
  weight: number,
  priceCents: number,
  counts: boolean,
): Pedestrian {
  const look = id % 6
  if (kind === 'pass') {
    const end = start + PASS_TRAVEL
    const cross = start + PASS_TRAVEL * 0.46
    return {
      id,
      kind,
      comment,
      look,
      weight,
      priceCents,
      counts,
      start,
      arrive: cross,
      reach: cross,
      take: cross,
      depart: end,
      end,
    }
  }
  const arrive = start + APPROACH
  const take = kind === 'buy' ? arrive + 1.15 : arrive
  const hold = kind === 'buy' ? BUY_COMMENT_HOLD_SEC : OUT_COMMENT_HOLD_SEC
  const depart = (kind === 'buy' ? take : arrive) + hold
  const end = depart + LEAVE
  return {
    id,
    kind,
    comment,
    look,
    weight,
    priceCents,
    counts,
    start,
    arrive,
    reach: arrive,
    take,
    depart,
    end,
  }
}

function scenery(startId: number): Pedestrian[] {
  return [0, 1, 2].map((offset) =>
    schedule('pass', startId + offset, 0.3 + offset * 1.6, null, 0, 0, false),
  )
}

/**
 * Figures for the sidewalk. Each one stands for one or more real customers so
 * Served, Walked, and Sold out can tick when that figure finishes the action
 * and still add up to the day.
 */
export function planCrowd(result: DayResult, startAt = 0.2, idStart = 1): Pedestrian[] {
  if (result.potential <= 0 || (result.sold <= 0 && result.walkedAway <= 0 && result.soldOutMissed <= 0)) {
    return scenery(idStart)
  }
  const buySlots = slotCount(result.sold, BUY_CAP)
  const passSlots = slotCount(result.walkedAway, PASS_CAP)
  const outSlots = slotCount(result.soldOutMissed, OUT_CAP)
  const buyWeights = splitEvenly(result.sold, buySlots)
  const passWeights = splitEvenly(result.walkedAway, passSlots)
  const outWeights = splitEvenly(result.soldOutMissed, outSlots)
  const kinds = kindSequence(buySlots, passSlots, outSlots)
  let cursor = startAt
  let id = idStart
  let buyerIndex = 0
  let buyCursor = 0
  let passCursor = 0
  let outCursor = 0
  const price = result.recipe.priceCents
  const crowd = kinds.map((kind) => {
    const weight = kind === 'buy' ? buyWeights[buyCursor++]! : kind === 'pass' ? passWeights[passCursor++]! : outWeights[outCursor++]!
    const comment = commentFor(result, kind, price, buyerIndex)
    if (kind === 'buy') buyerIndex += 1
    const person = schedule(kind, id, cursor, comment, weight, price, true)
    id += 1
    cursor += kind === 'pass' ? 0.9 : kind === 'buy' ? 1.32 : 1.15
    return person
  })
  if (passSlots === 0 && buySlots > 0) {
    crowd.splice(1, 0, schedule('pass', id, Math.max(startAt + 0.35, cursor * 0.15), null, 0, price, false))
  }
  return crowd
}

export interface Tally {
  served: number
  walked: number
  missed: number
  revenueCents: number
}

const OPEN_MINUTE = 9 * 60
const CLOSE_MINUTE = 17 * 60

/**
 * How far the shown crowd has carried the day, from 0 at 9:00am to 1 at 5:00pm.
 * It stays at 0 until the first person is shown, then moves as each one acts,
 * and reaches 1 only after the last person has left.
 */
export function crowdProgress(people: Pedestrian[], time: number): number {
  if (people.length === 0) return 0
  const marks = people.map((person) => person.take).sort((a, b) => a - b)
  const doneAt = Math.max(...people.map((person) => person.end))
  if (time < marks[0]!) return 0
  if (time >= doneAt) return 1
  let shown = 0
  while (shown < marks.length && time >= marks[shown]!) shown += 1
  const from = marks[shown - 1]!
  const to = shown < marks.length ? marks[shown]! : doneAt
  const along = (time - from) / Math.max(0.001, to - from)
  return Math.min(1, (shown - 1 + along) / marks.length)
}

/** Clock label for the sidewalk. The fixed 8-hour day, shown from 9:00am to 5:00pm. */
export function sidewalkClock(progress: number): string {
  const minute = OPEN_MINUTE + Math.round(Math.min(1, Math.max(0, progress)) * (CLOSE_MINUTE - OPEN_MINUTE))
  const hour24 = Math.floor(minute / 60)
  const mins = minute % 60
  const suffix = hour24 >= 12 ? 'pm' : 'am'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${mins.toString().padStart(2, '0')}${suffix}`
}

/** Counts only actions that have already happened by `time`. */
export function tallyAt(people: Pedestrian[], time: number): Tally {
  const tally: Tally = { served: 0, walked: 0, missed: 0, revenueCents: 0 }
  for (const person of people) {
    if (!person.counts || person.weight <= 0 || time < person.take) continue
    if (person.kind === 'buy') {
      tally.served += person.weight
      tally.revenueCents += person.weight * person.priceCents
    } else if (person.kind === 'pass') tally.walked += person.weight
    else tally.missed += person.weight
  }
  return tally
}

/**
 * People who have not reached the stand yet are rescripted at the new price.
 * Anyone already there keeps the price they walked up to.
 */
export function reviseCrowd(people: Pedestrian[], time: number, newPrice: number, pending: DayResult): Pedestrian[] {
  const locked = people.filter((person) => person.counts && person.arrive <= time)
  const future = people.filter((person) => person.counts && person.arrive > time)
  const decor = people.filter((person) => !person.counts)
  if (future.length === 0) return people
  if (future.every((person) => person.priceCents === newPrice)) return people

  const lockedSold = locked.filter((person) => person.kind === 'buy').reduce((sum, person) => sum + person.weight, 0)
  const remaining = future.reduce((sum, person) => sum + person.weight, 0)
  const cupsLeft = Math.max(0, pending.cupsReady - lockedSold)
  const rate = buyRate(newPrice, Math.max(1, pending.fairPriceCents), pending.taste)
  const willing = Math.min(remaining, Math.round(remaining * rate))
  const sold = Math.min(willing, cupsLeft)
  const missed = willing - sold
  const walked = remaining - willing
  const nextId = Math.max(0, ...people.map((person) => person.id)) + 1
  const earliest = Math.min(...future.map((person) => person.start))
  const startAt = Math.max(earliest, time + 0.05)
  const fresh = planFromCounts(pending, sold, walked, missed, newPrice, startAt, nextId)
  return [...locked, ...fresh, ...decor].sort((a, b) => a.id - b.id)
}

function planFromCounts(
  result: DayResult,
  sold: number,
  walked: number,
  missed: number,
  priceCents: number,
  startAt: number,
  idStart: number,
): Pedestrian[] {
  if (sold <= 0 && walked <= 0 && missed <= 0) return []
  const shaped: DayResult = {
    ...result,
    sold,
    walkedAway: walked,
    soldOutMissed: missed,
    potential: sold + walked + missed,
    recipe: { ...result.recipe, priceCents },
  }
  return planCrowd(shaped, startAt, idStart)
}

/** A short cast for the sidewalk. Real totals stay on the receipt; this is the crowd you watch. */
export function buildSidewalk(result: DayResult): SidewalkCast {
  const people = planCrowd(result)
  const duration = Math.max(2, ...people.map((person) => person.end)) + 0.25
  return { people, duration }
}

/** Buyer stops just past the stand, beside the counter. */
export function stopX(width: number): number {
  return Math.max(178, Math.min(196, width - 96))
}

/** Horizontal position in the scene. Null when the person is offstage. */
export function pedestrianX(person: Pedestrian, time: number, width: number): number | null {
  if (time < person.start || time > person.end) return null
  const from = width + 24
  const stop = stopX(width)
  const to = -68
  const slide = (origin: number, dest: number, amount: number) => origin + (dest - origin) * Math.min(1, Math.max(0, amount))
  if (person.kind === 'pass') {
    return slide(from, to, (time - person.start) / Math.max(0.001, person.end - person.start))
  }
  if (time <= person.arrive) {
    return slide(from, stop, (time - person.start) / Math.max(0.001, person.arrive - person.start))
  }
  if (time <= person.depart) return stop
  return slide(stop, to, (time - person.depart) / Math.max(0.001, person.end - person.depart))
}

export function isWalking(person: Pedestrian, time: number): boolean {
  if (time < person.start || time > person.end) return false
  if (person.kind !== 'pass' && time >= person.arrive && time <= person.depart) return false
  return true
}

export interface StillFigure {
  person: Pedestrian
  x: number
}

/** A frozen sidewalk: someone at the stand, someone who already passed, someone still coming. */
export function stillFigures(cast: SidewalkCast, width: number): StillFigure[] {
  const figures: StillFigure[] = []
  const buyer = cast.people.find((person) => person.kind === 'buy') ?? cast.people.find((person) => person.kind === 'out')
  const passers = cast.people.filter((person) => person.kind === 'pass')
  if (buyer) figures.push({ person: buyer, x: stopX(width) })
  if (passers[0]) figures.push({ person: passers[0], x: Math.min(width - 64, stopX(width) + 118) })
  if (!buyer) {
    passers.slice(1, 3).forEach((person, index) => {
      figures.push({ person, x: Math.min(width - 64, 210 + index * 72) })
    })
  }
  return figures
}
