import { describe, expect, it } from 'vitest'
import { createGame } from './setup'
import { summarize } from './scoring'
import { debriefText, shareText } from './share'

describe('share my debrief', () => {
  it('shares results and answers but never an email address', () => {
    const state = createGame(7, 3)
    const text = debriefText(summarize(state), 7, ['Monday was busy', 'mail me at kid@example.com', ''])
    expect(text).toMatch(/Net profit/)
    expect(text).toMatch(/Busy is not the same as paid: Monday was busy/)
    expect(text).not.toMatch(/@/)
    expect(text).not.toMatch(/Tomorrow morning:/)
  })

  it('falls back to copying when there is no share sheet', async () => {
    let copied = ''
    const outcome = await shareText('hi', { clipboard: { writeText: async (text) => void (copied = text) } })
    expect(outcome).toBe('copied')
    expect(copied).toBe('hi')
  })
})
