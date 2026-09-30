import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS } from '../../game/constants'
import { formatMoney } from '../../game/money'
import { buildSidewalk, tallyAt } from '../../game/sidewalk'
import { useGame } from '../../state/GameContext'
import { SidewalkDay } from '../SidewalkDay'
import { Header } from '../Header'
import { Button, Dock, Shell, cx, useFocusHeading } from '../ui'

export function Selling({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const reduced = usePrefersReducedMotion()
  const heading = useFocusHeading()
  const result = state?.pending ?? null
  const people = state?.arrivals && state.arrivals.length > 0 ? state.arrivals : result ? buildSidewalk(result).people : []
  const duration = Math.max(2, ...people.map((person) => person.end), 0) + 0.25
  const [elapsed, setElapsed] = useState(0)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [skipped, setSkipped] = useState(false)
  const elapsedRef = useRef(0)
  const dayStamp = result?.day ?? 0

  useEffect(() => {
    if (reduced || skipped) return
    elapsedRef.current = 0
    setElapsed(0)
  }, [dayStamp, reduced, skipped])

  useEffect(() => {
    if (!reduced && !skipped) return
    elapsedRef.current = duration
    setElapsed(duration)
  }, [reduced, skipped, duration])

  useEffect(() => {
    if (reduced || skipped || people.length === 0) return
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
  }, [reduced, skipped, speed, duration, people.length])

  if (!state || !result || people.length === 0) return null
  const done = reduced || skipped || elapsed >= duration - 0.05
  const tally = tallyAt(people, done ? duration : elapsed)
  const displayCash = state.shelf
    ? state.shelf.cashAfterFeesCents + tally.revenueCents
    : state.cashCents - result.revenueCents + tally.revenueCents
  const cast = { people, duration }

  return (
    <Shell>
      <Header onTitle={onTitle} cashCents={displayCash} />
      <main className="flex-1 px-4 pt-4">
        <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
          {result.hours === 0 ? 'Shutters down' : 'On the sidewalk'}
        </h1>
        <p className="mt-1 text-ink-soft">
          {result.hours === 0
            ? 'The stand stays closed. People keep walking.'
            : 'Some people walk by. Some stop, take a cup, and tell you what it was like.'}
        </p>
        <SidewalkDay result={result} cast={cast} elapsed={elapsed} reduced={reduced || skipped} keeper={state.keeper} />
        {result.hours > 0 && state.shelf && !done && (
          <PriceOnTheCurb
            priceCents={state.recipe.priceCents}
            onChange={(cents) => dispatch({ type: 'set-price', cents, at: elapsedRef.current })}
          />
        )}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Count label="Served" value={tally.served} testId="tally-served" />
          <Count label="Walked" value={tally.walked} testId="tally-walked" />
          <Count label="Sold out" value={tally.missed} testId="tally-missed" />
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

function PriceOnTheCurb({ priceCents, onChange }: { priceCents: number; onChange: (cents: number) => void }) {
  return (
    <section className="mt-4" data-testid="sidewalk-price">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Price per cup</h2>
        <p className="font-display text-4xl font-semibold">{formatMoney(priceCents)}</p>
      </div>
      <div className="mt-2 flex gap-2">
        {[
          ['−25¢', -25],
          ['−5¢', -5],
          ['+5¢', 5],
          ['+25¢', 25],
        ].map(([label, delta]) => {
          const next = priceCents + Number(delta)
          return (
            <button
              key={label}
              type="button"
              className="min-h-12 flex-1 rounded-xl bg-sand font-semibold disabled:opacity-40"
              disabled={next < PRICE_MIN_CENTS || next > PRICE_MAX_CENTS}
              onClick={() => onChange(next)}
            >
              {label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-ink-soft">People already at the stand keep the price they walked up to. The next ones see this.</p>
    </section>
  )
}

function Count({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded-2xl bg-sand px-2 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-display text-3xl font-semibold" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}
