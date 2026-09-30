import { randomSeed } from '../../game/rng'
import type { Keeper, SeasonLength } from '../../game/types'
import { useGame } from '../../state/GameContext'
import { Button, Shell, useFocusHeading } from '../ui'

const OPTIONS: { days: SeasonLength; name: string; detail: string }[] = [
  { days: 7, name: '7 days', detail: 'Best first run. Enough to learn the loop.' },
  { days: 14, name: '14 days', detail: 'Two weeks to build word of mouth.' },
  { days: 30, name: '30 days', detail: 'A full season. Waste and price compound.' },
]

export function Season({ keeper, onBack, onStart }: { keeper: Keeper; onBack: () => void; onStart: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-8 pb-8">
        <button type="button" className="min-h-12 self-start font-semibold text-teal" onClick={onBack}>
          Back
        </button>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-4xl leading-tight font-semibold outline-none">
          How long is the season?
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          You open with $20. {state ? 'Choosing a length replaces the stand saved on this device.' : 'Pick a length you can finish.'}
        </p>
        <div className="mt-6 space-y-3">
          {OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              data-testid={`season-${option.days}`}
              className="w-full rounded-3xl bg-card p-4 text-left shadow-[0_0_0_1.5px_#eadcc6] transition active:translate-y-px"
              onClick={() => {
                dispatch({ type: 'start', seasonDays: option.days, seed: randomSeed(), keeper })
                onStart()
              }}
            >
              <span className="block font-display text-3xl font-semibold">{option.name}</span>
              <span className="mt-1 block text-ink-soft">{option.detail}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6">
          <Button variant="ghost" onClick={onBack}>
            Not yet
          </Button>
        </div>
      </main>
    </Shell>
  )
}
