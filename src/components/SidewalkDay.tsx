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
  const sunLeft = 6 + progress * 78
  const sunTop = 16 + (1 - Math.sin(progress * Math.PI)) * 14

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
      <div ref={sceneRef} data-testid="sidewalk" className="relative h-[272px] overflow-hidden rounded-[28px] bg-[#c5d7ea]">
        <div className="absolute inset-0" style={{ background: `linear-gradient(${skyTop}, ${skyBottom})` }} />
        <div
          data-testid="day-sun"
          data-progress={progress.toFixed(3)}
          className="absolute z-[1] h-7 w-7 rounded-full bg-[#ffe14a] shadow-[0_0_0_7px_rgba(255,225,74,0.35)]"
          style={{ left: `${sunLeft}%`, top: sunTop, opacity: result.weather.sky === 'rain' ? 0.85 : 1 }}
        />
        {result.weather.sky !== 'clear' && (
          <div className="absolute top-2 right-8 h-7 w-20 rounded-full bg-white/90 shadow-[14px_3px_0_5px_rgba(255,255,255,0.85)]" />
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
            className="pop-in absolute top-[150px] right-2 z-40 max-w-[11rem] rounded-2xl bg-white px-2.5 py-1.5 text-[13px] leading-snug font-semibold text-ink shadow-[0_8px_20px_rgba(28,25,21,0.12)]"
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
      viewBox="0 0 220 200"
      className="absolute bottom-[6px] left-0 z-30 h-[160px] w-[176px]"
      aria-hidden="true"
    >
      <path d="M8 0 h204 v14 H8 z" fill="#fff6e8" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((stripe) => (
        <rect key={stripe} x={8 + stripe * 22.6} y="0" width="12" height="14" fill="#0e5e59" />
      ))}
      <path d="M8 14 q15 7 30 0 q15 7 30 0 q15 7 30 0 q15 7 30 0 q15 7 30 0 q15 7 30 0 v4 H8 z" fill="#0e5e59" />
      <text x="110" y="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="11" fontWeight="700" fill="#fffdfb">
        LEMONADE
      </text>
      <StandingSeller keeper={keeper} offering={offering} />
      <rect x="14" y="86" width="192" height="114" fill="#c9854a" />
      <rect x="14" y="86" width="10" height="114" fill="#8d5a34" />
      <rect x="196" y="86" width="10" height="114" fill="#8d5a34" />
      <path d="M78 98 V192 M142 98 V192" stroke="#a86b38" strokeWidth="3" />
      <rect x="10" y="74" width="200" height="16" rx="3" fill="#e0a56a" />
      <rect x="10" y="86" width="200" height="10" fill="#a86b38" />
      <rect x="22" y="78" width="22" height="12" rx="2" fill="#fff6d2" stroke="#e2a800" />
      <rect x="150" y="78" width="48" height="16" rx="4" fill="#ffe14a" />
      <text x="174" y="90" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="700" fill="#1c1915">
        {price}
      </text>
      {closed && (
        <g>
          <rect x="78" y="124" width="74" height="22" rx="5" fill="#1c1915" />
          <text x="115" y="139" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="700" fill="#ffe14a">
            CLOSED
          </text>
        </g>
      )}
    </svg>
  )
}

