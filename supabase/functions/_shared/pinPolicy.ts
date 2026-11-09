/**
 * Username + PIN rules shared by the browser and the pin-auth Edge Function.
 * No secrets and no network. The Edge Function is the only place that hashes a PIN.
 */

export const PIN_HELP = 'Use a 4-digit PIN, like 4827.'
export const PIN_MISMATCH = "Those PINs don't match. Type the same 4 digits twice."
export const PIN_WRONG = "That PIN doesn't match. Try again."
export const PIN_LOCKED = 'Too many tries. Wait 15 minutes, or ask your host to reset your PIN.'
export const PIN_HELD = 'Too many tries. Ask your host to reset your PIN.'
export const USERNAME_UNKNOWN = 'No account uses that username. Check the spelling, or create an account.'
export const EMAIL_ACCOUNT = 'That username uses an email and password. Choose "I use an email and password".'
export const USERNAME_HELP = 'Use 3 to 20 letters, numbers, or underscores. No spaces and no email address.'
export const USERNAME_TAKEN = 'That username is taken. Try another one.'
export const DISPLAY_NAME_HELP = 'Use a name of 2 to 24 characters. Do not use an email address.'
export const RESET_DENIED = "You can't change that PIN."
export const NOT_IN_COMPETITION = 'That player is not in this competition.'
export const PICK_COMPETITION = 'Pick the competition this player is in.'
export const NOT_PIN_ACCOUNT = 'That player signs in with email, not a PIN.'
export const SIGN_IN_REQUIRED = 'Sign in on this phone first, then you can reset a PIN.'
export const TOO_MANY_TRIES = 'Too many tries from this network. Wait a few minutes and try again.'
export const PIN_NOT_READY = "Sign-in isn't ready yet. Ask your host."
export const TRY_AGAIN = 'Something went wrong. Try again.'
export const PIN_RESET_DONE = 'PIN updated. They can sign in with that username and the new PIN.'
export const EMAIL_SIGN_IN_MISMATCH = "That email or password doesn't match."
export const EMAIL_NOT_CONFIRMED = 'Confirm that email from your inbox, then sign in. Your email stays private.'

/** Guesses allowed before a 15-minute pause. */
export const MAX_FAILS = 5
/** Pauses before the account waits for a host. 5 + 5 + 5 = 15 wrong PINs. */
export const MAX_LOCKOUTS = 3
export const LOCK_MS = 15 * 60 * 1000

/**
 * Loose caps so a whole room on one Wi-Fi address can still sign up.
 * The real PIN limit is the per-account lock above, not this network cap.
 */
export const SIGN_IN_IP_LIMIT = 300
export const SIGN_UP_IP_LIMIT = 120
export const RESET_IP_LIMIT = 60
export const IP_WINDOW_MS = 10 * 60 * 1000

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

/** Same shape as the database check and `cleanUsername` in the game. */
export function cleanPinUsername(raw: string): string | null {
  const name = raw.trim().replace(/^@/, '')
  return USERNAME_RE.test(name) ? name : null
}

/** Same shape as `cleanDisplayName`. Display names may repeat. Emails may not. */
export function cleanPinDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 24) return null
  if (name.includes('@')) return null
  return name
}

/** Four digits, including 0000. Spaces are ignored so a pasted PIN still works. */
export function cleanPin(raw: string): string | null {
  const pin = raw.replace(/\s+/g, '')
  return /^[0-9]{4}$/.test(pin) ? pin : null
}

export interface PinLock {
  failedAttempts: number
  lockouts: number
  /** Epoch milliseconds. Null when the account is not in a timed pause. */
  lockedUntil: number | null
  /** True after repeated pauses. Only a host reset clears it. */
  held: boolean
}

export function freshLock(): PinLock {
  return { failedAttempts: 0, lockouts: 0, lockedUntil: null, held: false }
}

export function viewLock(lock: PinLock, now: number): 'open' | 'temporary' | 'held' {
  if (lock.held) return 'held'
  if (lock.lockedUntil !== null && lock.lockedUntil > now) return 'temporary'
  return 'open'
}

