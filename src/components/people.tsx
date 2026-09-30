import type { Keeper } from '../game/types'

export type Pose = 'walk' | 'reach' | 'hold' | 'leave'

export interface PersonLook {
  tone: string
  shade: string
  lip: string
  iris: string
  shirt: string
  hair: string
  pants: string
  shoe: string
}

export const LOOKS: PersonLook[] = [
  { tone: '#8d5524', shade: '#6e3f18', lip: '#6d3a32', iris: '#2a1810', shirt: '#1f6b4a', hair: '#1a120c', pants: '#243044', shoe: '#1c1915' },
  { tone: '#f0c7a0', shade: '#d7a684', lip: '#c47b74', iris: '#6b4428', shirt: '#2c4f86', hair: '#5c3317', pants: '#3d4a62', shoe: '#3a241c' },
  { tone: '#c68642', shade: '#a56a30', lip: '#a15a48', iris: '#3a2414', shirt: '#8d3b3b', hair: '#24160f', pants: '#5c3b2e', shoe: '#1c1915' },
  { tone: '#f3d2b5', shade: '#e0b494', lip: '#d08980', iris: '#7a5330', shirt: '#c4622d', hair: '#c4a574', pants: '#2c3d55', shoe: '#3f2a22' },
  { tone: '#6b3a22', shade: '#4e2816', lip: '#4e241c', iris: '#1a100c', shirt: '#efe6d2', hair: '#140e0b', pants: '#1e293b', shoe: '#11100e' },
  { tone: '#e0ac7a', shade: '#c48e60', lip: '#b56b62', iris: '#4a3020', shirt: '#1c4e6e', hair: '#3a2414', pants: '#4a3728', shoe: '#24160f' },
]

export function PersonFigure({
  look,
  hair,
  pose,
  step,
  cup,
  reach = 1,
}: {
  look: PersonLook
  hair: number
  pose: Pose
  step: boolean
  cup: boolean
  reach?: number
}) {
  const walking = pose === 'walk' || pose === 'leave'
  const stride = walking ? (step ? 1 : -1) : 0
  const nearShoulder = pose === 'reach' ? -14 - 50 * reach : pose === 'hold' || pose === 'leave' ? -20 : stride * -14
  const nearElbow = pose === 'reach' ? -6 - 22 * reach : pose === 'hold' || pose === 'leave' ? -18 : stride * 8
  const farShoulder = walking ? stride * 18 : 8
  const farElbow = walking ? stride * -12 : 4
  const nearHip = walking ? stride * -22 : -3
  const farHip = walking ? stride * 20 : 4
  const nearKnee = walking ? (stride > 0 ? 10 : 26) : 4
  const farKnee = walking ? (stride > 0 ? 24 : 8) : 4

  return (
    <svg viewBox="0 0 112 200" className="h-[176px] w-[98px] overflow-visible" aria-hidden="true">
      <ellipse cx="56" cy="194" rx="22" ry="3.2" fill="#1c1915" opacity="0.16" />
      <Leg hipX={68} hipY={112} hip={farHip} knee={farKnee} pants={look.pants} shoe={look.shoe} />
      <Arm shoulderX={74} shoulderY={78} shoulder={farShoulder} elbow={farElbow} skin={look.tone} shade={look.shade} sleeve={look.shirt} open={false} cup={false} />
      <Leg hipX={46} hipY={112} hip={nearHip} knee={nearKnee} pants={look.pants} shoe={look.shoe} />
      <path d="M34 74 q22 8 46 0 l6 34 q-4 10 -29 12 q-26 -2 -29 -12 z" fill={look.shirt} stroke="#24180f" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M52 78 q6 4 12 0" fill="none" stroke="#24180f" strokeWidth="1.1" opacity="0.28" />
      <path d="M46 108 h18 l-1 10 h-16 z" fill={look.pants} />
      <path d="M48 70 h16 v10 h-16 z" fill={look.tone} />
      <Arm
        shoulderX={40}
        shoulderY={76}
        shoulder={nearShoulder}
        elbow={nearElbow}
        skin={look.tone}
        shade={look.shade}
        sleeve={look.shirt}
        open={pose === 'reach'}
        cup={cup}
      />
      <IllustratedHead cx={58} cy={40} scale={1.12} skin={look.tone} shade={look.shade} lip={look.lip} iris={look.iris} hair={look.hair} style={hair} />
    </svg>
  )
}

