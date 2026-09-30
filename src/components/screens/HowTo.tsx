import { useState } from 'react'
import { MiniIcon } from '../art'
import { Button, Shell, useFocusHeading } from '../ui'

const CARDS = [
  {
    kind: 'cash' as const,
    title: 'Cash is not profit',
    body: 'You start with $20. Cups, lemons, sugar, and ice come out of that cash before anyone shows up.',
  },
  {
    kind: 'price' as const,
    title: 'Price is a decision',
    body: 'A cheap cup can sell out the stand. If the price barely covers supplies, you worked for almost nothing.',
  },
  {
    kind: 'time' as const,
    title: 'Time is a cost',
    body: 'Hours open bring customers, and they count as time invested. The score that matters is what you earn per hour.',
  },
  {
    kind: 'ice' as const,
    title: 'Buy for the cups',
    body: 'A cup needs a cup, lemons, sugar, and ice. What you buy comes out of the $20 before anyone shows up.',
  },
]

export function HowTo({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const card = CARDS[index]!
  const heading = useFocusHeading()
  const last = index === CARDS.length - 1
  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-8 pb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-[0.14em] text-teal">HOW THE STAND WORKS</p>
          <button type="button" className="min-h-12 px-2 font-semibold text-teal" data-testid="skip-howto" onClick={onDone}>
            Skip
          </button>
        </div>
        <div className="mt-8 flex flex-1 flex-col">
          <MiniIcon kind={card.kind} />
          <h1 ref={heading} tabIndex={-1} className="mt-4 font-display text-4xl leading-tight font-semibold outline-none">
            {card.title}
          </h1>
          <p className="mt-3 text-lg text-ink-soft">{card.body}</p>
        </div>
        <div className="mt-8 flex justify-center gap-2" aria-hidden="true">
          {CARDS.map((item, dot) => (
            <span key={item.title} className={dot === index ? 'h-2.5 w-8 rounded-full bg-ink' : 'h-2.5 w-2.5 rounded-full bg-line'} />
          ))}
        </div>
        <div className="mt-4">
          <Button
            data-testid="next-howto"
            onClick={() => {
              if (last) onDone()
              else setIndex((value) => value + 1)
            }}
          >
            {last ? 'Choose your season' : 'Next'}
          </Button>
        </div>
      </main>
    </Shell>
  )
}
