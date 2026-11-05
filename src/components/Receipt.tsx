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
  waste,
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
  /** Melted ice, spoiled lemons, spoiled sugar. */
  waste?: { iceCents: number; lemonsCents: number; sugarCents: number }
  netCents: number
  hours: number
  hourlyCents: number | null
  testId?: string
  subtitleTestId?: string
}) {
  const rows = [
    { label: 'REVENUE', cents: revenueCents, strong: false },
    { label: '− COST OF GOODS', cents: cogsCents, strong: false, note: 'Cups, lemons, sugar and ice in the cups you sold' },
    { label: '= GROSS PROFIT', cents: grossCents, strong: true },
    { label: '− OTHER EXPENSES', cents: otherCents, strong: false },
  ] as { label: string; cents: number; strong: boolean; note?: string }[]
  const wasteTotal = waste ? waste.iceCents + waste.lemonsCents + waste.sugarCents : 0
  const details: { label: string; cents: number }[] = []
  if (standFeeCents !== undefined) details.push({ label: 'Stand fee', cents: standFeeCents })
  if (helperCents !== undefined && helperCents > 0) details.push({ label: 'Helper', cents: helperCents })
  if (waste) {
    details.push({ label: 'Spoilage and waste', cents: wasteTotal })
  }
  const wasteParts = waste
    ? [
        { label: 'Melted ice', cents: waste.iceCents },
        { label: 'Lemons gone bad', cents: waste.lemonsCents },
        { label: 'Sugar gone bad', cents: waste.sugarCents },
      ].filter((part) => part.cents > 0)
    : []
  return (
    <article className="receipt-sheet px-4 pt-6 pb-5" data-testid={testId}>
      <header className="mb-3 text-center">
        <p className="font-mono text-xs tracking-[0.18em] text-teal">Y.E.S. STAND</p>
        <h3 className="font-display text-2xl font-semibold">{title}</h3>
        <p className="text-sm text-ink-soft" data-testid={subtitleTestId}>
          {subtitle}
        </p>
      </header>
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Profit and loss</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cx(row.strong && 'border-t border-dashed border-line')}>
              <th scope="row" className={cx('py-1.5 text-left text-sm font-semibold tracking-wide break-words', row.strong && 'pt-2 text-base')}>
                {row.label}
                {row.note && <span className="block text-xs font-normal tracking-normal text-ink-soft">{row.note}</span>}
              </th>
              <td className={cx('py-1.5 text-right align-top font-mono text-base', row.strong && 'text-lg font-semibold')}>
                <Money cents={row.cents} />
              </td>
            </tr>
          ))}
          {details.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-0.5 pl-3 text-left text-sm font-medium text-ink-soft">
                {row.label}
              </th>
              <td className="py-0.5 text-right font-mono text-sm text-ink-soft">{formatMoney(row.cents)}</td>
            </tr>
          ))}
          {wasteParts.map((row) => (
            <tr key={row.label} data-testid="waste-line">
              <th scope="row" className="py-0.5 pl-6 text-left text-xs font-medium text-ink-soft">
                {row.label}
              </th>
              <td className="py-0.5 text-right font-mono text-xs text-ink-soft">{formatMoney(row.cents)}</td>
            </tr>
          ))}
          <tr className="border-t border-dashed border-line">
            <th scope="row" className="py-1.5 text-left text-sm font-semibold tracking-wide">
              TOTAL COSTS
              <span className="block text-xs font-normal tracking-normal text-ink-soft">Cost of goods + other expenses</span>
            </th>
            <td className="py-1.5 text-right align-top font-mono text-base" data-testid="total-costs">
              {formatMoney(cogsCents + otherCents)}
            </td>
          </tr>
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
        <p className="mt-2 text-center text-sm text-ink-soft">Net profit ÷ the hours the stand was open.</p>
      </div>
    </article>
  )
}
