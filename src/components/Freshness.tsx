import { expiryGroups, formatStock, SPOIL_NIGHTS } from '../game/inventory'
import type { Inventory } from '../game/types'

function when(days: number): string {
  if (days <= 0) return 'go bad tonight'
  if (days === 1) return 'expire after today'
  return `expire in ${days} days`
}

/**
 * Plain "expires in N days" lines for lemons and sugar on hand.
 * `today` is the day you are looking at; `afterToday` shifts the count for the end-of-day report.
 */
export function FreshnessNotes({ inventory, today, afterToday = false }: { inventory: Inventory; today: number; afterToday?: boolean }) {
  const lines: string[] = []
  for (const item of ['lemons', 'sugar'] as const) {
    for (const group of expiryGroups(inventory[item], item, today)) {
      const days = afterToday ? group.days - 1 : group.days
      lines.push(`${formatStock(item, group.qty)} ${when(days)}`)
    }
  }
  return (
    <div className="mt-2 text-sm text-ink-soft" data-testid="freshness">
      {lines.length > 0 && (
        <ul className="space-y-0.5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="mt-1">
        Ice melts overnight. Lemons keep {SPOIL_NIGHTS.lemons} days and sugar {SPOIL_NIGHTS.sugar} days, counting the day you buy. Cups keep.
      </p>
    </div>
  )
}
