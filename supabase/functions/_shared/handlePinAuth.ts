import {
  decidePinReset,
  EMAIL_ACCOUNT,
  freshLock,
  parseReset,
  parseSignIn,
  parseSignUp,
  PIN_HELD,
  PIN_LOCKED,
  registerFailure,
  registerSuccess,
  SIGN_IN_REQUIRED,
  TOO_MANY_TRIES,
  TRY_AGAIN,
  USERNAME_TAKEN,
  USERNAME_UNKNOWN,
  viewLock,
  type AccountRole,
  type PinLock,
  type ResetContext,
} from './pinPolicy.ts'

export interface PlayerRecord {
  id: string
  username: string
  displayName: string
  role: AccountRole
  loginMethod: 'email' | 'pin'
}

export interface CredentialRecord {
  pinHash: string
  authSecret: string
  lock: PinLock
}

export interface PinDeps {
  allow(kind: 'sign-up' | 'sign-in' | 'reset'): Promise<boolean>
  usernameTaken(username: string): Promise<boolean>
  /** Creates the auth user and profile. Role is always player. The caller cannot pass a role. */
  createPlayer(input: { username: string; displayName: string }): Promise<{ player: PlayerRecord; authSecret: string }>
  deletePlayer(userId: string): Promise<void>
  findByUsername(username: string): Promise<PlayerRecord | null>
  readCredentials(userId: string): Promise<CredentialRecord | null>
  writeCredentials(userId: string, pinHash: string, authSecret: string, lock: PinLock): Promise<void>
  hashPin(userId: string, pin: string): Promise<string>
  checkPin(userId: string, pin: string, pinHash: string): Promise<boolean>
  /** Spend the same kind of time a PIN check would, so a missing name is not a fast answer. */
  obscureMiss(): Promise<void>
  openSession(userId: string, authSecret: string): Promise<{ accessToken: string; refreshToken: string }>
  now(): number
  resetFacts(
    actorId: string,
    username: string,
    competitionId: string | null,
  ): Promise<{ error: string } | { ctx: ResetContext }>
  /** Stores a new PIN hash and clears the lock. Does not touch role. */
  resetPin(userId: string, pin: string): Promise<void>
  logReset(actorId: string, targetId: string): Promise<void>
}

export type PinOutcome =
  | { ok: true; kind: 'session'; accessToken: string; refreshToken: string }
  | { ok: true; kind: 'reset' }
  | { ok: false; message: string }

export function isTakenError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'taken'
}

function fail(message: string): PinOutcome {
  return { ok: false, message }
}

export async function handlePinAuth(
  action: string,
  body: unknown,
  actorId: string | null,
  deps: PinDeps,
): Promise<PinOutcome> {
  if (action === 'sign-up') return signUp(body, deps)
  if (action === 'sign-in') return signIn(body, deps)
  if (action === 'reset-pin') return resetPin(body, actorId, deps)
  return fail(TRY_AGAIN)
}

async function signUp(body: unknown, deps: PinDeps): Promise<PinOutcome> {
  const parsed = parseSignUp(body)
  if (!parsed.ok) return fail(parsed.message)
  if (!(await deps.allow('sign-up'))) return fail(TOO_MANY_TRIES)
  if (await deps.usernameTaken(parsed.value.username)) return fail(USERNAME_TAKEN)
  let created: { player: PlayerRecord; authSecret: string }
  try {
    created = await deps.createPlayer({ username: parsed.value.username, displayName: parsed.value.displayName })
  } catch (error) {
    if (isTakenError(error)) return fail(USERNAME_TAKEN)
    throw error
  }
  if (created.player.role !== 'player' || created.player.loginMethod !== 'pin') {
    await deps.deletePlayer(created.player.id)
    return fail(TRY_AGAIN)
  }
  try {
    const pinHash = await deps.hashPin(created.player.id, parsed.value.pin)
    await deps.writeCredentials(created.player.id, pinHash, created.authSecret, freshLock())
    const session = await deps.openSession(created.player.id, created.authSecret)
    return { ok: true, kind: 'session', accessToken: session.accessToken, refreshToken: session.refreshToken }
  } catch (error) {
    await deps.deletePlayer(created.player.id)
    throw error
  }
}

async function signIn(body: unknown, deps: PinDeps): Promise<PinOutcome> {
  const parsed = parseSignIn(body)
  if (!parsed.ok) return fail(parsed.message)
  if (!(await deps.allow('sign-in'))) return fail(TOO_MANY_TRIES)
  const player = await deps.findByUsername(parsed.value.username)
  if (!player) {
    await deps.obscureMiss()
    return fail(USERNAME_UNKNOWN)
  }
  if (player.loginMethod !== 'pin') return fail(EMAIL_ACCOUNT)
  const creds = await deps.readCredentials(player.id)
  if (!creds) return fail(EMAIL_ACCOUNT)
  const now = deps.now()
  const view = viewLock(creds.lock, now)
  if (view === 'held') return fail(PIN_HELD)
  if (view === 'temporary') return fail(PIN_LOCKED)
  const match = await deps.checkPin(player.id, parsed.value.pin, creds.pinHash)
  if (!match) {
    const next = registerFailure(creds.lock, now)
    await deps.writeCredentials(player.id, creds.pinHash, creds.authSecret, next.lock)
    return fail(next.message)
  }
  await deps.writeCredentials(player.id, creds.pinHash, creds.authSecret, registerSuccess())
  const session = await deps.openSession(player.id, creds.authSecret)
  return { ok: true, kind: 'session', accessToken: session.accessToken, refreshToken: session.refreshToken }
}

async function resetPin(body: unknown, actorId: string | null, deps: PinDeps): Promise<PinOutcome> {
  if (!actorId) return fail(SIGN_IN_REQUIRED)
  const parsed = parseReset(body)
  if (!parsed.ok) return fail(parsed.message)
  if (!(await deps.allow('reset'))) return fail(TOO_MANY_TRIES)
  const facts = await deps.resetFacts(actorId, parsed.value.username, parsed.value.competitionId)
  if ('error' in facts) return fail(facts.error)
  const decision = decidePinReset(facts.ctx)
  if (!decision.ok) return fail(decision.message)
  await deps.resetPin(facts.ctx.targetId, parsed.value.pin)
  await deps.logReset(actorId, facts.ctx.targetId)
  return { ok: true, kind: 'reset' }
}
