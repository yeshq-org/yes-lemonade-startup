import type { Weather } from '../game/types'

function skyStops(weather: Weather): [string, string] {
  if (weather.sky === 'rain') return ['#9eb0c2', '#d5dee6']
  if (weather.heat === 'hot') return ['#7ec8f2', '#ffe7a3']
  if (weather.heat === 'warm') return ['#9fd4f5', '#ffe3b0']
  if (weather.heat === 'cool') return ['#c5d7ea', '#e7eef6']
  return ['#d5dee8', '#eef2f6']
}

export function WeatherArt({ weather }: { weather: Weather }) {
  const [top, bottom] = skyStops(weather)
  const rainy = weather.sky === 'rain'
  const cloudy = weather.sky !== 'clear'
  return (
    <svg viewBox="0 0 360 168" className="h-auto w-full" role="img" aria-label={`${weather.tempF} degrees`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="360" height="168" rx="28" fill="url(#sky)" />
      {weather.sky !== 'rain' && (
        <g className={weather.heat === 'hot' ? 'floaty' : undefined}>
          <circle cx="276" cy="54" r="26" fill="#ffe14a" />
          <circle cx="276" cy="54" r="34" fill="#ffe14a" opacity="0.35" />
        </g>
      )}
      {cloudy && (
        <g fill="#f7fbff">
          <ellipse cx="168" cy="78" rx="54" ry="28" />
          <ellipse cx="126" cy="86" rx="36" ry="22" />
          <ellipse cx="214" cy="88" rx="40" ry="24" />
        </g>
      )}
      {rainy &&
        [40, 78, 120, 168, 210, 250, 300].map((x, index) => (
          <line
            key={x}
            className="drip"
            x1={x}
            y1={108}
            x2={x - 6}
            y2={126}
            stroke="#3d6280"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ animationDelay: `${index * 0.13}s` }}
          />
        ))}
      <path d="M0 132 Q90 112 180 128 T360 120 V168 H0 Z" fill="#e7d3ae" />
      <path d="M0 146 Q100 132 190 148 T360 140 V168 H0 Z" fill="#d7c09a" />
    </svg>
  )
}

export function LemonMentor({ className = 'h-16 w-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <ellipse cx="40" cy="46" rx="26" ry="22" fill="#ffe14a" />
      <ellipse cx="40" cy="46" rx="26" ry="22" fill="none" stroke="#e2a800" strokeWidth="2" />
      <path d="M40 22 C46 12 58 14 56 24 C50 20 44 22 40 22" fill="#18794a" />
      <circle cx="31" cy="44" r="2.2" fill="#1c1915" />
      <circle cx="49" cy="44" r="2.2" fill="#1c1915" />
      <path d="M32 52 Q40 58 48 52" fill="none" stroke="#1c1915" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="24" cy="50" rx="4" ry="2.4" fill="#ffb38a" opacity="0.8" />
      <ellipse cx="56" cy="50" rx="4" ry="2.4" fill="#ffb38a" opacity="0.8" />
    </svg>
  )
}

function Teen({
  x,
  tone,
  shirt,
  hair,
}: {
  x: number
  tone: string
  shirt: string
  hair: string
}) {
  return (
    <g transform={`translate(${x} 118)`} className="drift">
      <ellipse cx="0" cy="46" rx="16" ry="4" fill="#1c1915" opacity="0.12" />
      <path d="M-13 8 h26 v24 q0 12 -13 12 q-13 0 -13 -12 z" fill={shirt} />
      <circle cx="0" cy="-6" r="13" fill={tone} />
      <path d="M-13 -12 Q0 -28 13 -10 Q6 -18 0 -16 Q-7 -18 -13 -12" fill={hair} />
      <circle cx="-4" cy="-6" r="1.3" fill="#1c1915" />
      <circle cx="4" cy="-6" r="1.3" fill="#1c1915" />
      <path d="M-4 1 Q0 5 4 1" fill="none" stroke="#1c1915" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  )
}

