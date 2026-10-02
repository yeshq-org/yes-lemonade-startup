import { useState } from 'react'
import { BUSINESS_QUESTION } from '../../game/constants'
import type { Keeper } from '../../game/types'
import { useGame } from '../../state/GameContext'
import { LemonMentor } from '../art'
import { publicUrl } from '../../lib/publicUrl'
import { Button, Card, Shell, useFocusHeading } from '../ui'

export function Splash({ onStart, onContinue }: { onStart: (keeper: Keeper) => void; onContinue: () => void }) {
  const { state } = useGame()
  const heading = useFocusHeading()
  const [confirmNew, setConfirmNew] = useState(false)
  const [picking, setPicking] = useState(false)
  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <img
          src={publicUrl('brand/logo.png')}
          alt="Y.E.S. Youth Entrepreneur Startup"
          className="mx-auto h-auto w-44 max-w-full"
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
          {picking ? (
            <Card>
              <p className="font-semibold">Who is running the stand?</p>
              <p className="mt-1 text-sm text-ink-soft">This choice stays for the whole season.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="keeper-guy"
                  className="min-h-28 rounded-2xl bg-sand px-2 py-3 font-semibold"
                  onClick={() => onStart('guy')}
                >
                  <KeeperMark keeper="guy" />
                  Guy
                </button>
                <button
                  type="button"
                  data-testid="keeper-girl"
                  className="min-h-28 rounded-2xl bg-sand px-2 py-3 font-semibold"
                  onClick={() => onStart('girl')}
                >
                  <KeeperMark keeper="girl" />
                  Girl
                </button>
              </div>
            </Card>
          ) : confirmNew ? (
            <Card>
              <p className="font-semibold">Start a new stand?</p>
              <p className="mt-1 text-sm text-ink-soft">This replaces the season saved on this device.</p>
              <div className="mt-4 space-y-2">
                <Button data-testid="confirm-new" onClick={() => setPicking(true)}>
                  Yes, start over
                </Button>
                <Button variant="secondary" onClick={() => setConfirmNew(false)}>
                  Keep my season
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Button data-testid="start-startup" onClick={() => (state ? setConfirmNew(true) : setPicking(true))}>
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

function KeeperMark({ keeper }: { keeper: Keeper }) {
  const girl = keeper === 'girl'
  return (
    <svg viewBox="0 0 64 48" className="mx-auto mb-1 h-12 w-16" aria-hidden="true">
      <path d={girl ? 'M18 46 h28 v-16 h-28 z' : 'M14 46 h36 v-18 h-36 z'} fill="#fff6e8" />
      <path d="M24 34 h16 v12 h-16 z" fill="#0e5e59" />
      <circle cx="32" cy="20" r={girl ? 10 : 11} fill={girl ? '#e0ac7a' : '#c68642'} />
      {girl ? (
        <path d="M20 22 Q32 4 44 22 Q40 16 32 16 Q24 16 20 22" fill="#3a2414" />
      ) : (
        <path d="M21 18 Q32 6 43 18 Q40 12 32 12 Q24 12 21 18" fill="#1c1915" />
      )}
      <circle cx="28" cy="20" r="1.2" fill="#1c1915" />
      <circle cx="36" cy="20" r="1.2" fill="#1c1915" />
    </svg>
  )
}
