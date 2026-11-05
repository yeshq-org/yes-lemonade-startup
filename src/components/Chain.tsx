import type { ChainStats } from '../game/scoring'
import { formatHourly, formatHours, formatMoney } from '../game/money'
import { cx } from './ui'

export function Chain({ stats, title }: { stats: ChainStats; title: string }) {
  const steps = [
    { label: 'Customers', detail: 'showed up', value: String(stats.customers) },
    { label: 'Sales', detail: 'bought a cup', value: String(stats.sales) },
    { label: 'Revenue', detail: 'money in', value: formatMoney(stats.revenueCents) },
    { label: 'Costs', detail: 'supplies + other expenses', value: formatMoney(stats.costCents) },
    { label: 'Profit', detail: 'money kept', value: formatMoney(stats.profitCents), hot: stats.profitCents < 0 },
    { label: 'Time', detail: 'hours open', value: formatHours(stats.hours) },
    { label: 'Earnings per hour', detail: 'the real score', value: formatHourly(stats.hourlyCents), last: true },
  ]
  return (
    <section aria-label={title}>
      <h3 className="mb-1 font-display text-2xl font-semibold">{title}</h3>
      <p className="mb-3 text-sm text-ink-soft">Follow the money from the sidewalk to your hourly pay.</p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full text-sm font-bold',
                  step.last ? 'bg-lemon text-ink' : 'bg-teal text-cream',
                )}
              >
                {index + 1}
              </span>
              {index < steps.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className={cx('mb-1 min-h-12 flex-1 rounded-2xl px-3 py-2', step.last ? 'bg-lemon' : 'bg-card shadow-[0_0_0_1.5px_#eadcc6]')}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{step.label}</p>
                <p className={cx('font-mono text-sm', step.hot && 'text-coral')}>{step.value}</p>
              </div>
              <p className="text-sm text-ink-soft">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
