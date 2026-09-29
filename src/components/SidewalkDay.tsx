import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../game/money'
import {
  isWalking,
  pedestrianX,
  stillFigures,
  type Pedestrian,
  type SidewalkCast,
} from '../game/sidewalk'
import type { DayResult } from '../game/types'
import { skyColors } from './art'

const LOOKS = [
  { tone: '#8d5524', shirt: '#0e5e59', hair: '#1c1915' },
  { tone: '#f0c7a0', shirt: '#245c43', hair: '#5c3317' },
  { tone: '#c68642', shirt: '#2f4d86', hair: '#24160f' },
  { tone: '#f3d2b5', shirt: '#b4532a', hair: '#2a2118' },
  { tone: '#6b3a22', shirt: '#efe6d2', hair: '#140e0b' },
  { tone: '#e0ac7a', shirt: '#1c4e6e', hair: '#3a2414' },
]

export function SidewalkDay({ result, cast, elapsed, reduced }: { result: DayResult; cast: SidewalkCast; elapsed: number; reduced: boolean }) {
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
        <LemonadeStand price={formatMoney(result.recipe.priceCents)} closed={closed} />
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
            className="pop-in absolute top-3 right-3 left-3 z-30 rounded-2xl bg-white px-3 py-2 text-[15px] leading-snug font-semibold text-ink shadow-[0_8px_20px_rgba(28,25,21,0.12)]"
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
  const front = walking && step ? 9 : walking ? -2 : 2
  const back = walking && step ? -7 : walking ? 8 : -2
  const bob = walking ? (step ? -2 : 0) : 0
  return (
    <div
      data-testid="pedestrian"
      data-kind={person.kind}
      className="absolute z-20 w-14"
      style={{ left: x, bottom: 34, transform: `translateY(${bob}px)` }}
    >
      <svg viewBox="0 0 56 86" className="h-[96px] w-14 overflow-visible" aria-hidden="true">
        <ellipse cx="28" cy="82" rx="14" ry="3.2" fill="#1c1915" opacity="0.16" />
        <path d={`M22 50 L${22 + back} 76`} stroke="#2a241c" strokeWidth="4.5" strokeLinecap="round" />
        <path d={`M34 50 L${34 + front} 76`} stroke="#2a241c" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M14 32 h28 v20 q0 9 -14 9 q-14 0 -14 -9 z" fill={look.shirt} />
        <circle cx="28" cy="22" r="13" fill={look.tone} />
        <path d="M15 18 Q28 2 41 17 Q34 9 28 11 Q21 9 15 18" fill={look.hair} />
        <circle cx="23" cy="22" r="1.4" fill="#1c1915" />
        <circle cx="33" cy="22" r="1.4" fill="#1c1915" />
        <path d="M23 28 Q28 32 33 28" fill="none" stroke="#1c1915" strokeWidth="1.4" strokeLinecap="round" />
        {cup && (
          <g>
            <path d="M38 38 h9 l-1.2 12 h-6.6 z" fill="#ffe14a" stroke="#e2a800" strokeWidth="1.2" />
            <path d="M40 38 q4.5 -6 9 0" fill="none" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  )
}

function LemonadeStand({ price, closed }: { price: string; closed: boolean }) {
  return (
    <svg
      data-testid="lemonade-stand"
      viewBox="0 0 168 158"
      className="absolute bottom-[34px] left-2 z-10 h-[158px] w-[168px]"
      aria-hidden="true"
    >
      <rect x="22" y="58" width="7" height="78" rx="2" fill="#8d5a34" />
      <rect x="128" y="58" width="7" height="78" rx="2" fill="#8d5a34" />
      <path d="M10 52 h142 v16 H10 z" fill="#fff6e8" />
      {[0, 1, 2, 3, 4, 5, 6].map((stripe) => (
        <rect key={stripe} x={10 + stripe * 20} y="52" width="10" height="16" fill="#0e5e59" />
      ))}
      <path d="M10 68 q12 10 24 0 q12 10 24 0 q12 10 24 0 q12 10 24 0 q12 10 24 0 q12 10 24 0 v6 H10 z" fill="#0e5e59" />
      <rect x="40" y="16" width="82" height="30" rx="7" fill="#fffdfb" stroke="#0e5e59" strokeWidth="2" />
      <text x="81" y="36" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="700" fill="#0e5e59">
        LEMONADE
      </text>
      <rect x="16" y="108" width="132" height="38" rx="7" fill="#c9854a" />
      <rect x="16" y="138" width="132" height="12" rx="3" fill="#a86b38" />
      <rect x="28" y="116" width="36" height="20" rx="3" fill="#fff6d2" stroke="#e2a800" />
      <rect x="34" y="116" width="8" height="20" fill="#ffe14a" opacity="0.85" />
      <path d="M78 92 h28 v26 h-22 q-6 0 -6 -8 z" fill="#fff8dc" stroke="#e2a800" strokeWidth="2" />
      <path d="M82 100 h20 v14 h-16 q-4 0 -4 -5 z" fill="#ffe14a" />
      <circle cx="100" cy="104" r="6" fill="#ffe14a" stroke="#e2a800" />
      <rect x="112" y="116" width="28" height="18" rx="4" fill="#ffe14a" />
      <text x="126" y="129" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="9" fontWeight="700" fill="#1c1915">
        {price}
      </text>
      {closed && (
        <g>
          <rect x="34" y="78" width="92" height="24" rx="6" fill="#1c1915" />
          <text x="80" y="95" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="700" fill="#ffe14a">
            CLOSED
          </text>
        </g>
      )}
    </svg>
  )
}
