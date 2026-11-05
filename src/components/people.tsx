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

/**
 * Friendly cartoon head: a round face, dot eyes that look where the person is going
 * (never straight out at the player), rosy cheeks, and a simple smile.
 * Happy faces close their eyes into little arcs.
 */
export function CartoonHead({
  cx,
  cy,
  skin,
  hair,
  style,
  facing = -1,
  happy = false,
  scale = 1,
}: {
  cx: number
  cy: number
  skin: string
  hair: string
  style: number
  /** -1 looks left, 1 looks right. */
  facing?: number
  happy?: boolean
  scale?: number
}) {
  const fx = facing * 3.2
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <HairBack style={style} color={hair} facing={facing} />
      <circle cx="0" cy="0" r="17" fill={skin} />
      <circle cx={-8 + fx} cy="6" r="2.8" fill="#ff8f7a" opacity="0.45" />
      <circle cx={8 + fx} cy="6" r="2.8" fill="#ff8f7a" opacity="0.45" />
      {happy ? (
        <g fill="none" stroke="#1c1915" strokeWidth="1.7" strokeLinecap="round" data-eyes="happy">
          <path d={`M${-7.6 + fx} 0 q2.3 -2.8 4.6 0`} />
          <path d={`M${3 + fx} 0 q2.3 -2.8 4.6 0`} />
        </g>
      ) : (
        <g fill="#1c1915" data-eyes="dots">
          <ellipse cx={-5.3 + fx + facing * 0.8} cy="-0.6" rx="1.7" ry="2.2" />
          <ellipse cx={5.3 + fx + facing * 0.8} cy="-0.6" rx="1.7" ry="2.2" />
        </g>
      )}
      {happy ? (
        <path d={`M${-4 + fx} 6.5 q4 5 8 0 z`} fill="#8a3b2e" />
      ) : (
        <path d={`M${-3 + fx} 7.5 q3 2.6 6 0`} fill="none" stroke="#1c1915" strokeWidth="1.4" strokeLinecap="round" />
      )}
      <HairFront style={style} color={hair} />
    </g>
  )
}

function HairBack({ style, color, facing }: { style: number; color: string; facing: number }) {
  if (style === 1) return <path d="M-19 0 a19 19 0 0 1 38 0 v16 q-4 4 -8 0 v-10 h-22 v10 q-4 4 -8 0 z" fill={color} />
  if (style === 2) {
    return (
      <g fill={color}>
        {[-15, -9, -2, 5, 12, 16].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 === 0 ? -12 : -15} r="7" />
        ))}
      </g>
    )
  }
  if (style === 4) return <circle cx={-facing * 18} cy="-4" r="6.5" fill={color} />
  if (style === 5) return <circle cx="0" cy="-19" r="7" fill={color} />
  return null
}

function HairFront({ style, color }: { style: number; color: string }) {
  if (style === 2) return null
  if (style === 3) return <path d="M-16 -6 a16.5 16.5 0 0 1 32 0 q-16 -7 -32 0 z" fill={color} />
  return <path d="M-17.5 -3 a17.5 17.5 0 0 1 35 0 q-7 -9 -17.5 -7 q-10 -2 -17.5 7 z" fill={color} />
}

export function PersonFigure({
  look,
  hair,
  pose,
  stride: swing = 0,
  cup,
  reach = 1,
  facing = -1,
  happy = false,
}: {
  look: PersonLook
  hair: number
  pose: Pose
  /** Smooth walk cycle from -1 to 1. */
  stride?: number
  cup: boolean
  reach?: number
  facing?: number
  happy?: boolean
}) {
  const walking = pose === 'walk' || pose === 'leave'
  const stride = walking ? swing : 0
  const nearShoulder = pose === 'reach' ? -72 - 16 * reach : pose === 'hold' || pose === 'leave' ? -30 : stride * -24
  const nearElbow = pose === 'reach' ? -10 : pose === 'hold' || pose === 'leave' ? -40 : stride * 10
  const farShoulder = walking ? stride * 24 : 8
  const farElbow = walking ? stride * -6 : 4

  return (
    <svg viewBox="0 0 78 148" className="h-[124px] w-[66px] overflow-visible" aria-hidden="true">
      <ellipse cx="40" cy="144" rx="14" ry="2.6" fill="#1c1915" opacity="0.14" />
      <Leg hipX={46} hipY={90} hip={walking ? stride * 22 : 3} pants={look.pants} shoe={look.shoe} facing={facing} />
      <Arm shoulderX={50} shoulderY={62} shoulder={farShoulder} elbow={farElbow} skin={look.tone} sleeve={look.shirt} cup={false} />
      <Leg hipX={34} hipY={90} hip={walking ? stride * -22 : -3} pants={look.pants} shoe={look.shoe} facing={facing} />
      <rect x="25" y="54" width="30" height="40" rx="14" fill={look.shirt} />
      <Arm shoulderX={30} shoulderY={62} shoulder={nearShoulder} elbow={nearElbow} skin={look.tone} sleeve={look.shirt} cup={cup} />
      <CartoonHead cx={40} cy={34} skin={look.tone} hair={look.hair} style={hair} facing={facing} happy={happy} />
    </svg>
  )
}

