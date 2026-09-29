import { formatMoney } from './money'
import type { DayResult } from './types'

export type PedKind = 'buy' | 'pass' | 'out'

export interface Pedestrian {
  id: number
  kind: PedKind
  /** Spoken after a sip, or a short sold-out line. Walkers stay quiet. */
  comment: string | null
  look: number
  start: number
  arrive: number
  depart: number
  end: number
}

export interface SidewalkCast {
  people: Pedestrian[]
  duration: number
}

const PASS_TRAVEL = 7.4
const APPROACH = 1.5
const BUY_HOLD = 2.5
const OUT_HOLD = 1.45
const LEAVE = 1.4

export function buyerComments(result: DayResult): string[] {
  return [tasteLine(result), priceLine(result), iceLine(result), weatherLine(result)]
}

function tasteLine(result: DayResult): string {
  const { recipe, taste } = result
  if (recipe.sugar >= recipe.lemons + 3) return 'Way too sweet. The sugar took over the cup.'
  if (recipe.lemons >= recipe.sugar + 3) return 'That is sour. My whole face got involved.'
  if (taste >= 85) return 'Bright and balanced. It tastes like real lemonade.'
  if (taste >= 65) return 'Pretty good. Sweet and sour are close.'
  return 'I drank it, but the recipe tastes unfinished.'
}

function priceLine(result: DayResult): string {
  const price = formatMoney(result.recipe.priceCents)
  const ratio = result.recipe.priceCents / Math.max(1, result.fairPriceCents)
  if (ratio < 0.8) return `${price} is a bargain. I would have paid more for this.`
  if (ratio <= 1.15) return `${price} feels fair now that the cup is empty.`
  return `${price} is a lot once you have already swallowed it.`
}

function iceLine(result: DayResult): string {
  const { recipe, weather, iceComfort } = result
  const hot = weather.heat === 'hot' || weather.heat === 'warm'
  const cool = weather.heat === 'cold' || weather.heat === 'cool'
  if (hot && recipe.ice <= 1) return 'Not enough ice. The day is warmer than the cup.'
  if (cool && recipe.ice >= 6) return 'Too much ice for this weather. I mostly drank cold water.'
  if (iceComfort >= 85) return hot ? 'That ice belongs on a hot sidewalk.' : 'The chill fits the day.'
  return 'The ice is a little off for this sky.'
}

function weatherLine(result: DayResult): string {
  if (result.weather.sky === 'rain') return 'I stood in the rain to finish that.'
  if (result.weather.heat === 'hot' && result.weather.sky === 'clear') return 'Hot street, cold cup. That is why I stopped.'
  if (result.weather.heat === 'cold') return 'Cold day for lemonade. I still finished it.'
  return 'Good thing I was already walking by.'
}

function castKinds(result: DayResult): PedKind[] {
  if (result.hours <= 0 || (result.sold <= 0 && result.soldOutMissed <= 0)) return ['pass', 'pass', 'pass']
  const kinds: PedKind[] = []
  if (result.sold > 0) kinds.push('buy', 'pass', 'buy', 'pass')
  else kinds.push('pass', 'out', 'pass')
  if (result.soldOutMissed > 0) kinds.push('out')
  else if (result.sold > 0) kinds.push('buy')
  kinds.push('pass')
  return kinds
}

function schedule(kind: PedKind, id: number, start: number, comment: string | null): Pedestrian {
  if (kind === 'pass') {
    const end = start + PASS_TRAVEL
    return { id, kind, comment: null, look: id % 6, start, arrive: end, depart: end, end }
  }
  const hold = kind === 'buy' ? BUY_HOLD : OUT_HOLD
  const arrive = start + APPROACH
  const depart = arrive + hold
  const end = depart + LEAVE
  return { id, kind, comment, look: id % 6, start, arrive, depart, end }
}

/** A short cast for the sidewalk. Real totals stay on the receipt; this is the crowd you watch. */
export function buildSidewalk(result: DayResult): SidewalkCast {
  const comments = buyerComments(result)
  let cursor = 0.1
  let buyerIndex = 0
  const people = castKinds(result).map((kind, id) => {
    const comment = kind === 'buy' ? comments[buyerIndex++ % comments.length]! : kind === 'out' ? 'I wanted a cup. You are already out.' : null
    const ped = schedule(kind, id, cursor, comment)
    cursor += id === 0 ? 0.2 : kind === 'pass' ? 1.9 : 2.35
    return ped
  })
  const duration = Math.max(2, ...people.map((person) => person.end)) + 0.25
  return { people, duration }
}

export function stopX(width: number): number {
  return Math.max(150, Math.min(width * 0.44, width - 130))
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