function Leg({
  hipX,
  hipY,
  hip,
  knee,
  pants,
  shoe,
}: {
  hipX: number
  hipY: number
  hip: number
  knee: number
  pants: string
  shoe: string
}) {
  return (
    <g transform={`rotate(${hip} ${hipX} ${hipY})`}>
      <path d={`M${hipX - 7} ${hipY} h14 v24 q0 5 -7 6 q-7 -1 -7 -6 z`} fill={pants} stroke="#24180f" strokeWidth="1.1" />
      <g transform={`rotate(${knee} ${hipX} ${hipY + 26})`}>
        <path d={`M${hipX - 6} ${hipY + 24} h12 v22 q0 4 -6 4 q-6 0 -6 -4 z`} fill={pants} stroke="#24180f" strokeWidth="1.1" />
        <path d={`M${hipX - 8} ${hipY + 48} h18 v6 q0 2 -3 2 h-14 q-2 0 -1 -2 z`} fill={shoe} stroke="#24180f" strokeWidth="1" />
        <path d={`M${hipX - 6} ${hipY + 48} h14`} stroke="#fff" strokeWidth="0.8" opacity="0.25" />
      </g>
    </g>
  )
}

function Arm({
  shoulderX,
  shoulderY,
  shoulder,
  elbow,
  skin,
  shade,
  sleeve,
  open,
  cup,
}: {
  shoulderX: number
  shoulderY: number
  shoulder: number
  elbow: number
  skin: string
  shade: string
  sleeve: string
  open: boolean
  cup: boolean
}) {
  const upper = 24
  const fore = 22
  return (
    <g transform={`rotate(${shoulder} ${shoulderX} ${shoulderY})`}>
      <path
        d={`M${shoulderX - 6} ${shoulderY - 2} h12 v${upper} q0 4 -6 4 t-6 -4 z`}
        fill={sleeve}
        stroke="#24180f"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <g transform={`rotate(${elbow} ${shoulderX} ${shoulderY + upper})`}>
        <path
          d={`M${shoulderX - 4.5} ${shoulderY + upper - 2} h9 v${fore} q0 3 -4.5 3 t-4.5 -3 z`}
          fill={skin}
          stroke="#24180f"
          strokeWidth="1.05"
        />
        <g transform={`translate(${shoulderX} ${shoulderY + upper + fore})`}>
          <Hand skin={skin} shade={shade} open={open} cup={cup} />
        </g>
      </g>
    </g>
  )
}

function Hand({ skin, shade, open, cup }: { skin: string; shade: string; open: boolean; cup: boolean }) {
  const gap = open ? 3.2 : 2.15
  return (
    <g>
      {cup && (
        <g transform="translate(0 2)">
          <LemonCup />
        </g>
      )}
      <ellipse cx="0" cy="0" rx="6.4" ry="4.8" fill={skin} stroke="#24180f" strokeWidth="0.9" />
      <ellipse cx={open ? -7.2 : -5.2} cy="1" rx="2.5" ry="3.5" fill={shade} transform={`rotate(${open ? -35 : -16})`} />
      {[0, 1, 2, 3].map((finger) => (
        <rect
          key={finger}
          x={-5.2 + finger * gap}
          y={open ? 3 : 2}
          width="2.4"
          height={open ? 8.5 : 6}
          rx="1.15"
          fill={finger % 2 ? shade : skin}
          stroke="#24180f"
          strokeWidth="0.55"
        />
      ))}
    </g>
  )
}

