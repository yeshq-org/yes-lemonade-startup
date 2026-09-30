import { formatMoney } from '../game/money'
import type { Phase } from '../game/types'
import { weekdayName } from '../game/weather'
import { useGame } from '../state/GameContext'
import { cx } from './ui'

const STEPS: { id: Phase; label: string }[] = [
  { id: 'morning', label: 'Brief' },
  { id: 'shop', label: 'Stock' },
  { id: 'recipe', label: 'Recipe' },
  { id: 'selling', label: 'Sell' },
  { id: 'report', label: 'Report' },
]

export function Header({ onTitle, cashCents }: { onTitle: () => void; cashCents?: number }) {
  const { state } = useGame()
  if (!state) return null
  const cash = cashCents ?? state.cashCents
  const showSteps = state.phase !== 'career'
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-cream/95 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <img src="/brand/logo.png" alt="" className="h-11 w-11 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-wide text-teal">Y.E.S.</p>
          <p className="truncate text-sm font-semibold">
            {state.phase === 'career'
              ? 'Season report'
              : `${weekdayName(state.day)} · Day ${state.day} of ${state.seasonDays}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold tracking-[0.14em] text-ink-soft">{cash < 0 ? 'IN THE HOLE' : 'CASH'}</p>
          <p className={cx('font-display text-xl leading-none font-semibold', cash < 0 && 'text-coral')} data-testid="cash-readout">
            {formatMoney(cash)}
          </p>
        </div>
        <button type="button" onClick={onTitle} className="min-h-11 rounded-xl px-2 text-sm font-semibold text-teal">
          Title
        </button>
      </div>
      {showSteps && (
        <nav aria-label="Today" className="px-4 pb-2">
          <ol className="grid grid-cols-5 gap-1">
            {STEPS.map((step) => {
              const current = step.id === state.phase
              const done = STEPS.findIndex((item) => item.id === state.phase) > STEPS.findIndex((item) => item.id === step.id)
              return (
                <li key={step.id} aria-current={current ? 'step' : undefined}>
                  <span
                    className={cx(
                      'block rounded-full py-1 text-center text-xs font-bold',
                      current && 'bg-ink text-cream',
                      done && 'bg-leaf text-cream',
                      !current && !done && 'bg-sand text-ink-soft',
                    )}
                  >
                    {done && <span className="sr-only">Done: </span>}
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>
      )}
    </header>
  )
}
