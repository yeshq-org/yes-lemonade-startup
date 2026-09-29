import { BUSINESS_QUESTION, dayTip, dayVerdict } from '../../game/coach'
import { formatStock } from '../../game/inventory'
import { formatMoney } from '../../game/money'
import { chainFromDay } from '../../game/scoring'
import { ITEM_IDS } from '../../game/types'
import { weatherPhrase, weekdayName } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Chain } from '../Chain'
import { Header } from '../Header'
import { Receipt } from '../Receipt'
import { Button, Card, Dock, Meter, Shell, useFocusHeading } from '../ui'

export function Report({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state?.pending) return null
  const day = state.pending
  const verdict = dayVerdict(day)
  const last = state.day >= state.seasonDays
  const series = [...state.history, day]
  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 space-y-5 px-4 pt-4">
        <div>
          <p className="text-sm font-bold tracking-[0.14em] text-teal">
            {weekdayName(day.day).toUpperCase()} · {weatherPhrase(day.weather).toUpperCase()}
          </p>
          <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-3xl leading-tight font-semibold outline-none">
            {BUSINESS_QUESTION}
          </h1>
          <p className="mt-3 text-lg font-semibold">{verdict.headline}</p>
          <p className="mt-1 text-ink-soft">{verdict.answer}</p>
        </div>
        <Receipt
          title={`Day ${day.day}`}
          subtitle={weatherPhrase(day.weather)}
          revenueCents={day.revenueCents}
          cogsCents={day.cogsCents}
          grossCents={day.grossCents}
          otherCents={day.otherCents}
          standFeeCents={day.standFeeCents}
          helperCents={day.helperCents}
          netCents={day.netCents}
          hours={day.hours}
          hourlyCents={day.earningsPerHourCents}
        />
        <Chain stats={chainFromDay(day)} title="How the day became an hourly rate" />
        <PaySpark days={series.map((entry) => entry.earningsPerHourCents)} />
        <Card>
          <h2 className="font-display text-2xl font-semibold">The crowd</h2>
          <dl className="mt-3 space-y-2">
            <Row label="People who passed" value={String(day.potential)} />
            <Row label="Bought a cup" value={String(day.sold)} />
            <Row label="Walked away" value={String(day.walkedAway)} />
            <Row label="Could not be served" value={String(day.soldOutMissed)} />
          </dl>
          {day.satisfaction === null ? (
            <p className="mt-3 text-sm text-ink-soft">No crowd to rate the cup today.</p>
          ) : (
            <div className="mt-4">
              <Meter label="Satisfaction" value={day.satisfaction} caption="Taste, chill, and whether the price felt fair." />
            </div>
          )}
          <p className="mt-3 text-sm">
            Word of mouth {day.popularityBefore} → {day.popularityAfter}
          </p>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold">Still in the stand</h2>
          <ul className="mt-2 space-y-1">
            {ITEM_IDS.map((item) => (
              <li key={item}>{formatStock(item, day.onHand[item])}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Supplies on hand are worth {formatMoney(day.suppliesValueCents)} at what you paid.</p>
          <p className="mt-2 font-semibold">
            {day.iceMeltQty === 0
              ? 'No ice left to melt tonight.'
              : `Overnight, ${formatStock('ice', day.iceMeltQty)} ${day.iceMeltQty === 1 ? 'disappears' : 'disappear'} and take ${formatMoney(day.iceMeltCents)} with them. That waste is not inside cost of goods. It still destroys value.`}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-[0.14em] text-teal">MENTOR</p>
          <p className="mt-1">{dayTip(day)}</p>
        </Card>
      </main>
      <Dock>
        <Button data-testid="advance" onClick={() => dispatch({ type: 'advance' })}>
          {last ? 'See your season' : 'Start tomorrow'}
        </Button>
      </Dock>
    </Shell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-mono font-semibold">{value}</dd>
    </div>
  )
}

function PaySpark({ days }: { days: Array<number | null> }) {
  const values = days.map((value) => value ?? 0)
  const max = Math.max(100, ...values.map((value) => Math.abs(value)))
  const width = 320
  const height = 84
  const step = values.length <= 1 ? 0 : width / (values.length - 1)
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? width / 2 : index * step
      const y = height / 2 - (value / max) * (height / 2 - 8)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">Hourly pay so far</h2>
      <p className="text-sm text-ink-soft">Each dot is one day. The middle line is zero.</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-24 w-full" role="img" aria-label="Earnings per hour by day">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#eadcc6" strokeWidth="2" />
        {values.length > 1 && <polyline fill="none" stroke="#0e5e59" strokeWidth="3" points={points} />}
        {values.map((value, index) => {
          const x = values.length <= 1 ? width / 2 : index * step
          const y = height / 2 - (value / max) * (height / 2 - 8)
          return <circle key={index} cx={x} cy={y} r="5" fill={value < 0 ? '#b42318' : '#ffe14a'} stroke="#1c1915" />
        })}
      </svg>
    </section>
  )
}
