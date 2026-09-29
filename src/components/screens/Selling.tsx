import { useEffect, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { buildSidewalk } from '../../game/sidewalk'
import { useGame } from '../../state/GameContext'
import { SidewalkDay } from '../SidewalkDay'
import { Header } from '../Header'
import { Button, Dock, Shell, cx, useFocusHeading } from '../ui'

export function Selling({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const reduced = usePrefersReducedMotion()
  const heading = useFocusHeading()
  const result = state?.pending ?? null
  const cast = useMemo(() => (result ? buildSidewalk(result) : null), [result])
  const [elapsed, setElapsed] = useState(0)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [skipped, setSkipped] = useState(false)
  const elapsedRef = useRef(0)
  const duration = cast?.duration ?? 1

  useEffect(() => {
    elapsedRef.current = reduced || skipped ? duration : 0
    setElapsed(elapsedRef.current)
  }, [duration, reduced, skipped])

  useEffect(() => {
    if (reduced || skipped || !cast) return
    let last = performance.now()
    let frame = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const next = Math.min(duration, elapsedRef.current + dt * speed)
      elapsedRef.current = next
      setElapsed(next)
      if (next < duration) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [reduced, skipped, speed, duration, cast])

  if (!state || !result || !cast) return null
  const done = reduced || skipped || elapsed >= duration - 0.05
  const progress = Math.min(1, elapsed / duration)
  const served = Math.round(result.sold * progress)
  const walked = Math.round(result.walkedAway * progress)
  const missed = Math.round(result.soldOutMissed * progress)

  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
          {result.hours === 0 ? 'Shutters down' : 'On the sidewalk'}
        </h1>
        <p className="mt-1 text-ink-soft">
          {result.hours === 0
            ? 'The stand stays closed. People keep walking.'
            : 'Some people walk by. Some stop, drink, and tell you what the cup was like.'}
        </p>
        <SidewalkDay result={result} cast={cast} elapsed={elapsed} reduced={reduced} />
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Count label="Served" value={served} />
          <Count label="Walked" value={walked} />
          <Count label="Sold out" value={missed} />
        </dl>
      </main>
      <Dock>
        {done ? (
          <Button data-testid="count-cash" onClick={() => dispatch({ type: 'to-report' })}>
            Count the cash
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="skip-selling"
              className="min-h-12 rounded-2xl bg-card font-semibold shadow-[0_0_0_1.5px_#eadcc6]"
              onClick={() => setSkipped(true)}
            >
              Skip
            </button>
            <button
              type="button"
              aria-pressed={speed === 2}
              className={cx(
                'min-h-12 rounded-2xl font-semibold',
                speed === 2 ? 'bg-ink text-cream' : 'bg-card shadow-[0_0_0_1.5px_#eadcc6]',
              )}
              onClick={() => setSpeed((value) => (value === 2 ? 1 : 2))}
            >
              {speed === 2 ? '2× on' : 'Speed 2×'}
            </button>
          </div>
        )}
      </Dock>
    </Shell>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-sand px-2 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-display text-3xl font-semibold">{value}</dd>
    </div>
  )
}
