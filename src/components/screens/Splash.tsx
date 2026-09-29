import { useState } from 'react'
import { BUSINESS_QUESTION } from '../../game/constants'
import { useGame } from '../../state/GameContext'
import { LemonMentor } from '../art'
import { Button, Card, Shell, useFocusHeading } from '../ui'

export function Splash({ onStart, onContinue }: { onStart: () => void; onContinue: () => void }) {
  const { state } = useGame()
  const heading = useFocusHeading()
  const [confirmNew, setConfirmNew] = useState(false)
  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <img
          src="/brand/logo.png"
          alt="Y.E.S. Youth Entrepreneur Startup"
          className="mx-auto h-auto w-44"
          data-testid="logo"
        />
        <div className="mt-6 flex justify-center" aria-hidden="true">
          <LemonMentor className="floaty h-20 w-20" />
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-center font-display text-4xl leading-tight font-semibold text-balance outline-none">
          Y.E.S. Lemonade Startup
        </h1>
        <p className="mt-3 text-center text-lg text-ink-soft">Can you turn $20 into a profitable business?</p>
        <div className="mt-8 space-y-3">
          {confirmNew ? (
            <Card>
              <p className="font-semibold">Start a new stand?</p>
              <p className="mt-1 text-sm text-ink-soft">This replaces the season saved on this device.</p>
              <div className="mt-4 space-y-2">
                <Button data-testid="confirm-new" onClick={onStart}>
                  Yes, start over
                </Button>
                <Button variant="secondary" onClick={() => setConfirmNew(false)}>
                  Keep my season
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Button data-testid="start-startup" onClick={() => (state ? setConfirmNew(true) : onStart())}>
                START YOUR STARTUP
              </Button>
              {state && (
                <Button variant="secondary" data-testid="continue-run" onClick={onContinue}>
                  {state.phase === 'career' ? 'View your season report' : `Continue day ${state.day}`}
                </Button>
              )}
            </>
          )}
        </div>
        <Card className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-teal">THE QUESTION</p>
          <p className="mt-1 font-display text-2xl leading-snug font-semibold">{BUSINESS_QUESTION}</p>
          <p className="mt-2 text-sm text-ink-soft">
            Customers, sales, and a full cash box can still be a bad job. Every day ends with profit, time, and what you earned per hour.
          </p>
        </Card>
      </main>
    </Shell>
  )
}
