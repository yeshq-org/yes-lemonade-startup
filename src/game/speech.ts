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

function appleTouch(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

/** Plain note for the career questions. iPhone Safari often has no speech recognizer. */
export function speechHint(host: object | null | undefined): string {
  if (speechAvailable(host)) {
    if (appleTouch()) {
      return 'Tap Talk, then Stop. On iPhone the mic can cut off after a phrase. Tap Talk again, or type.'
    }
    return 'Tap Talk, say your answer, then tap Stop. You can still edit the words.'
  }
  if (appleTouch()) return 'iPhone Safari usually has no Talk button. Type your answer.'
  return 'Talk-to-type is not in this browser. You can still type.'
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
  abort?: () => void
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

interface Live {
  session: TalkSession
  /** Words heard but not yet marked final. Safari often never marks them final before it ends. */
  pending: Map<number, string>
  flush: () => void
  ended: boolean
  waiters: (() => void)[]
}

let active: Live | null = null

/**
 * Stop listening. Any words still pending are written into the box that started this session,
 * then the session is detached so a late event can never land in a different answer.
 */
export function stopTalk(): void {
  const live = active
  if (!live) return
  active = null
  live.flush()
  try {
    live.session.stop()
  } catch {
    // already stopped
  }
}

/** How long to wait for an old session to release the mic before starting anyway. */
const RELEASE_MS = 400

/**
 * One tap starts the browser speech engine for one answer box. Tap Stop (or Talk on another box) to end it.
 * Returns false when this browser has no SpeechRecognition.
 *
 * Each question gets a brand-new recognizer bound to its own handlers. When another box is
 * still listening, that session is aborted first and the new one starts only after the old one
 * has let go of the mic. Starting both at once is what made the second and third boxes hear nothing:
 * the browser aborted the new session silently while the old one was still shutting down.
 */
export function startTalk(handlers: {
  onFinal: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}): boolean {
  const Ctor = talkCtor()
  if (!Ctor) return false
  const previous = active
  if (previous) {
    active = null
    previous.flush()
    try {
      if (previous.session.abort) previous.session.abort()
      else previous.session.stop()
    } catch {
      // ignore
    }
  }

  const session = new Ctor()
  let heard = false
  const live: Live = {
    session,
    pending: new Map(),
    ended: false,
    waiters: [],
    flush: () => {
      const text = [...live.pending.entries()].sort((a, b) => a[0] - b[0]).map(([, said]) => said).join(' ')
      live.pending.clear()
      if (text.trim()) {
        heard = true
        handlers.onFinal(text)
      }
    },
  }
  active = live
  session.lang = 'en-US'
  session.continuous = true
  session.interimResults = true
  session.onresult = (event) => {
    if (active !== live) return
    let said = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const row = event.results[index]
      if (!row) continue
      const text = row[0]?.transcript ?? ''
      if (row.isFinal) {
        live.pending.delete(index)
        said += text
      } else {
        live.pending.set(index, text)
      }
    }
    if (said.trim()) {
      heard = true
      handlers.onFinal(said)
    }
  }
  session.onerror = (event) => {
    if (active !== live) return
    if (event.error === 'aborted' || event.error === 'no-speech') return
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      handlers.onError('Mic is blocked. You can still type.')
      return
    }
    handlers.onError('Could not hear you. You can still type.')
  }
  session.onend = () => {
    live.ended = true
    const mine = active === live
    if (mine) {
      live.flush()
      active = null
    }
    live.waiters.splice(0).forEach((wake) => wake())
    if (mine && !heard) handlers.onError('Did not catch anything. Tap Talk and try again, or type.')
    handlers.onEnd()
  }

  const begin = () => {
    if (active !== live) return
    try {
      session.start()
    } catch {
      active = null
      handlers.onError('Could not start the mic. You can still type.')
      handlers.onEnd()
    }
  }

  if (previous && !previous.ended) {
    // Wait for the old box's recognizer to let go of the mic.
    let done = false
    const go = () => {
      if (done) return
      done = true
      begin()
    }
    previous.waiters.push(go)
    setTimeout(go, RELEASE_MS)
    return true
  }
  // No other session: start inside the tap so Safari keeps the mic permission.
  try {
    session.start()
  } catch {
    active = null
    return false
  }
  return true
}
