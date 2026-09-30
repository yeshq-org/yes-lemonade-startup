import { formatHourly, formatHours, formatMoney } from '../game/money'
import { cx, Money } from './ui'

export function Receipt({
  title,
  subtitle,
  revenueCents,
  cogsCents,
  grossCents,
  otherCents,
  standFeeCents,
  helperCents,
  netCents,
  hours,
  hourlyCents,
  testId = 'receipt',
  subtitleTestId,
}: {
  title: string
  subtitle: string
  revenueCents: number
  cogsCents: number
  grossCents: number
  otherCents: number
  standFeeCents?: number
  helperCents?: number
  netCents: number
  hours: number
  hourlyCents: number | null
  testId?: string
  subtitleTestId?: string
}) {
  const rows = [
    { label: 'REVENUE', cents: revenueCents, strong: false },
    { label: '− COST OF GOODS', cents: cogsCents, strong: false },
    { label: '= GROSS PROFIT', cents: grossCents, strong: true },
    { label: '− OTHER EXPENSES', cents: otherCents, strong: false },
  ]
  return (
    <article className="receipt-sheet px-4 pt-6 pb-5" data-testid={testId}>
      <header className="mb-3 text-center">
        <p className="font-mono text-xs tracking-[0.18em] text-teal">Y.E.S. STAND</p>
        <h3 className="font-display text-2xl font-semibold">{title}</h3>
        <p className="text-sm text-ink-soft" data-testid={subtitleTestId}>
          {subtitle}
        </p>
      </header>
      <table className="w-full border-collapse">
        <caption className="sr-only">Profit and loss</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cx(row.strong && 'border-t border-dashed border-line')}>
              <th scope="row" className={cx('py-1.5 text-left text-sm font-semibold tracking-wide', row.strong && 'pt-2 text-base')}>
                {row.label}
              </th>
              <td className={cx('py-1.5 text-right font-mono text-base', row.strong && 'text-lg font-semibold')}>
                <Money cents={row.cents} />
              </td>
            </tr>
          ))}
          {helperCents !== undefined && helperCents > 0 && standFeeCents !== undefined && (
            <>
              <tr>
                <th scope="row" className="py-0.5 pl-3 text-left text-sm font-medium text-ink-soft">
                  Stand fee
                </th>
                <td className="py-0.5 text-right font-mono text-sm text-ink-soft">{formatMoney(standFeeCents)}</td>
              </tr>
              <tr>
                <th scope="row" className="py-0.5 pl-3 text-left text-sm font-medium text-ink-soft">
                  Helper
                </th>
                <td className="py-0.5 text-right font-mono text-sm text-ink-soft">{formatMoney(helperCents)}</td>
              </tr>
            </>
          )}
          <tr className="border-t border-dashed border-line">
            <th scope="row" className="pt-2 text-left text-base font-semibold tracking-wide">
              = NET PROFIT
            </th>
            <td className="pt-2 text-right font-mono text-lg font-semibold">
              <Money cents={netCents} />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 border-t border-dashed border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold tracking-wide">TIME INVESTED</p>
          <p className="font-mono">{formatHours(hours)}</p>
        </div>
        <div className="mt-4 rounded-2xl bg-lemon px-3 py-3 text-center shadow-[0_4px_0_#e0b000]" data-testid={testId === 'career-receipt' ? 'career-hourly' : 'hourly'}>
          <p className="text-xs font-bold tracking-[0.14em]">YOUR ENTREPRENEUR EARNINGS</p>
          <p className="font-display text-4xl leading-tight font-semibold">{formatHourly(hourlyCents)}</p>
        </div>
        <p className="mt-2 text-center text-sm text-ink-soft">Net profit ÷ hours you chose to work.</p>
      </div>
    </article>
  )
}