function LemonCup() {
  return (
    <g transform="translate(0 -8)">
      <path d="M-8 3 h18 l-2.2 16 h-13.6 z" fill="#ffe14a" stroke="#c98400" strokeWidth="1.2" />
      <ellipse cx="1" cy="3" rx="9" ry="2.6" fill="#fff6c2" stroke="#e2a800" strokeWidth="0.8" />
      <path d="M-5 9 h12" stroke="#fff" strokeWidth="1.3" opacity="0.75" />
      <path d="M6 1 q5 1 3 6" fill="none" stroke="#e2a800" strokeWidth="1.2" />
    </g>
  )
}

export function IllustratedHead({
  cx,
  cy,
  skin,
  shade,
  lip,
  iris,
  hair,
  style,
  scale = 1,
}: {
  cx: number
  cy: number
  skin: string
  shade: string
  lip: string
  iris: string
  hair: string
  style: number
  scale?: number
}) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <HairBack style={style} color={hair} />
      <ellipse cx="-16" cy="2" rx="4.2" ry="6.2" fill={shade} />
      <path d="M-13 2 q-2 4 1 7 q3 -2 2 -5 z" fill={skin} />
      <path
        d="M-14 -4 C-16 -20 -6 -26 1 -26 C12 -26 18 -16 16 0 C15 14 8 22 0 23 C-10 22 -15 12 -14 -4 Z"
        fill={skin}
        stroke="#24180f"
        strokeWidth="1.15"
      />
      <path d="M-8 14 Q0 20 8 13 Q5 18 0 18 Q-5 18 -8 14" fill="#000" opacity="0.08" />
      <path d="M-12 -8 Q-7 -13 -2 -8" fill="none" stroke={hair} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 -8.4 Q8 -13 13 -7.2" fill="none" stroke={hair} strokeWidth="1.7" strokeLinecap="round" />
      <Eye cx={-7} iris={iris} />
      <Eye cx={6.5} iris={iris} />
      <path d="M-0.5 -1 Q2 7 0.4 9" fill="none" stroke={shade} strokeWidth="1.35" strokeLinecap="round" />
      <path d="M-3.2 9.2 Q0.4 11.4 3.6 8.8" fill="none" stroke={shade} strokeWidth="1.05" strokeLinecap="round" />
      <path d="M-5.5 13.2 Q0 11.2 5.6 13.2 Q0 17.4 -5.5 13.2" fill={lip} />
      <path d="M-4 13.3 Q0 14.2 4 13.3" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.45" />
      <HairFront style={style} color={hair} />
    </g>
  )
}

function Eye({ cx, iris }: { cx: number; iris: string }) {
  return (
    <g>
      <ellipse cx={cx} cy="-1.5" rx="5" ry="3.1" fill="#fffaf4" stroke="#24180f" strokeWidth="0.8" />
      <circle cx={cx - 0.3} cy="-1.3" r="1.9" fill={iris} />
      <circle cx={cx - 0.3} cy="-1.3" r="0.95" fill="#1c1915" />
      <circle cx={cx - 1.1} cy="-2.2" r="0.6" fill="#fff" />
    </g>
  )
}

