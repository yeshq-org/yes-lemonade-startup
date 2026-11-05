/** Round half away from zero so negative wages don't drift toward zero. */
export function roundHalfAway(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.sign(value) * Math.round(Math.abs(value))
}

export function formatMoney(cents: number): string {
  const rounded = roundHalfAway(cents)
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const dollars = Math.floor(abs / 100)
  const rest = abs % 100
  return `${sign}$${dollars}.${rest.toString().padStart(2, '0')}`
}

export function formatHourly(cents: number | null): string {
  if (cents === null) return '—'
  return `${formatMoney(cents)} / HOUR`
}

export function formatUnitCents(centsPerUnit: number): string {
  const sign = centsPerUnit < 0 ? '-' : ''
  const rounded = Math.round(Math.abs(centsPerUnit) * 100) / 100
  if (rounded >= 100) return `${sign}${formatMoney(roundHalfAway(rounded))}`
  return `${sign}${rounded.toFixed(2)}¢`
}

export function formatHours(hours: number): string {
  return `${formatQty(hours)} hours`
}

/**
 * Shared number formatter for quantities: at most `decimals` places (default 2), trailing zeros dropped.
 * 30.333333 -> "30.33", 12 -> "12", 2.5 -> "2.5". Money uses formatMoney (always 2 places).
 */
export function formatQty(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0'
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  const text = rounded.toFixed(decimals).replace(/\.?0+$/, '')
  return text === '-0' ? '0' : text
}
