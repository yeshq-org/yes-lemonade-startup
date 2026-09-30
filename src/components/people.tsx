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
  { tone: '#c68642', shade: '#a56b34', lip: '#a15a48', iris: '#3a2618', shirt: '#2f6b4a', hair: '#24160f', pants: '#2c3a4e', shoe: '#1c1915' },
  { tone: '#f0c7a0', shade: '#d7a888', lip: '#c4847a', iris: '#5c4030', shirt: '#2c4f86', hair: '#5c3317', pants: '#3d4a62', shoe: '#3a241c' },
  { tone: '#8d5524', shade: '#6e4018', lip: '#6d3a32', iris: '#2a1810', shirt: '#8d3b3b', hair: '#1a120c', pants: '#3d342c', shoe: '#1c1915' },
  { tone: '#e7b898', shade: '#c99278', lip: '#c47b74', iris: '#4a3424', shirt: '#1c4e6e', hair: '#3a2414', pants: '#4a3728', shoe: '#24160f' },
  { tone: '#6b3a22', shade: '#4e2816', lip: '#5a3028', iris: '#1a100c', shirt: '#efe6d2', hair: '#140e0b', pants: '#1e293b', shoe: '#11100e' },
  { tone: '#f3d2b5', shade: '#e0b494', lip: '#d08980', iris: '#6a4a30', shirt: '#c4622d', hair: '#8a6239', pants: '#2c3d55', shoe: '#3f2a22' },
]

/** Egg-shaped head: broader forehead, narrower chin. Used by buyers and the seller. */
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
      <ellipse cx="-15" cy="2" rx="3.4" ry="5.4" fill={shade} />
      <path d="M-13.2 1.2 q-1.6 3.2 1.2 5.6 q2.4 -1.6 1.4 -4.2 z" fill={skin} />
      <path
        d="M0 -23 C14 -22 16 -8 13 5 C11 15 6 23 0 24 C-6 23 -11 15 -13 5 C-16 -8 -14 -22 0 -23 Z"
        fill={skin}
      />
      <path d="M-6 16 Q0 21 6 15 Q3 18 0 18 Q-3 18 -6 16" fill="#000" opacity="0.06" />
      <path d="M-11 -8 Q-6 -11 -2 -8" fill="none" stroke={hair} strokeWidth="1.35" strokeLinecap="round" />
      <path d="M2.4 -8.2 Q7 -11.2 11.2 -7.4" fill="none" stroke={hair} strokeWidth="1.35" strokeLinecap="round" />
      <Eye cx={-5.6} iris={iris} />
      <Eye cx={5.4} iris={iris} />
      <path d="M-0.4 -1.5 Q1.6 5 0.2 7.2" fill="none" stroke={shade} strokeWidth="1.15" strokeLinecap="round" />
      <path d="M-2.4 7.4 Q0.2 8.8 2.6 7.2" fill="none" stroke={shade} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M-3.6 12.2 Q0 13.6 3.6 12.2 Q0 15  -3.6 12.2" fill={lip} />
      <HairFront style={style} color={hair} />
    </g>
  )
}

function Eye({ cx, iris }: { cx: number; iris: string }) {
  return (
    <g>
      <path
        d={`M${cx - 3.3} -3.2 Q${cx} -5.1 ${cx + 3.3} -3.1 Q${cx} -1.2 ${cx - 3.3} -3.2`}
        fill="#fffaf4"
      />
      <circle cx={cx + 0.2} cy="-3.15" r="1.25" fill={iris} />
      <circle cx={cx + 0.2} cy="-3.15" r="0.62" fill="#24180f" />
      <circle cx={cx - 0.35} cy="-3.55" r="0.32" fill="#fff" />
    </g>
  )
}

