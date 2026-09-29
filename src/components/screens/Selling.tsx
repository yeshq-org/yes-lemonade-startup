import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import type { DayResult } from '../../game/types'
import { useGame } from '../../state/GameContext'
import { StandScene } from '../art'
import { Header } from '../Header'
import { Button, Dock, Shell, cx, useFocusHeading } from '../ui'

function linesFor(result: DayResult): string[] {
  if (result.hours === 0) return ['The shutters stay down. Ice you already bought still melts tonight.']
  if (result.potential === 0) return ['The sidewalk is quiet. Nobody tests the price.']
  const buyCopy = ['I will take a cup.', 'This hits.', 'Worth the walk.', 'Cold and bright.', 'Okay, you got me.']
  const passCopy = ['Too much for me.', 'I will keep walking.', 'Not the taste I wanted.', 'Maybe tomorrow.']
  const outCopy = ['You are already out?', 'I got here too late.']
  const buys = result.sold > 0 ? Math.max(1, Math.round((8 * result.sold) / Math.max(1, result.potential))) : 0
  const outs = result.soldOutMissed > 0 ? Math.max(1, Math.min(2, Math.round((8 * result.soldOutMissed) / Math.max(1, result.potential)))) : 0
  const passes = Math.max(0, Math.min(8, 8 - buys - outs))
  const lines = [
    ...Array.from({ length: buys }, (_, index) => buyCopy[index % buyCopy.length]!),
    ...Array.from({ length: passes }, (_, index) => passCopy[index % passCopy.length]!),
    ...Array.from({ length: outs }, (_, index) => outCopy[index % outCopy.length]!),
  ]
  return lines.length > 0 ? lines : ['A quiet hour at the cart.']
}

export function Selling({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const reduced = usePrefersReducedMotion()
  const heading = useFocusHeading()
  const result = state?.pending ?? null
  const [progress, setProgress] = useState(reduced ? 1 : 0)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (!result || reduced || skipped || result.hours === 0) {
      setProgress(1)
      return
    }
    let start: number | null = null
    let frame = 0
    const duration = speed === 2 ? 3200 : 6800
    const tick = (now: number) => {
      if (start === null) start = now
      const next = Math.min(1, (now - start) / duration)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, skipped, speed, result])

  if (!state || !result) return null
  const lines = linesFor(result)
  const lineIndex = Math.min(lines.length - 1, Math.floor(progress * lines.length))
  const line = lines[lineIndex] ?? lines[0]!
  const served = Math.round(result.sold * progress)
  const walked = Math.round(result.walkedAway * progress)
  const missed = Math.round(result.soldOutMissed * progress)
  const done = progress >= 1

  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <h1 ref={heading} tabIndex={-1} className="font-display text-4xl font-semibold outline-none">
          {result.hours === 0 ? 'Closed for the day' : 'The street decides'}
        </h1>
        <div className="mt-4">
          <StandScene weather={result.weather} quiet={result.hours === 0 || result.potential === 0} />
        </div>
        <p
          key={lineIndex}
          className="pop-in mt-4 min-h-14 rounded-2xl bg-card px-4 py-3 text-lg font-semibold shadow-[0_0_0_1.5px_#eadcc6]"
          aria-live="polite"
        >
          {line}
        </p>
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
              onClick={() => {
                setSkipped(true)
                setProgress(1)
              }}
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
