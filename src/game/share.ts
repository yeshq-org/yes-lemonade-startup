import { REFLECTIONS } from './coach'
import { formatMoney } from './money'
import type { SeasonSummary } from './scoring'
import { TIER_META } from './scoring'

export const PLAY_URL = 'https://www.yeshq.org/lemonade'

/** Short plain-text debrief to share. Never includes an email address or account details. */
export function debriefText(summary: SeasonSummary, seasonDays: number, reflections: readonly string[]): string {
  const hourly = summary.earningsPerHourCents === null ? '—' : `${formatMoney(summary.earningsPerHourCents)}/hour`
  const lines = [
    `My Y.E.S. Lemonade Startup season (${seasonDays} days)`,
    `Net profit ${formatMoney(summary.totalNetCents)} · ${hourly} · ${TIER_META[summary.tier].name}`,
    `${summary.totalSales} cups sold · revenue ${formatMoney(summary.totalRevenueCents)}`,
  ]
  REFLECTIONS.forEach((prompt, index) => {
    const answer = stripEmails((reflections[index] ?? '').trim())
    if (answer) lines.push('', `${prompt.title}: ${answer}`)
  })
  lines.push('', `Play: ${PLAY_URL}`)
  return lines.join('\n')
}

export function stripEmails(text: string): string {
  return text.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email removed]')
}

type ShareHost = {
  share?: (data: { title?: string; text?: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

/** Device share sheet first, then copy to clipboard. */
export async function shareText(text: string, host: ShareHost | undefined = typeof navigator === 'undefined' ? undefined : navigator): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (host?.share) {
    try {
      await host.share({ title: 'My lemonade stand debrief', text })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
      // Fall through to copy.
    }
  }
  if (host?.clipboard) {
    try {
      await host.clipboard.writeText(text)
      return 'copied'
    } catch {
      // Fall through.
    }
  }
  return 'failed'
}