/** Count a wrong PIN. A guess during a pause does not extend the pause. */
export function registerFailure(lock: PinLock, now: number): { lock: PinLock; message: string } {
  const view = viewLock(lock, now)
  if (view === 'held') return { lock, message: PIN_HELD }
  if (view === 'temporary') return { lock, message: PIN_LOCKED }
  const failedAttempts = lock.failedAttempts + 1
  if (failedAttempts < MAX_FAILS) {
    return { lock: { ...lock, failedAttempts }, message: PIN_WRONG }
  }
  const lockouts = lock.lockouts + 1
  if (lockouts >= MAX_LOCKOUTS) {
    return {
      lock: { failedAttempts: 0, lockouts, lockedUntil: null, held: true },
      message: PIN_HELD,
    }
  }
  return {
    lock: { failedAttempts: 0, lockouts, lockedUntil: now + LOCK_MS, held: false },
    message: PIN_LOCKED,
  }
}

export function registerSuccess(): PinLock {
  return freshLock()
}

export interface AttemptBucket {
  attempts: number
  windowStartedAt: number
}

export function chargeBucket(
  bucket: AttemptBucket | null,
  now: number,
  limit: number,
  windowMs: number,
): { ok: boolean; next: AttemptBucket } {
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    return { ok: true, next: { attempts: 1, windowStartedAt: now } }
  }
  if (bucket.attempts >= limit) return { ok: false, next: bucket }
  return { ok: true, next: { attempts: bucket.attempts + 1, windowStartedAt: bucket.windowStartedAt } }
}

export function ipLimit(kind: 'sign-up' | 'sign-in' | 'reset'): number {
  if (kind === 'sign-up') return SIGN_UP_IP_LIMIT
  if (kind === 'sign-in') return SIGN_IN_IP_LIMIT
  return RESET_IP_LIMIT
}

export type AccountRole = 'player' | 'host' | 'admin'

export interface ResetContext {
  actorId: string
  actorRole: AccountRole
  targetId: string
  targetRole: AccountRole
  /** Competitions this person hosts (host of the row, or host membership). */
  actorHostCompetitionIds: readonly string[]
  targetCompetitionIds: readonly string[]
  competitionId: string | null
}

/**
 * Who may set a new PIN.
 * Admins may reset any PIN account. A global host (users.role) may reset any non-admin.
 * A competition host may reset a non-admin member of that competition only.
 * There is no path that changes a role.
 */
export function decidePinReset(ctx: ResetContext): { ok: true } | { ok: false; message: string } {
  if (ctx.targetRole === 'admin' && ctx.actorRole !== 'admin') {
    return { ok: false, message: RESET_DENIED }
  }
  if (ctx.actorRole === 'admin' || ctx.actorRole === 'host') return { ok: true }
  if (ctx.actorHostCompetitionIds.length === 0) return { ok: false, message: RESET_DENIED }
  if (!ctx.competitionId) return { ok: false, message: PICK_COMPETITION }
  if (!ctx.actorHostCompetitionIds.includes(ctx.competitionId)) return { ok: false, message: RESET_DENIED }
  if (!ctx.targetCompetitionIds.includes(ctx.competitionId)) return { ok: false, message: NOT_IN_COMPETITION }
  return { ok: true }
}

/** Show the reset control to event staff and to people hosting a competition. */
export function canOfferPinReset(role: AccountRole, hostedCompetitionCount: number): boolean {
  return role === 'admin' || role === 'host' || hostedCompetitionCount > 0
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  return body as Record<string, unknown>
}

export interface SignUpInput {
  username: string
  displayName: string
  pin: string
}

/** Reads username, display name, and PIN. Role, email, and login method are ignored. */
export function parseSignUp(body: unknown): { ok: true; value: SignUpInput } | { ok: false; message: string } {
  const rec = asRecord(body)
  if (!rec) return { ok: false, message: TRY_AGAIN }
  const username = typeof rec.username === 'string' ? cleanPinUsername(rec.username) : null
  if (!username) return { ok: false, message: USERNAME_HELP }
  const displayName = typeof rec.displayName === 'string' ? cleanPinDisplayName(rec.displayName) : null
  if (!displayName) return { ok: false, message: DISPLAY_NAME_HELP }
  const pin = typeof rec.pin === 'string' ? cleanPin(rec.pin) : null
  if (!pin) return { ok: false, message: PIN_HELP }
  return { ok: true, value: { username, displayName, pin } }
}