function HairBack({ style, color }: { style: number; color: string }) {
  if (style === 1) {
    return <path d="M-18 -2 C-22 -28 20 -30 18 0 L16 28 C6 18 -10 20 -17 30 Z" fill={color} />
  }
  if (style === 2) {
    return (
      <g fill={color}>
        <circle cx="-14" cy="-6" r="8" />
        <circle cx="14" cy="-8" r="7" />
        <circle cx="-4" cy="-20" r="8" />
        <circle cx="8" cy="-18" r="7" />
        <path d="M-16 -8 C-16 -24 16 -24 16 -6 C8 -16 -8 -16 -16 -8" />
      </g>
    )
  }
  if (style === 3) {
    return (
      <g fill={color}>
        <path d="M-16 -6 C-18 -26 18 -28 16 -4 L14 36 C4 24 -8 26 -15 38 Z" />
        <circle cx="12" cy="-24" r="7" />
      </g>
    )
  }
  if (style === 4) return <path d="M-14 -10 C-16 -24 16 -24 14 -8 C8 -16 -8 -16 -14 -10" fill={color} />
  if (style === 5) {
    return (
      <g fill={color}>
        <path d="M-15 -8 C-16 -24 16 -26 15 -6 C8 -16 -8 -16 -15 -8" />
        <path d="M8 -16 C14 -8 16 8 10 16 C16 4 14 -10 8 -16" />
      </g>
    )
  }
  return <path d="M-15 -6 C-18 -26 18 -26 15 -4 C8 -16 -8 -16 -15 -6" fill={color} />
}

function HairFront({ style, color }: { style: number; color: string }) {
  if (style === 4) return null
  if (style === 1) return <path d="M-12 -14 Q-2 -22 10 -13 Q2 -18 -10 -14" fill={color} />
  if (style === 2) return <path d="M-10 -16 Q0 -23 11 -14 Q4 -18 -8 -15" fill={color} />
  if (style === 3) return <path d="M-8 -15 Q2 -21 10 -14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
  if (style === 5) return <path d="M-6 -16 Q2 -22 12 -14" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  return <path d="M-11 -15 Q0 -22 12 -14 Q4 -18 -8 -14" fill={color} />
}

const KEEPER_LOOK = {
  girl: { tone: '#e0ac7a', shade: '#c48e60', lip: '#b56b62', iris: '#4a3020', hair: '#3a2414', style: 1 },
  guy: { tone: '#c68642', shade: '#a56a30', lip: '#8d4a3c', iris: '#3a2414', hair: '#1c1915', style: 0 },
} as const

/** Chest-up keeper behind the counter. The offered cup is drawn later, in front of the counter. */
export function KeeperPortrait({ keeper }: { keeper: Keeper }) {
  const look = KEEPER_LOOK[keeper]
  return (
    <g data-testid="stand-keeper" data-keeper={keeper}>
      <path d="M20 104 q26 8 52 0 l2 16 h-56 z" fill="#fff6e8" stroke="#24180f" strokeWidth="1" />
      <path d="M32 108 h24 v12 h-24 z" fill="#0e5e59" />
      <path d="M38 102 h14 v8 h-14 z" fill={look.tone} />
      <IllustratedHead
        cx={46}
        cy={82}
        scale={0.9}
        skin={look.tone}
        shade={look.shade}
        lip={look.lip}
        iris={look.iris}
        hair={look.hair}
        style={look.style}
      />
    </g>
  )
}

export function KeeperOffer({ keeper, offering }: { keeper: Keeper; offering: boolean }) {
  const look = KEEPER_LOOK[keeper]
  if (!offering) {
    return (
      <g>
        <ellipse cx="34" cy="124" rx="6.5" ry="3.4" fill={look.tone} stroke="#24180f" strokeWidth="0.7" />
        <ellipse cx="58" cy="124" rx="6.5" ry="3.4" fill={look.tone} stroke="#24180f" strokeWidth="0.7" />
      </g>
    )
  }
  return (
    <g data-testid="keeper-offer">
      <path d="M64 100 q34 -16 78 -8" stroke="#0e5e59" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M136 90 q12 1 14 0" stroke={look.tone} strokeWidth="6.5" strokeLinecap="round" fill="none" />
      <g transform="translate(152 78)">
        <LemonCup />
        <ellipse cx="1" cy="4" rx="5.5" ry="3.6" fill={look.tone} stroke="#24180f" strokeWidth="0.8" />
      </g>
    </g>
  )
}
