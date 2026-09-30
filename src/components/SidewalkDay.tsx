import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../game/money'
import { crowdProgress, pedestrianX, sidewalkClock, stillFigures, type Pedestrian, type SidewalkCast } from '../game/sidewalk'
import type { DayResult, Keeper } from '../game/types'
import { weatherReadout } from '../game/weather'
import { skyColors } from './art'
import { LOOKS, PersonFigure, StandingSeller, type Pose } from './people'

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
  const progress = crowdProgress(cast.people, finished ? cast.duration : elapsed)
  const clock = sidewalkClock(progress)
  const sunLeft = 4 + progress * 82
  const sunTop = 14 + (1 - Math.sin(progress * Math.PI)) * 16

  return (
    <section aria-label="Sidewalk outside the lemonade stand" className="mt-2">
      <div className="mb-1.5 flex items-center gap-2" data-testid="day-timeline">
        <p className="w-14 text-[11px] font-bold text-ink-soft">9:00am</p>
        <div className="relative h-2 flex-1 rounded-full bg-sand">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#e2a800]" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="w-14 text-right text-[11px] font-bold text-ink-soft">5:00pm</p>
        <p className="w-16 text-right font-display text-lg leading-none font-semibold" data-testid="day-clock">
          {clock}
        </p>
      </div>
      <p data-testid="day-weather" className="mb-1.5 text-xs font-semibold text-ink">
        {weatherReadout(result.weather)}
      </p>
      <div ref={sceneRef} data-testid="sidewalk" className="relative h-[312px] overflow-hidden rounded-[28px] bg-[#c5d7ea]">
        <div className="absolute inset-0" style={{ background: `linear-gradient(${skyTop}, ${skyBottom})` }} />
        <div
          data-testid="day-sun"
          data-progress={progress.toFixed(3)}
          className="absolute z-[1] h-8 w-8 rounded-full bg-[#ffe14a] shadow-[0_0_0_8px_rgba(255,225,74,0.35)]"
          style={{ left: `${sunLeft}%`, top: sunTop, opacity: result.weather.sky === 'rain' ? 0.85 : 1 }}
        />
        {result.weather.sky !== 'clear' && (
          <div className="absolute top-[72px] left-28 h-8 w-24 rounded-full bg-white/90 shadow-[16px_4px_0_6px_rgba(255,255,255,0.85)]" />
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
            className="pop-in absolute top-[88px] right-2 left-24 z-30 rounded-2xl bg-white px-2.5 py-1.5 text-[13px] leading-snug font-semibold text-ink shadow-[0_8px_20px_rgba(28,25,21,0.12)]"
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
      className="absolute z-20 w-[66px]"
      style={{ left: x, bottom: 8, transform: `translateY(${bob}px)` }}
    >
      <PersonFigure look={look} hair={person.look % 6} pose={pose} step={step} cup={cup} reach={reach} />
    </div>
  )
}

function LemonadeStand({ price, closed, keeper, offering }: { price: string; closed: boolean; keeper: Keeper; offering: boolean }) {
  return (
    <svg
      data-testid="lemonade-stand"
      viewBox="0 0 200 248"
      className="absolute bottom-[6px] left-0 z-10 h-[214px] w-[172px]"
      aria-hidden="true"
    >
      <rect x="28" y="46" width="8" height="190" rx="2" fill="#8d5a34" />
      <rect x="158" y="46" width="8" height="190" rx="2" fill="#8d5a34" />
      <path d="M18 36 h164 v16 H18 z" fill="#fff6e8" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((stripe) => (
        <rect key={stripe} x={18 + stripe * 20} y="36" width="10" height="16" fill="#0e5e59" />
      ))}
      <path d="M18 52 q14 8 28 0 q14 8 28 0 q14 8 28 0 q14 8 28 0 q14 8 28 0 q14 8 28 0 v6 H18 z" fill="#0e5e59" />
      <rect x="58" y="4" width="84" height="26" rx="7" fill="#fffdfb" stroke="#0e5e59" strokeWidth="2" />
      <text x="100" y="22" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="700" fill="#0e5e59">
        LEMONADE
      </text>
      <rect x="36" y="176" width="118" height="16" rx="3" fill="#a86b38" />
      <rect x="44" y="168" width="102" height="12" rx="2" fill="#c9854a" />
      <StandingSeller keeper={keeper} offering={offering} />
      <rect x="22" y="124" width="150" height="28" rx="6" fill="#c9854a" />
      <rect x="22" y="146" width="150" height="10" rx="3" fill="#a86b38" />
      <rect x="32" y="140" width="28" height="14" rx="3" fill="#fff6d2" stroke="#e2a800" />
      <rect x="36" y="140" width="6" height="14" fill="#ffe14a" opacity="0.85" />
      <rect x="126" y="142" width="36" height="16" rx="4" fill="#ffe14a" />
      <text x="144" y="154" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="10" fontWeight="700" fill="#1c1915">
        {price}
      </text>
      {closed && (
        <g>
          <rect x="118" y="96" width="64" height="22" rx="5" fill="#1c1915" />
          <text x="150" y="111" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="11" fontWeight="700" fill="#ffe14a">
            CLOSED
          </text>
        </g>
      )}
    </svg>
  )
}

