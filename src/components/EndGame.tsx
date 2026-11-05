import { useEffect, useRef, useState, type ReactNode } from 'react'
import { canEndEarly, daysIfEndedNow } from '../state/reducer'
import { useGame } from '../state/GameContext'
import { Button } from './ui'

/** Confirm text shared by the in-game button and the lobby. */
export function endConfirmText(days: number): string {
  return `End your game after ${days} day${days === 1 ? '' : 's'}? Your results will be final.`
}

/** Inline (never a covering overlay) "End game now" with a confirm step. */
export function EndGameNow({ onEnded, label = 'End game now' }: { onEnded?: () => void; label?: string }) {
  const { state, dispatch } = useGame()
  const [asking, setAsking] = useState(false)
  if (!state || !canEndEarly(state)) return null
  const days = daysIfEndedNow(state)
  if (!asking) {
    return (
      <Button variant="ghost" className="mt-1" data-testid="end-game" onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <ConfirmBox className="mt-2">
      <p className="font-semibold">{endConfirmText(days)}</p>
      <p className="mt-1 text-sm text-ink-soft">Your score is net profit so far over {days * 8} hours.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" data-testid="end-cancel" onClick={() => setAsking(false)}>
          Keep playing
        </Button>
        <Button
          data-testid="end-confirm-yes"
          onClick={() => {
            dispatch({ type: 'end-early' })
            setAsking(false)
            onEnded?.()
          }}
        >
          End game
        </Button>
      </div>
    </ConfirmBox>
  )
}

/**
 * The confirm replaces the "End game" button in place and scrolls itself to the middle of the screen,
 * so both buttons are visible right after the tap. It is part of the page, never a fixed overlay.
 */
export function ConfirmBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])
  return (
    <div ref={ref} className={`rounded-2xl bg-sand px-3 py-3 ${className}`} role="alertdialog" aria-label="End game" data-testid="end-confirm">
      {children}
    </div>
  )
}