export function parseSignIn(body: unknown): { ok: true; value: { username: string; pin: string } } | { ok: false; message: string } {
  const rec = asRecord(body)
  if (!rec) return { ok: false, message: TRY_AGAIN }
  const username = typeof rec.username === 'string' ? cleanPinUsername(rec.username) : null
  if (!username) return { ok: false, message: USERNAME_HELP }
  const pin = typeof rec.pin === 'string' ? cleanPin(rec.pin) : null
  if (!pin) return { ok: false, message: PIN_HELP }
  return { ok: true, value: { username, pin } }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseReset(
  body: unknown,
): { ok: true; value: { username: string; pin: string; competitionId: string | null } } | { ok: false; message: string } {
  const rec = asRecord(body)
  if (!rec) return { ok: false, message: TRY_AGAIN }
  const username = typeof rec.username === 'string' ? cleanPinUsername(rec.username) : null
  if (!username) return { ok: false, message: USERNAME_HELP }
  const pin = typeof rec.pin === 'string' ? cleanPin(rec.pin) : null
  if (!pin) return { ok: false, message: PIN_HELP }
  const rawCompetition = rec.competitionId
  if (rawCompetition == null || rawCompetition === '') {
    return { ok: true, value: { username, pin, competitionId: null } }
  }
  if (typeof rawCompetition !== 'string' || !UUID_RE.test(rawCompetition)) {
    return { ok: false, message: PICK_COMPETITION }
  }
  return { ok: true, value: { username, pin, competitionId: rawCompetition } }
}

/** Long enough for Supabase Auth (minimum is 6, projects often require 8 plus mixed characters). */
export function randomAuthPassword(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  let body = ''
  for (const byte of bytes) body += alphabet[byte % alphabet.length]
  return `Aa1!${body}`
}

/** Reserved `.invalid` domain so this address is never a real mailbox. */
export function syntheticPinEmail(): string {
  return `p.${crypto.randomUUID()}@pin.yeshq.invalid`
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function b64ToBytes(value: string): Uint8Array {
  const bin = atob(value)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacBytes(pepper: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

/**
 * Input to bcrypt. HMAC output is 44 base64 characters, under bcrypt's 72-byte limit,
 * and a pepper of any length is fully mixed in.
 */
export async function pinVerifierMaterial(pepper: string, userId: string, pin: string): Promise<string> {
  return bytesToB64(await hmacBytes(pepper, `${userId}:${pin}`))
}

/** Bucket key for rate limits. The raw IP address is not stored. */
export async function attemptBucketKey(kind: string, pepper: string, ip: string): Promise<string> {
  const material = bytesToB64(await hmacBytes(pepper, `bucket:${kind}:${ip}`))
  return `${kind}:${material.slice(0, 40)}`
}

async function aesKey(pepper: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`yes-pin-auth-secret-v1:${pepper}`))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Encrypt the Supabase Auth password so a later sign-in can open a session without changing it. */
export async function encryptAuthSecret(pepper: string, plaintext: string): Promise<string> {
  const key = await aesKey(pepper)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)))
  const packed = new Uint8Array(iv.length + cipher.length)
  packed.set(iv, 0)
  packed.set(cipher, iv.length)
  return `v1:${bytesToB64(packed)}`
}

export async function decryptAuthSecret(pepper: string, stored: string): Promise<string> {
  if (!stored.startsWith('v1:')) throw new Error('bad secret')
  const packed = b64ToBytes(stored.slice(3))
  if (packed.length < 13) throw new Error('bad secret')
  const iv = packed.slice(0, 12)
  const cipher = packed.slice(12)
  const key = await aesKey(pepper)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}
