import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendTranscript, speechAvailable, speechHint, startTalk, stopTalk } from './speech'

type Handler = ((event: never) => void) | null

/** Minimal fake of the browser recognizer. Like Chrome, a new one cannot start while another still holds the mic. */
class FakeRecognizer {
  static live: FakeRecognizer | null = null
  static all: FakeRecognizer[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: Handler = null
  onerror: Handler = null
  onend: (() => void) | null = null
  running = false
  constructor() {
    FakeRecognizer.all.push(this)
  }
  start() {
    if (FakeRecognizer.live && FakeRecognizer.live !== this) {
      // Mimic the browser: the newcomer is aborted silently.
      queueMicrotask(() => {
        ;(this.onerror as ((e: { error: string }) => void) | null)?.({ error: 'aborted' })
        this.onend?.()
      })
      return
    }
    FakeRecognizer.live = this
    this.running = true
  }
  private finish() {
    if (!this.running) return
    this.running = false
    setTimeout(() => {
      if (FakeRecognizer.live === this) FakeRecognizer.live = null
      this.onend?.()
    }, 50)
  }
  stop() {
    this.finish()
  }
  abort() {
    this.finish()
  }
  say(text: string, isFinal = true) {
    const results = [{ isFinal, 0: { transcript: text }, length: 1 }]
    ;(this.onresult as ((e: unknown) => void) | null)?.({ resultIndex: 0, results })
  }
}

afterEach(() => {
  stopTalk()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  FakeRecognizer.live = null
  FakeRecognizer.all = []
})

describe('career speech', () => {
  it('appends a transcript after typed words and stays within 280 characters', () => {
    expect(appendTranscript('', '  I would buy less ice.  ')).toBe('I would buy less ice.')
    expect(appendTranscript('Price was the problem.', 'And the hours.')).toBe('Price was the problem. And the hours.')
    expect(appendTranscript('Already long', ' more', 12)).toBe('Already long')
  })

  it('hides talk when the browser has no speech engine', () => {
    expect(speechAvailable(null)).toBe(false)
    expect(speechAvailable({})).toBe(false)
    expect(speechAvailable({ SpeechRecognition: function SpeechRecognition() {} })).toBe(true)
    expect(speechAvailable({ webkitSpeechRecognition: function webkitSpeechRecognition() {} })).toBe(true)
  })

  it('tells iPhone users to type when Talk is missing', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)' })
    expect(speechHint(null)).toMatch(/iPhone Safari/)
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })
    expect(speechHint(null)).toMatch(/not in this browser/)
  })

  it('captures into the second and third boxes after the first one was still listening', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', { SpeechRecognition: FakeRecognizer })
    const boxes = ['', '', '']
    const talk = (index: number) =>
      startTalk({
        onFinal: (said) => {
          boxes[index] = appendTranscript(boxes[index]!, said)
        },
        onEnd: () => {},
        onError: () => {},
      })
    expect(talk(0)).toBe(true)
    FakeRecognizer.all[0]!.say('Monday was busy')
    // Tap Talk on question 2 while question 1 is still listening.
    expect(talk(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    FakeRecognizer.all[1]!.say('Ice melted overnight')
    expect(talk(2)).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    FakeRecognizer.all[2]!.say('Buy fewer lemons')
    expect(boxes).toEqual(['Monday was busy', 'Ice melted overnight', 'Buy fewer lemons'])
  })

  it('keeps words Safari never marked final when you tap Stop', () => {
    vi.stubGlobal('window', { webkitSpeechRecognition: FakeRecognizer })
    let box = ''
    startTalk({ onFinal: (said) => (box = appendTranscript(box, said)), onEnd: () => {}, onError: () => {} })
    FakeRecognizer.all[0]!.say('I would start earlier', false)
    stopTalk()
    expect(box).toBe('I would start earlier')
  })
})