function Leg({
  hipX,
  hipY,
  hip,
  pants,
  shoe,
  facing,
}: {
  hipX: number
  hipY: number
  hip: number
  pants: string
  shoe: string
  facing: number
}) {
  return (
    <g transform={`rotate(${hip} ${hipX} ${hipY})`}>
      <path d={`M${hipX} ${hipY} V${hipY + 44}`} stroke={pants} strokeWidth="10" strokeLinecap="round" />
      <ellipse cx={hipX + facing * 3} cy={hipY + 49} rx="7.5" ry="4" fill={shoe} />
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
  const upper = 15
  const fore = 13
  return (
    <g transform={`rotate(${shoulder} ${shoulderX} ${shoulderY})`}>
      <path d={`M${shoulderX} ${shoulderY} V${shoulderY + upper}`} stroke={sleeve} strokeWidth="8" strokeLinecap="round" />
      <g transform={`rotate(${elbow} ${shoulderX} ${shoulderY + upper})`}>
        <path d={`M${shoulderX} ${shoulderY + upper} V${shoulderY + upper + fore}`} stroke={skin} strokeWidth="6.5" strokeLinecap="round" />
        <g transform={`translate(${shoulderX} ${shoulderY + upper + fore})`}>
          <circle cx="0" cy="1" r="4.6" fill={skin} />
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

/** Chest-up seller. The stand's front panel covers everything below the counter. */
export function StandingSeller({ keeper, offering }: { keeper: Keeper; offering: boolean }) {
  const look = SELLER[keeper]
  const shirt = keeper === 'girl' ? '#efe6d2' : '#31425c'
  return (
    <g data-testid="stand-keeper" data-keeper={keeper}>
      <path d="M62 86 h48 l4 28 h-56 z" fill={shirt} />
      <path d="M74 96 h24 v14 h-24 z" fill="#0e5e59" />
      <path d="M80 82 h12 v8 h-12 z" fill={look.tone} />
      {offering ? (
        <g data-testid="keeper-offer">
          <path d="M108 94 q30 0 52 8" stroke={shirt} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M158 102 q10 2 14 2" stroke={look.tone} strokeWidth="6" strokeLinecap="round" fill="none" />
          <g transform="translate(176 98)">
            <path d="M-6 0 h13 l-1.5 11 h-10 z" fill="#ffe14a" stroke="#c98400" strokeWidth="0.9" />
            <ellipse cx="0.5" cy="0" rx="6.5" ry="2" fill="#fff6c2" />
            <ellipse cx="1" cy="6" rx="3.6" ry="2.4" fill={look.tone} />
          </g>
        </g>
      ) : (
        <g>
          <path d="M62 98 q-8 8 -4 14" stroke={shirt} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M110 98 q8 8 4 14" stroke={shirt} strokeWidth="7" strokeLinecap="round" fill="none" />
          <ellipse cx="58" cy="114" rx="5" ry="3" fill={look.tone} />
          <ellipse cx="114" cy="114" rx="5" ry="3" fill={look.tone} />
        </g>
      )}
      <CartoonHead cx={86} cy={62} scale={0.95} skin={look.tone} hair={look.hair} style={look.style} facing={1} happy={offering} />
    </g>
  )
}