function HairBack({ style, color }: { style: number; color: string }) {
  if (style === 1) return <path d="M-14 -6 C-18 -28 16 -30 14 -4 L12 18 C4 10 -8 12 -14 20 Z" fill={color} />
  if (style === 2) {
    return (
      <g fill={color}>
        <path d="M-14 -8 C-16 -26 16 -28 14 -6 C8 -16 -8 -16 -14 -8" />
        <circle cx="-12" cy="-4" r="6" />
        <circle cx="11" cy="-6" r="5.5" />
        <circle cx="0" cy="-20" r="6" />
      </g>
    )
  }
  if (style === 3) return <path d="M-13 -10 C-14 -24 14 -26 13 -8 C8 -16 -8 -16 -13 -10" fill={color} />
  if (style === 4) {
    return (
      <g fill={color}>
        <path d="M-14 -8 C-16 -26 15 -28 13 -6 C7 -16 -8 -16 -14 -8" />
        <path d="M6 -14 C12 -6 13 10 8 16 C14 6 12 -8 6 -14" />
      </g>
    )
  }
  if (style === 5) return <path d="M-12 -12 C-10 -24 12 -26 11 -10 C6 -18 -6 -18 -12 -12" fill={color} />
  return <path d="M-13 -8 C-16 -26 15 -27 13 -6 C7 -16 -8 -16 -13 -8" fill={color} />
}