export function StandScene({ weather, quiet = false }: { weather: Weather; quiet?: boolean }) {
  const [top, bottom] = skyStops(weather)
  return (
    <svg viewBox="0 0 360 210" className="h-auto w-full" role="img" aria-label="Your lemonade stand">
      <defs>
        <linearGradient id="sell-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <pattern id="awning" width="14" height="16" patternUnits="userSpaceOnUse">
          <rect width="14" height="16" fill="#fff6e8" />
          <rect width="7" height="16" fill="#0e5e59" />
        </pattern>
      </defs>
      <rect width="360" height="210" rx="28" fill="url(#sell-sky)" />
      {weather.sky !== 'rain' && <circle cx="300" cy="42" r="22" fill="#ffe14a" />}
      {weather.sky !== 'clear' && (
        <g fill="#f7fbff">
          <ellipse cx="150" cy="48" rx="46" ry="20" />
          <ellipse cx="112" cy="54" rx="28" ry="16" />
          <ellipse cx="190" cy="56" rx="30" ry="16" />
        </g>
      )}
      <rect x="0" y="150" width="360" height="60" fill="#e7d3ae" />
      <g>
        <path d="M48 108 h150 v18 h-150 z" fill="url(#awning)" />
        <path d="M48 126 q12 12 24 0 q12 12 24 0 q12 12 24 0 q12 12 24 0 q12 12 24 0 q12 12 24 0 v-8 h-144 z" fill="#0e5e59" />
        <rect x="78" y="78" width="86" height="22" rx="6" fill="#fffdfb" />
        <text x="121" y="93" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="11" fontWeight="700" fill="#0e5e59">
          Y.E.S.
        </text>
        <rect x="62" y="126" width="128" height="40" rx="8" fill="#c9854a" />
        <rect x="62" y="150" width="128" height="12" rx="4" fill="#a86b38" />
        <rect x="70" y="132" width="46" height="22" rx="4" fill="#ffe9a0" stroke="#e2a800" />
        <circle cx="148" cy="140" r="12" fill="#fff6d8" stroke="#e2a800" />
        <path d="M140 140 h16" stroke="#e2a800" strokeWidth="2" />
        <circle cx="154" cy="136" r="3" fill="#ffe14a" />
      </g>
      {!quiet && (
        <>
          <Teen x={230} tone="#8d5524" shirt="#0e5e59" hair="#1c1915" />
          <Teen x={278} tone="#f0c7a0" shirt="#18794a" hair="#5c3317" />
          <Teen x={326} tone="#c68642" shirt="#b42318" hair="#24160f" />
        </>
      )}
    </svg>
  )
}

export function MiniIcon({ kind }: { kind: 'cash' | 'price' | 'time' | 'ice' }) {
  const common = { viewBox: '0 0 64 64', className: 'h-16 w-16', 'aria-hidden': true as const }
  if (kind === 'cash') {
    return (
      <svg {...common}>
        <rect x="8" y="16" width="48" height="32" rx="8" fill="#18794a" />
        <circle cx="32" cy="32" r="8" fill="#ffe14a" />
      </svg>
    )
  }
  if (kind === 'price') {
    return (
      <svg {...common}>
        <path d="M14 18 h22 l14 14 l-18 18 l-18 -18 z" fill="#ffe14a" stroke="#1c1915" strokeWidth="2" />
        <circle cx="24" cy="28" r="3" fill="#1c1915" />
      </svg>
    )
  }
  if (kind === 'time') {
    return (
      <svg {...common}>
        <circle cx="32" cy="34" r="18" fill="#fffdfb" stroke="#0e5e59" strokeWidth="3" />
        <path d="M32 34 V24" stroke="#1c1915" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 34 H42" stroke="#1c1915" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M20 16 h24 l-4 28 a12 12 0 0 1 -16 0 z" fill="#d7eef8" stroke="#0e5e59" strokeWidth="2" />
      <path d="M24 16 q8 -8 16 0" fill="none" stroke="#9eb0c2" strokeWidth="2" />
    </svg>
  )
}
