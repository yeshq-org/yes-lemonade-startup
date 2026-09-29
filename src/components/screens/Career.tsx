import { BUSINESS_QUESTION, REFLECTIONS, seasonVerdict } from '../../game/coach'
import { STARTING_CASH_CENTS } from '../../game/constants'
import { formatHourly, formatMoney } from '../../game/money'
import { chainFromSummary, summarize, TIER_META } from '../../game/scoring'
import { weekdayName } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Chain } from '../Chain'
import { Header } from '../Header'
import { Receipt } from '../Receipt'
import { Button, Card, Dock, Shell, cx, useFocusHeading } from '../ui'

export function Career({ onTitle, onNewSeason }: { onTitle: () => void; onNewSeason: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state) return null
  const summary = summarize(state)
  const tier = TIER_META[summary.tier]
  const verdict = seasonVerdict(summary.earningsPerHourCents, summary.totalNetCents)
  const standFee = state.history.reduce((sum, day) => sum + day.standFeeCents, 0)
  const helper = state.history.reduce((sum, day) => sum + day.helperCents, 0)
  const worthDelta = summary.netWorthCents - STARTING_CASH_CENTS
  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 space-y-5 px-4 pt-4">
        <div
          className={cx(
            'rounded-3xl px-4 py-5 text-center',
            summary.tier === 'boss' && 'bg-lemon',
            summary.tier === 'scalable' && 'bg-teal text-cream',
            summary.tier === 'growing' && 'bg-leaf text-cream',
            summary.tier === 'side' && 'bg-sand',
          )}
        >
          <p className="text-xs font-bold tracking-[0.16em]">STARTUP TIER</p>
          <p className="font-display text-5xl font-semibold">{tier.name}</p>
          <p className="mt-2 text-base">{tier.blurb}</p>
        </div>
        <div>
          <h1 ref={heading} tabIndex={-1} className="font-display text-3xl leading-tight font-semibold outline-none">
            {BUSINESS_QUESTION}
          </h1>
          <p className="mt-3 text-lg font-semibold">{verdict.headline}</p>
          <p className="mt-1 text-ink-soft">{verdict.answer}</p>
        </div>
        <Receipt
          testId="career-receipt"
          title="Whole season"
          subtitle={`${summary.daysOpened} of ${state.seasonDays} days open`}
          revenueCents={summary.totalRevenueCents}
          cogsCents={summary.totalCogsCents}
          grossCents={summary.totalGrossCents}
          otherCents={summary.totalOtherCents}
          standFeeCents={standFee}
          helperCents={helper}
          netCents={summary.totalNetCents}
          hours={summary.totalHours}
          hourlyCents={summary.earningsPerHourCents}
        />
        <p className="text-center text-sm text-ink-soft">
          Season earnings per hour are total net profit divided by total hours. A long, thin day counts more than a short, rich one.
        </p>
        <Chain stats={chainFromSummary(summary)} title="The season in one chain" />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Net worth" value={formatMoney(summary.netWorthCents)} hint={`${worthDelta >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(worthDelta))} from $20`} />
          <Stat label="Cash" value={formatMoney(summary.cashCents)} hint={`Supplies still worth ${formatMoney(summary.inventoryCents)}`} />
          <Stat
            label="Best day"
            value={summary.best ? formatHourly(summary.best.earningsPerHourCents) : '—'}
            hint={summary.best ? `${weekdayName(summary.best.day)} · Day ${summary.best.day}` : 'You never opened'}
          />
          <Stat
            label="Toughest day"
            value={summary.worst ? formatHourly(summary.worst.earningsPerHourCents) : '—'}
            hint={summary.worst ? `${weekdayName(summary.worst.day)} · Day ${summary.worst.day}` : 'No hours on the books'}
          />
        </div>
        <Card>
          <h2 className="font-display text-2xl font-semibold">Badges</h2>
          <ul className="mt-3 space-y-2">
            {summary.badges.map((badge) => (
              <li key={badge.id} className={cx('rounded-2xl px-3 py-3', badge.earned ? 'bg-sand' : 'bg-card shadow-[0_0_0_1.5px_#eadcc6]')}>
                <p className="font-semibold">
                  {badge.earned ? 'Earned' : 'Not yet'} · {badge.name}
                </p>
                <p className="text-sm text-ink-soft">{badge.description}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold">Ice and satisfaction</h2>
          <p className="mt-2">
            Melted ice removed {formatMoney(summary.totalIceMeltCents)} of value across the season. It never appears in cost of goods,
            because those cubes were not sold.
          </p>
          <p className="mt-2">
            Average satisfaction:{' '}
            <span className="font-semibold">{summary.avgSatisfaction === null ? '—' : `${summary.avgSatisfaction}`}</span>
          </p>
        </Card>
        <section>
          <h2 className="font-display text-2xl font-semibold">Sit with it</h2>
          <p className="mt-1 text-sm text-ink-soft">Nobody grades these. They save on this device with your season.</p>
          <div className="mt-3 space-y-4">
            {REFLECTIONS.map((prompt, index) => (
              <label key={prompt.title} className="block">
                <span className="font-semibold">{prompt.title}</span>
                <span className="mt-1 block text-sm text-ink-soft">{prompt.prompt}</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl bg-card px-3 py-3 text-base shadow-[0_0_0_1.5px_#eadcc6]"
                  maxLength={280}
                  value={state.reflections[index] ?? ''}
                  onChange={(event) => dispatch({ type: 'reflect', index: index as 0 | 1 | 2, text: event.target.value })}
                />
              </label>
            ))}
          </div>
        </section>
      </main>
      <Dock>
        <Button onClick={onNewSeason}>Run another season</Button>
      </Dock>
    </Shell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-[0_0_0_1.5px_#eadcc6]">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="font-display text-xl leading-tight font-semibold">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  )
}