function HairFront({ style, color }: { style: number; color: string }) {
  if (style === 3 || style === 5) return null
  if (style === 1) return <path d="M-10 -16 Q0 -23 9 -15 Q2 -19 -8 -16" fill={color} />
  if (style === 2) return <path d="M-8 -15 Q0 -22 8 -14" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  return <path d="M-9 -16 Q0 -22 10 -14 Q3 -18 -7 -15" fill={color} />
}

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
  const nearShoulder = pose === 'reach' ? -108 - 18 * reach : pose === 'hold' || pose === 'leave' ? -18 : stride * -12
  const nearElbow = pose === 'reach' ? -24 : pose === 'hold' || pose === 'leave' ? -14 : stride * 8
  const farShoulder = walking ? stride * 14 : 6
  const farElbow = walking ? stride * -8 : 4

  return (
    <svg viewBox="0 0 78 148" className="h-[124px] w-[66px] overflow-visible" aria-hidden="true">
      <ellipse cx="40" cy="144" rx="14" ry="2.4" fill="#1c1915" opacity="0.14" />
      <Leg hipX={48} hipY={86} hip={walking ? stride * 16 : 3} knee={walking ? (stride > 0 ? 18 : 6) : 3} pants={look.pants} shoe={look.shoe} />
      <Arm shoulderX={52} shoulderY={58} shoulder={farShoulder} elbow={farElbow} skin={look.tone} sleeve={look.shirt} cup={false} />
      <Leg hipX={34} hipY={86} hip={walking ? stride * -16 : -3} knee={walking ? (stride > 0 ? 6 : 18) : 3} pants={look.pants} shoe={look.shoe} />
      <path d="M24 56 q16 6 32 0 l4 26 q-3 8 -20 9 q-18 -1 -20 -9 z" fill={look.shirt} />
      <path d="M36 78 h10 l-1 8 h-8 z" fill={look.pants} />
      <path d="M34 52 h12 v7 h-12 z" fill={look.tone} />
      <Arm
        shoulderX={28}
        shoulderY={57}
        shoulder={nearShoulder}
        elbow={nearElbow}
        skin={look.tone}
        sleeve={look.shirt}
        cup={cup}
      />
      <IllustratedHead
        cx={40}
        cy={30}
        scale={0.92}
        skin={look.tone}
        shade={look.shade}
        lip={look.lip}
        iris={look.iris}
        hair={look.hair}
        style={hair}
      />
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
      <path d={`M${hipX - 5} ${hipY} h10 v16 q0 3 -5 4 q-5 -1 -5 -4 z`} fill={pants} />
      <g transform={`rotate(${knee} ${hipX} ${hipY + 18})`}>
        <path d={`M${hipX - 4.5} ${hipY + 16} h9 v16 q0 3 -4.5 3 q-4.5 0 -4.5 -3 z`} fill={pants} />
        <path d={`M${hipX - 6} ${hipY + 33} h14 v4.5 q0 1.5 -2 1.5 h-11 q-1.5 0 -1 -1.5 z`} fill={shoe} />
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
  sleeve,
  cup,
}: {
  shoulderX: number
  shoulderY: number
  shoulder: number
  elbow: number
  skin: string
  sleeve: string
  cup: boolean
}) {
  const upper = 16
  const fore = 15
  return (
    <g transform={`rotate(${shoulder} ${shoulderX} ${shoulderY})`}>
      <path d={`M${shoulderX - 4} ${shoulderY - 1} h8 v${upper} q0 2.5 -4 2.5 t-4 -2.5 z`} fill={sleeve} />
      <g transform={`rotate(${elbow} ${shoulderX} ${shoulderY + upper})`}>
        <path d={`M${shoulderX - 3.2} ${shoulderY + upper - 1} h6.4 v${fore} q0 2 -3.2 2 t-3.2 -2 z`} fill={skin} />
        <g transform={`translate(${shoulderX} ${shoulderY + upper + fore})`}>
          <ellipse cx="0" cy="1" rx="4.2" ry="3" fill={skin} />
          <ellipse cx="-3.4" cy="0.4" rx="1.5" ry="2.2" fill={skin} />
          {cup && (
            <g transform="translate(0 1)">
              <path d="M-5 0 h11 l-1.4 10 h-8.2 z" fill="#ffe14a" stroke="#c98400" strokeWidth="0.8" />
              <ellipse cx="0.5" cy="0" rx="5.5" ry="1.7" fill="#fff6c2" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

const SELLER = {
  girl: { tone: '#e0ac7a', shade: '#c48e60', lip: '#b56b62', iris: '#4a3020', hair: '#3a2414', style: 1 },
  guy: { tone: '#c68642', shade: '#a56a30', lip: '#8d4a3c', iris: '#3a2414', hair: '#1c1915', style: 0 },
} as const

/** Seller standing on the high deck, in the stand's coordinate space. Feet stay above the buyers. */
export function StandingSeller({ keeper, offering }: { keeper: Keeper; offering: boolean }) {
  const look = SELLER[keeper]
  const shirt = keeper === 'girl' ? '#efe6d2' : '#31425c'
  const pants = keeper === 'girl' ? '#2c3a4e' : '#243044'
  return (
    <g data-testid="stand-keeper" data-keeper={keeper}>
      <path d="M52 164 h18 v14 h-20 q-1 0 -1 -2 z" fill="#2a211c" />
      <path d="M84 164 h18 v14 h-20 q-1 0 -1 -2 z" fill="#241c18" />
      <path d="M56 118 h12 v50 h-12 z" fill={pants} />
      <path d="M86 118 h12 v50 h-12 z" fill={pants} />
      <path d="M50 78 h52 l4 44 h-60 z" fill={shirt} />
      <path d="M62 92 h28 v24 h-28 z" fill="#0e5e59" />
      <path d="M70 76 h12 v10 h-12 z" fill={look.tone} />
      {offering ? (
        <g data-testid="keeper-offer">
          <path d="M100 90 q26 -6 46 4" stroke={shirt} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M144 94 q10 2 14 4" stroke={look.tone} strokeWidth="6" strokeLinecap="round" fill="none" />
          <g transform="translate(162 92)">
            <path d="M-6 0 h13 l-1.5 11 h-10 z" fill="#ffe14a" stroke="#c98400" strokeWidth="0.9" />
            <ellipse cx="0.5" cy="0" rx="6.5" ry="2" fill="#fff6c2" />
            <ellipse cx="1" cy="6" rx="3.6" ry="2.4" fill={look.tone} />
          </g>
        </g>
      ) : (
        <g>
          <path d="M48 92 q-10 18 -6 30" stroke={shirt} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M104 92 q10 18 6 30" stroke={shirt} strokeWidth="7" strokeLinecap="round" fill="none" />
          <ellipse cx="42" cy="124" rx="5" ry="3.2" fill={look.tone} />
          <ellipse cx="110" cy="124" rx="5" ry="3.2" fill={look.tone} />
        </g>
      )}
      <IllustratedHead
        cx={76}
        cy={54}
        scale={0.92}
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
