import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../game/money'
import { pedestrianX, stillFigures, type Pedestrian, type SidewalkCast } from '../game/sidewalk'
import type { DayResult, Keeper } from '../game/types'
import { weatherReadout } from '../game/weather'
import { skyColors } from './art'
import { KeeperOffer, KeeperPortrait, LOOKS, PersonFigure, type Pose } from './people'

export function SidewalkDay({
  result,
  cast,
  elapsed,
  reduced,
  keeper,
}: {
  result: DayResult
  cast: SidewalkCast
  elapsed: number
  reduced: boolean
  keeper: Keeper
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  useEffect(() => {
    const node = sceneRef.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth || 360)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const finished = elapsed >= cast.duration - 0.05
  const frozen = reduced || finished
  const moving = frozen
    ? []
    : cast.people.flatMap((person) => {
        const x = pedestrianX(person, elapsed, width)
        return x === null ? [] : [{ person, x }]
      })
  const figures = frozen ? stillFigures(cast, width) : moving
  const speaker = frozen
    ? (cast.people.find((person) => person.kind === 'buy' && person.comment) ??
      cast.people.find((person) => person.kind === 'out' && person.comment) ??
      null)
    : (cast.people.find((person) => person.comment && elapsed >= person.take && elapsed <= person.depart) ?? null)
  const [skyTop, skyBottom] = skyColors(result.weather)
  const closed = result.hours <= 0

  return (
    <section aria-label="Sidewalk outside the lemonade stand" className="mt-3">
      <div ref={sceneRef} data-testid="sidewalk" className="relative h-[318px] overflow-hidden rounded-[28px] bg-[#c5d7ea]">
        <div className="absolute inset-0" style={{ background: `linear-gradient(${skyTop}, ${skyBottom})` }} />
        {result.weather.sky !== 'rain' && (
          <div className="absolute top-5 right-6 h-12 w-12 rounded-full bg-[#ffe14a] shadow-[0_0_0_10px_rgba(255,225,74,0.35)]" />
        )}
        {result.weather.sky !== 'clear' && (
          <div className="absolute top-8 left-24 h-10 w-28 rounded-full bg-white/90 shadow-[18px_6px_0_8px_rgba(255,255,255,0.85)]" />
        )}
        {!reduced &&
          result.weather.sky === 'rain' &&
          [18, 48, 90, 140, 200, 250, 310].map((left, index) => (
            <span
              key={left}
              className="drip absolute top-16 h-4 w-[3px] rounded-full bg-[#3d6280]"
              style={{ left, animationDelay: `${index * 0.12}s` }}
            />
          ))}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[#3a3f46]" />
        <div className="absolute inset-x-0 bottom-8 h-2 bg-[#b7a48c]" />
        <div className="absolute inset-x-0 bottom-10 h-[92px] bg-[#e6d5bf]">
          {[1, 2, 3, 4].map((slab) => (
            <span key={slab} className="absolute top-0 bottom-0 w-px bg-[#c9b495]" style={{ left: `${slab * 20}%` }} />
          ))}
        </div>
        <p
          data-testid="day-weather"
          className="absolute top-3 left-3 z-40 max-w-[15rem] rounded-full bg-white/95 px-3 py-1 text-[12px] leading-snug font-semibold text-ink shadow-[0_4px_12px_rgba(28,25,21,0.12)]"
        >
          {weatherReadout(result.weather)}
        </p>
        <LemonadeStand
          price={formatMoney(result.recipe.priceCents)}
          closed={closed}
          keeper={keeper}
          offering={
            !frozen &&
            figures.some(({ person }) => person.kind === 'buy' && elapsed >= person.arrive && elapsed < person.take)
          }
        />
        {figures.map(({ person, x }) => {
          if (person.counts && person.weight <= 0) return null
          const pose = poseOf(person, elapsed, frozen)
          return (
            <Person
              key={person.id}
              person={person}
              x={x}
              pose={pose}
              step={Math.floor(elapsed * 5) % 2 === 0}
              cup={pose === 'hold' || pose === 'leave'}
              reach={reachAmount(person, elapsed, frozen)}
            />
          )
        })}
        {speaker?.comment && (
          <p
            data-testid="customer-comment"
            aria-live="polite"
            className="pop-in absolute top-16 right-3 left-3 z-30 rounded-2xl bg-white px-3 py-2 text-[15px] leading-snug font-semibold text-ink shadow-[0_8px_20px_rgba(28,25,21,0.12)]"
          >
            {speaker.comment}
          </p>
        )}
      </div>
    </section>
  )
}

function poseOf(person: Pedestrian, elapsed: number, frozen: boolean): Pose {
  if (frozen) return person.kind === 'buy' ? 'hold' : 'walk'
  if (person.kind === 'pass') return 'walk'
  if (person.kind === 'out') return elapsed >= person.arrive && elapsed <= person.depart ? 'reach' : 'walk'
  if (elapsed < person.arrive) return 'walk'
  if (elapsed < person.take) return 'reach'
  if (elapsed < person.depart) return 'hold'
  return 'leave'
}

function reachAmount(person: Pedestrian, elapsed: number, frozen: boolean): number {
  if (person.kind === 'pass') return 0
  if (frozen) return 1
  const span = Math.max(0.2, person.take - person.arrive)
  if (elapsed < person.arrive) return 0
  if (elapsed >= person.take) return 1
  return Math.min(1, (elapsed - person.arrive) / span)
}

function Person({
  person,
  x,
  pose,
  step,
  cup,
  reach,
}: {
  person: Pedestrian
  x: number
  pose: Pose
  step: boolean
  cup: boolean
  reach: number
}) {
  const look = LOOKS[person.look % LOOKS.length]!
  const bob = pose === 'walk' || pose === 'leave' ? (step ? -3 : 0) : 0
  return (
    <div
      data-testid="pedestrian"
      data-kind={person.kind}
      data-pose={pose}
      data-cup={cup ? 'yes' : 'no'}
      className="absolute z-20 w-[98px]"
      style={{ left: x, bottom: 16, transform: `translateY(${bob}px)` }}
    >
      <PersonFigure look={look} hair={person.look % 6} pose={pose} step={step} cup={cup} reach={reach} />
    </div>
  )
}

function LemonadeStand({ price, closed, keeper, offering }: { price: string; closed: boolean; keeper: Keeper; offering: boolean }) {
  return (
    <svg
      data-testid="lemonade-stand"
      viewBox="0 0 168 168"
      className="absolute bottom-[16px] left-0 z-10 h-[188px] w-[180px]"
      aria-hidden="true"
    >
      <rect x="22" y="48" width="7" height="100" rx="2" fill="#8d5a34" />
      <rect x="128" y="48" width="7" height="100" rx="2" fill="#8d5a34" />
      <path d="M10 34 h142 v14 H10 z" fill="#fff6e8" />
      {[0, 1, 2, 3, 4, 5, 6].map((stripe) => (
        <rect key={stripe} x={10 + stripe * 20} y="34" width="10" height="14" fill="#0e5e59" />
      ))}
      <path d="M10 48 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 v5 H10 z" fill="#0e5e59" />
      <rect x="44" y="4" width="80" height="26" rx="7" fill="#fffdfb" stroke="#0e5e59" strokeWidth="2" />
      <text x="84" y="22" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="700" fill="#0e5e59">
        LEMONADE
      </text>
      <KeeperPortrait keeper={keeper} />
      <rect x="16" y="118" width="132" height="34" rx="7" fill="#c9854a" />
      <rect x="16" y="146" width="132" height="10" rx="3" fill="#a86b38" />
      <rect x="24" y="124" width="32" height="16" rx="3" fill="#fff6d2" stroke="#e2a800" />
      <rect x="28" y="124" width="7" height="16" fill="#ffe14a" opacity="0.85" />
      <path d="M22 98 h20 v18 h-14 q-6 0 -6 -6 z" fill="#fff8dc" stroke="#e2a800" strokeWidth="1.6" />
      <path d="M25 104 h14 v8 h-10 q-4 0 -4 -4 z" fill="#ffe14a" />
      <rect x="108" y="126" width="32" height="16" rx="4" fill="#ffe14a" />
      <text x="124" y="137" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="9" fontWeight="700" fill="#1c1915">
        {price}
      </text>
      <KeeperOffer keeper={keeper} offering={offering} />
      {closed && (
        <g>
          <rect x="96" y="86" width="58" height="20" rx="5" fill="#1c1915" />
          <text x="125" y="100" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="11" fontWeight="700" fill="#ffe14a">
            CLOSED
          </text>
        </g>
      )}
    </svg>
  )
}

