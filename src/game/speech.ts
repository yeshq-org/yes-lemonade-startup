const MAX_REFLECTION = 280

/** Add a spoken line after anything already typed, and keep the field editable. */
export function appendTranscript(current: string, said: string, max = MAX_REFLECTION): string {
  const extra = said.replace(/\s+/g, ' ').trim()
  if (!extra) return current.slice(0, max)
  const base = current.trimEnd()
  const next = base ? `${base} ${extra}` : extra
  return next.slice(0, max)
}

export function speechAvailable(host: object | null | undefined): boolean {
  if (!host) return false
  const record = host as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return typeof record.SpeechRecognition === 'function' || typeof record.webkitSpeechRecognition === 'function'
}

interface TalkResult {
  isFinal: boolean
  0: { transcript: string }
  length: number
}

interface TalkSession {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<TalkResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type TalkCtor = new () => TalkSession

function talkCtor(): TalkCtor | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & { SpeechRecognition?: TalkCtor; webkitSpeechRecognition?: TalkCtor }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

let active: TalkSession | null = null

export function stopTalk(): void {
  active?.stop()
  active = null
}

/**
 * One tap starts the browser speech engine. Tap Stop (or start another question) to end it.
 * Returns false when this browser has no SpeechRecognition.
 */
export function startTalk(handlers: {
  onFinal: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}): boolean {
  const Ctor = talkCtor()
  if (!Ctor) return false
  stopTalk()
  const session = new Ctor()
  active = session
  session.lang = 'en-US'
  session.continuous = true
  session.interimResults = false
  session.onresult = (event) => {
    let said = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const row = event.results[index]
      if (row?.isFinal) said += row[0]?.transcript ?? ''
    }
    if (said.trim()) handlers.onFinal(said)
  }
  session.onerror = (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      handlers.onError('Mic is blocked. You can still type.')
      return
    }
    handlers.onError('Could not hear you. You can still type.')
  }
  session.onend = () => {
    if (active === session) active = null
    handlers.onEnd()
  }
  try {
    session.start()
  } catch {
    active = null
    handlers.onError('Could not start the mic. You can still type.')
    return false
  }
  return true
}
