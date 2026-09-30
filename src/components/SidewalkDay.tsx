import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../game/money'
import {
  isWalking,
  pedestrianX,
  stillFigures,
  type Pedestrian,
  type SidewalkCast,
} from '../game/sidewalk'
import type { DayResult, Keeper } from '../game/types'
import { weatherReadout } from '../game/weather'
import { skyColors } from './art'

const LOOKS = [
  { tone: '#8d5524', shirt: '#0e5e59', hair: '#1c1915', pants: '#243044' },
  { tone: '#f0c7a0', shirt: '#245c43', hair: '#5c3317', pants: '#3d4a62' },
  { tone: '#c68642', shirt: '#2f4d86', hair: '#24160f', pants: '#5c3b2e' },
  { tone: '#f3d2b5', shirt: '#b4532a', hair: '#2a2118', pants: '#2c3d55' },
  { tone: '#6b3a22', shirt: '#efe6d2', hair: '#140e0b', pants: '#1e293b' },
  { tone: '#e0ac7a', shirt: '#1c4e6e', hair: '#3a2414', pants: '#4a3728' },
]

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
    : (cast.people.find((person) => person.kind === 'buy' && elapsed >= person.arrive && elapsed <= person.depart) ??
      cast.people.find((person) => person.kind === 'out' && elapsed >= person.arrive && elapsed <= person.depart) ??
      null)
  const [skyTop, skyBottom] = skyColors(result.weather)
  const closed = result.hours <= 0

  return (
    <section aria-label="Sidewalk outside the lemonade stand" className="mt-3">
      <div ref={sceneRef} data-testid="sidewalk" className="relative h-[340px] overflow-hidden rounded-[28px] bg-[#c5d7ea]">
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
          className="absolute top-3 right-16 left-3 z-40 rounded-full bg-white/95 px-3 py-1 text-[12px] leading-snug font-semibold text-ink shadow-[0_4px_12px_rgba(28,25,21,0.12)]"
        >
          {weatherReadout(result.weather)}
        </p>
        <LemonadeStand price={formatMoney(result.recipe.priceCents)} closed={closed} keeper={keeper} />
        {figures.map(({ person, x }) => (
          <Person
            key={person.id}
            person={person}
            x={x}
            walking={!frozen && isWalking(person, elapsed)}
            step={Math.floor(elapsed * 6) % 2 === 0}
            cup={person.kind === 'buy' && (frozen || (elapsed >= person.arrive && elapsed <= person.end))}
          />
        ))}
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

function Person({
  person,
  x,
  walking,
  step,
  cup,
}: {
  person: Pedestrian
  x: number
  walking: boolean
  step: boolean
  cup: boolean
}) {
  const look = LOOKS[person.look % LOOKS.length]!
  const bob = walking ? (step ? -2 : 0) : 0
  return (
    <div
      data-testid="pedestrian"
      data-kind={person.kind}
      className="absolute z-20 w-16"
      style={{ left: x, bottom: 34, transform: `translateY(${bob}px)` }}
    >
      <PersonSvg look={look} hair={person.look % 6} walking={walking} step={step} cup={cup} />
    </div>
  )
}

function PersonSvg({
  look,
  hair,
  walking,
  step,
  cup,
}: {
  look: (typeof LOOKS)[number]
  hair: number
  walking: boolean
  step: boolean
  cup: boolean
}) {
  const stride = walking ? (step ? 18 : -18) : 0
  const swing = walking ? (step ? -20 : 20) : cup ? 10 : 0
  return (
    <svg viewBox="0 0 64 120" className="h-[132px] w-[68px] overflow-visible" aria-hidden="true">
      <ellipse cx="32" cy="116" rx="16" ry="3.2" fill="#1c1915" opacity="0.16" />
      <g transform={`rotate(${-stride} 24 70)`}>
        <path d="M19 68 h10 v30 q0 4 -5 4 h-3 q-4 0 -4 -5 z" fill={look.pants} />
        <ellipse cx="23" cy="104" rx="7" ry="3.2" fill="#1c1915" />
      </g>
      <g transform={`rotate(${stride} 40 70)`}>
        <path d="M35 68 h10 v30 q0 4 -5 4 h-3 q-4 0 -4 -5 z" fill={look.pants} />
        <ellipse cx="41" cy="104" rx="7" ry="3.2" fill="#1c1915" />
      </g>
      <path d="M16 40 h32 v30 q0 6 -16 8 q-16 -2 -16 -8 z" fill={look.shirt} />
      <path d="M24 46 h16 v16 h-16 z" fill="#0e5e59" />
      <rect x="28" y="32" width="8" height="10" rx="3" fill={look.tone} />
      <g transform={`rotate(${-swing} 16 44)`}>
        <path d="M12 40 h8 v22 q0 4 -4 4 t-4 -4 z" fill={look.tone} />
      </g>
      <g transform={`rotate(${swing} 48 44)`}>
        <path d="M44 40 h8 v22 q0 4 -4 4 t-4 -4 z" fill={look.tone} />
        {cup && (
          <g>
            <path d="M46 60 h9 l-1 11 h-7 z" fill="#ffe14a" stroke="#e2a800" strokeWidth="1.1" />
            <path d="M47 60 q4.5 -5 8 0" fill="none" stroke="#fff" strokeWidth="1.3" />
          </g>
        )}
      </g>
      <Hair style={hair} color={look.hair} />
      <circle cx="32" cy="20" r="12" fill={look.tone} />
      <circle cx="27.5" cy="20" r="1.35" fill="#1c1915" />
      <circle cx="36.5" cy="20" r="1.35" fill="#1c1915" />
      <path d="M31.2 18.2 v3.2" stroke="#1c1915" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
      <path d="M27.5 25.5 Q32 29 36.5 25.5" fill="none" stroke="#1c1915" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function Hair({ style, color }: { style: number; color: string }) {
  if (style === 1) {
    return <path d="M20 20 Q32 2 44 18 Q40 28 32 30 Q22 28 20 20" fill={color} />
  }
  if (style === 2) {
    return (
      <g fill={color}>
        <path d="M21 16 Q32 4 43 16 Q40 10 32 10 Q24 10 21 16" />
        <circle cx="18" cy="22" r="4" />
        <circle cx="46" cy="22" r="4" />
      </g>
    )
  }
  if (style === 3) {
    return <path d="M18 18 Q32 0 46 16 L44 36 Q32 28 20 36 Z" fill={color} />
  }
  if (style === 4) {
    return (
      <g fill={color}>
        <path d="M22 16 Q32 6 42 16 Q38 12 32 12 Q26 12 22 16" />
        <circle cx="40" cy="8" r="5" />
      </g>
    )
  }
  if (style === 5) {
    return <path d="M23 14 Q32 8 41 14 Q39 12 32 12 Q25 12 23 14" fill={color} />
  }
  return <path d="M21 18 Q32 4 43 18 Q38 12 32 12 Q26 12 21 18" fill={color} />
}

function LemonadeStand({ price, closed, keeper }: { price: string; closed: boolean; keeper: Keeper }) {
  return (
    <svg
      data-testid="lemonade-stand"
      viewBox="0 0 168 168"
      className="absolute bottom-[28px] left-1 z-10 h-[196px] w-[188px]"
      aria-hidden="true"
    >
      <rect x="22" y="48" width="7" height="100" rx="2" fill="#8d5a34" />
      <rect x="128" y="48" width="7" height="100" rx="2" fill="#8d5a34" />
      <KeeperBody keeper={keeper} />
      <path d="M10 34 h142 v14 H10 z" fill="#fff6e8" />
      {[0, 1, 2, 3, 4, 5, 6].map((stripe) => (
        <rect key={stripe} x={10 + stripe * 20} y="34" width="10" height="14" fill="#0e5e59" />
      ))}
      <path d="M10 48 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 q12 8 24 0 v5 H10 z" fill="#0e5e59" />
      <rect x="44" y="4" width="80" height="26" rx="7" fill="#fffdfb" stroke="#0e5e59" strokeWidth="2" />
      <text x="84" y="22" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="700" fill="#0e5e59">
        LEMONADE
      </text>
      <KeeperHead keeper={keeper} />
      <rect x="16" y="112" width="132" height="40" rx="7" fill="#c9854a" />
      <rect x="16" y="144" width="132" height="12" rx="3" fill="#a86b38" />
      <KeeperHands keeper={keeper} />
      <rect x="28" y="122" width="36" height="20" rx="3" fill="#fff6d2" stroke="#e2a800" />
      <rect x="34" y="122" width="8" height="20" fill="#ffe14a" opacity="0.85" />
      <path d="M86 96 h26 v24 h-20 q-6 0 -6 -8 z" fill="#fff8dc" stroke="#e2a800" strokeWidth="2" />
      <path d="M90 104 h18 v12 h-14 q-4 0 -4 -5 z" fill="#ffe14a" />
      <circle cx="106" cy="108" r="5" fill="#ffe14a" stroke="#e2a800" />
      <rect x="112" y="122" width="28" height="18" rx="4" fill="#ffe14a" />
      <text x="126" y="135" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="9" fontWeight="700" fill="#1c1915">
        {price}
      </text>
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

function KeeperBody({ keeper }: { keeper: Keeper }) {
  const girl = keeper === 'girl'
  return (
    <g>
      <path d={girl ? 'M34 96 h28 v56 h-28 z' : 'M28 94 h40 v58 h-40 z'} fill="#fff6e8" />
      <path d={girl ? 'M38 100 h20 v18 h-20 z' : 'M34 98 h28 v18 h-28 z'} fill="#0e5e59" />
    </g>
  )
}

function KeeperHead({ keeper }: { keeper: Keeper }) {
  const girl = keeper === 'girl'
  const skin = girl ? '#e0ac7a' : '#c68642'
  const hair = girl ? '#3a2414' : '#1c1915'
  return (
    <g data-testid="stand-keeper" data-keeper={keeper}>
      <rect x="42" y="78" width="10" height="14" rx="4" fill={skin} />
      {girl ? (
        <path d="M28 78 Q46 52 66 76 L64 108 Q46 96 30 108 Z" fill={hair} />
      ) : (
        <path d="M30 70 Q46 52 64 70 Q60 62 46 60 Q34 62 30 70" fill={hair} />
      )}
      <circle cx="46" cy="82" r={girl ? 15 : 16} fill={skin} />
      <circle cx="41" cy="82" r="1.6" fill="#1c1915" />
      <circle cx="51" cy="82" r="1.6" fill="#1c1915" />
      <path d="M45.2 79.5 v3" stroke="#1c1915" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <path d="M40 88 Q46 92 52 88" fill="none" stroke="#1c1915" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  )
}

function KeeperHands({ keeper }: { keeper: Keeper }) {
  const skin = keeper === 'girl' ? '#e0ac7a' : '#c68642'
  return (
    <g aria-hidden="true">
      <ellipse cx="38" cy="116" rx="6.5" ry="3.4" fill={skin} />
      <ellipse cx="56" cy="116" rx="6.5" ry="3.4" fill={skin} />
    </g>
  )
}
