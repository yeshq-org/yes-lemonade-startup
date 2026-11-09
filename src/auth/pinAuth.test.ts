import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cleanDisplayName, cleanUsername, USERNAME_HELP as BOARD_USERNAME_HELP, USERNAME_TAKEN as BOARD_USERNAME_TAKEN } from '../game/leaderboard'
import { joinPublicPath } from '../lib/publicUrl'
import { PLAY_QR_FILE, PLAY_URL } from '../lib/playQr'
import { emailSignInMessage } from './pinClient'
import type { ScoreRow } from './api'
import { handlePinAuth, type PinDeps } from '../../supabase/functions/_shared/handlePinAuth.ts'
import type { CredentialRecord, PlayerRecord } from '../../supabase/functions/_shared/handlePinAuth.ts'
import {
  attemptBucketKey,
  canOfferPinReset,
  chargeBucket,
  cleanPin,
  cleanPinDisplayName,
  cleanPinUsername,
  decidePinReset,
  decryptAuthSecret,
  DISPLAY_NAME_HELP,
  EMAIL_ACCOUNT,
  EMAIL_NOT_CONFIRMED,
  EMAIL_SIGN_IN_MISMATCH,
  encryptAuthSecret,
  freshLock,
  IP_WINDOW_MS,
  LOCK_MS,
  MAX_FAILS,
  MAX_LOCKOUTS,
  NOT_IN_COMPETITION,
  parseReset,
  parseSignIn,
  parseSignUp,
  PIN_HELD,
  PIN_HELP,
  PIN_LOCKED,
  PIN_MISMATCH,
  PIN_WRONG,
  pinVerifierMaterial,
  PICK_COMPETITION,
  randomAuthPassword,
  registerFailure,
  registerSuccess,
  RESET_DENIED,
  SIGN_IN_IP_LIMIT,
  SIGN_IN_REQUIRED,
  SIGN_UP_IP_LIMIT,
  syntheticPinEmail,
  TOO_MANY_TRIES,
  USERNAME_HELP,
  USERNAME_TAKEN,
  USERNAME_UNKNOWN,
  viewLock,
  type ResetContext,
} from '../../supabase/functions/_shared/pinPolicy.ts'

const scoresHideEmail: 'email' extends keyof ScoreRow ? never : true = true

describe('PIN format', () => {
  it('accepts exactly four digits, including zeros', () => {
    expect(cleanPin('4827')).toBe('4827')
    expect(cleanPin('0000')).toBe('0000')
    expect(cleanPin(' 12 34 ')).toBe('1234')
    expect(cleanPin('123')).toBeNull()
    expect(cleanPin('12345')).toBeNull()
    expect(cleanPin('12a4')).toBeNull()
    expect(cleanPin('')).toBeNull()
  })

  it('matches the username and display-name rules already used on leaderboards', () => {
    const samples = ['alex', 'Ab_3', 'a', 'has space', 'alex@school.edu', 'this_name_is_way_too_long']
    for (const sample of samples) {
      expect(cleanPinUsername(sample)).toBe(cleanUsername(sample))
      expect(cleanPinDisplayName(sample)).toBe(cleanDisplayName(sample))
    }
    expect(USERNAME_HELP).toBe(BOARD_USERNAME_HELP)
    expect(USERNAME_TAKEN).toBe(BOARD_USERNAME_TAKEN)
    expect(cleanPinDisplayName('Alex P')).toBe('Alex P')
  })
})

describe('PIN lockout', () => {
  const start = 1_700_000_000_000

  it('pauses after 5 wrong PINs and holds the account after 15', () => {
    expect(MAX_FAILS).toBe(5)
    expect(MAX_LOCKOUTS).toBe(3)
    expect(LOCK_MS).toBe(15 * 60 * 1000)
    let lock = freshLock()
    for (let guess = 1; guess <= 4; guess += 1) {
      const next = registerFailure(lock, start)
      lock = next.lock
      expect(next.message).toBe(PIN_WRONG)
      expect(viewLock(lock, start)).toBe('open')
    }
    const firstPause = registerFailure(lock, start)
    lock = firstPause.lock
    expect(firstPause.message).toBe(PIN_LOCKED)
    expect(viewLock(lock, start + 1000)).toBe('temporary')
    const during = registerFailure(lock, start + 1000)
    expect(during.lock).toEqual(lock)
    expect(during.message).toBe(PIN_LOCKED)

    const after = start + LOCK_MS + 1
    expect(viewLock(lock, after)).toBe('open')
    for (let guess = 0; guess < 4; guess += 1) lock = registerFailure(lock, after).lock
    const secondPause = registerFailure(lock, after)
    lock = secondPause.lock
    expect(secondPause.lock.lockouts).toBe(2)

    const later = after + LOCK_MS + 1
    for (let guess = 0; guess < 4; guess += 1) lock = registerFailure(lock, later).lock
    const held = registerFailure(lock, later)
    expect(held.message).toBe(PIN_HELD)
    expect(held.lock.held).toBe(true)
    expect(registerFailure(held.lock, later + LOCK_MS * 10).message).toBe(PIN_HELD)
    expect(viewLock(registerSuccess(), later)).toBe('open')
  })
})

describe('network bucket', () => {
  it('allows a classroom of sign-ins and then pauses that network', () => {
    expect(SIGN_IN_IP_LIMIT).toBeGreaterThanOrEqual(200)
    expect(SIGN_UP_IP_LIMIT).toBeGreaterThanOrEqual(40)
    const now = 5_000
    let bucket = null as { attempts: number; windowStartedAt: number } | null
    for (let i = 0; i < SIGN_IN_IP_LIMIT; i += 1) {
      const charged = chargeBucket(bucket, now, SIGN_IN_IP_LIMIT, IP_WINDOW_MS)
      expect(charged.ok).toBe(true)
      bucket = charged.next
    }
    expect(chargeBucket(bucket, now, SIGN_IN_IP_LIMIT, IP_WINDOW_MS).ok).toBe(false)
    const later = chargeBucket(bucket, now + IP_WINDOW_MS, SIGN_IN_IP_LIMIT, IP_WINDOW_MS)
    expect(later.ok).toBe(true)
    expect(later.next.attempts).toBe(1)
  })

  it('does not store the raw IP in the bucket key', async () => {
    const ip = '203.0.113.10'
    const key = await attemptBucketKey('sign-in', 'pepper-pepper-pepper', ip)
    expect(key.startsWith('sign-in:')).toBe(true)
    expect(key.includes(ip)).toBe(false)
  })
})

describe('who can reset a PIN', () => {
  const base: ResetContext = {
    actorId: 'host-1',
    actorRole: 'player',
    targetId: 'player-2',
    targetRole: 'player',
    actorHostCompetitionIds: ['comp-1'],
    targetCompetitionIds: ['comp-1'],
    competitionId: 'comp-1',
  }

  it('lets a competition host reset a player in that competition only', () => {
    expect(decidePinReset(base)).toEqual({ ok: true })
    expect(decidePinReset({ ...base, competitionId: 'comp-2' }).ok).toBe(false)
    expect(decidePinReset({ ...base, targetCompetitionIds: ['comp-9'] })).toEqual({ ok: false, message: NOT_IN_COMPETITION })
    expect(decidePinReset({ ...base, competitionId: null })).toEqual({ ok: false, message: PICK_COMPETITION })
  })

  it('stops a player from resetting anyone, including themselves', () => {
    const player: ResetContext = { ...base, actorId: 'player-2', actorHostCompetitionIds: [], targetId: 'player-2' }
    expect(decidePinReset(player)).toEqual({ ok: false, message: RESET_DENIED })
    expect(decidePinReset({ ...player, targetId: 'player-3' })).toEqual({ ok: false, message: RESET_DENIED })
    expect(canOfferPinReset('player', 0)).toBe(false)
    expect(canOfferPinReset('player', 1)).toBe(true)
  })

  it('lets an admin or global host reset, and never lets a host reset an admin', () => {
    expect(decidePinReset({ ...base, actorRole: 'admin', actorHostCompetitionIds: [], competitionId: null })).toEqual({ ok: true })
    expect(decidePinReset({ ...base, actorRole: 'host', actorHostCompetitionIds: [], competitionId: null })).toEqual({ ok: true })
    expect(decidePinReset({ ...base, targetRole: 'admin' })).toEqual({ ok: false, message: RESET_DENIED })
    expect(decidePinReset({ ...base, actorRole: 'admin', targetRole: 'admin', competitionId: null })).toEqual({ ok: true })
    expect(canOfferPinReset('admin', 0)).toBe(true)
    expect(canOfferPinReset('host', 0)).toBe(true)
  })
})

describe('PIN request parsing', () => {
  it('ignores role and email on sign-up', () => {
    const parsed = parseSignUp({
      username: 'Alex_1',
      displayName: 'Alex',
      pin: '0000',
      role: 'admin',
      email: 'alex@school.edu',
      loginMethod: 'pin',
    })
    expect(parsed).toEqual({ ok: true, value: { username: 'Alex_1', displayName: 'Alex', pin: '0000' } })
    expect(parseSignUp({ username: 'no', displayName: 'Alex', pin: '1234' })).toEqual({ ok: false, message: USERNAME_HELP })
    expect(parseSignUp({ username: 'alex', displayName: 'alex@school.edu', pin: '1234' })).toEqual({
      ok: false,
      message: DISPLAY_NAME_HELP,
    })
    expect(parseSignIn({ username: 'alex', pin: '12' })).toEqual({ ok: false, message: PIN_HELP })
    expect(parseReset({ username: 'alex', pin: '1234', competitionId: 'not-a-uuid' })).toEqual({
      ok: false,
      message: PICK_COMPETITION,
    })
    expect(PIN_MISMATCH.includes('@')).toBe(false)
  })
})

describe('secrets', () => {
  const pepper = 'test-pepper-at-least-16'

  it('builds a Supabase password longer than the platform minimum', () => {
    const password = randomAuthPassword()
    expect(password.length).toBeGreaterThanOrEqual(8)
    expect(password).toMatch(/^Aa1![A-Za-z0-9]{24}$/)
  })

  it('uses a non-deliverable synthetic email', () => {
    const first = syntheticPinEmail()
    const second = syntheticPinEmail()
    expect(first).toMatch(/^p\.[0-9a-f-]{36}@pin\.yeshq\.invalid$/)
    expect(first).not.toBe(second)
  })

  it('mixes the pepper into the PIN material and encrypts the auth password', async () => {
    const material = await pinVerifierMaterial(pepper, 'user-1', '1234')
    const otherPin = await pinVerifierMaterial(pepper, 'user-1', '1235')
    const otherPepper = await pinVerifierMaterial('different-pepper-value', 'user-1', '1234')
    expect(material).not.toBe(otherPin)
    expect(material).not.toBe(otherPepper)
    expect(material.length).toBeLessThan(72)
    const password = randomAuthPassword()
    const stored = await encryptAuthSecret(pepper, password)
    expect(stored.includes(password)).toBe(false)
    expect(await decryptAuthSecret(pepper, stored)).toBe(password)
    await expect(decryptAuthSecret('another-pepper-value', stored)).rejects.toThrow()
  })
})

describe('pin auth handler', () => {
  function harness(roleBack: PlayerRecord['role'] = 'player') {
    const players = new Map<string, PlayerRecord>()
    const creds = new Map<string, CredentialRecord>()
    const created: { username: string; displayName: string }[] = []
    const deleted: string[] = []
    const resets: { userId: string; pin: string }[] = []
    let checks = 0
    let obscured = 0
    let now = 1_700_000_000_000
    let allow = true
    let facts: { error: string } | { ctx: ResetContext } = { error: SIGN_IN_REQUIRED }
    const deps: PinDeps = {
      allow: async () => allow,
      usernameTaken: async (username) => [...players.values()].some((player) => player.username.toLowerCase() === username.toLowerCase()),
      createPlayer: async (input) => {
        created.push(input)
        const player: PlayerRecord = {
          id: 'new-player',
          username: input.username,
          displayName: input.displayName,
          role: roleBack,
          loginMethod: 'pin',
        }
        players.set(player.id, player)
        return { player, authSecret: 'secret-new' }
      },
      deletePlayer: async (userId) => {
        deleted.push(userId)
        players.delete(userId)
      },
      findByUsername: async (username) => [...players.values()].find((player) => player.username.toLowerCase() === username.toLowerCase()) ?? null,
      readCredentials: async (userId) => creds.get(userId) ?? null,
      writeCredentials: async (userId, pinHash, authSecret, lock) => {
        creds.set(userId, { pinHash, authSecret, lock })
      },
      hashPin: async (userId, pin) => `hash:${userId}:${pin}`,
      checkPin: async (userId, pin, pinHash) => {
        checks += 1
        return pinHash === `hash:${userId}:${pin}`
      },
      obscureMiss: async () => {
        obscured += 1
      },
      openSession: async () => ({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
      now: () => now,
      resetFacts: async () => facts,
      resetPin: async (userId, pin) => {
        resets.push({ userId, pin })
      },
      logReset: async () => {},
    }
    return {
      deps,
      players,
      creds,
      created,
      deleted,
      resets,
      checks: () => checks,
      obscured: () => obscured,
      setNow: (value: number) => {
        now = value
      },
      setAllow: (value: boolean) => {
        allow = value
      },
      setFacts: (value: { error: string } | { ctx: ResetContext }) => {
        facts = value
      },
    }
  }

  it('creates a player account and returns a session without a role field', async () => {
    const box = harness()
    const result = await handlePinAuth(
      'sign-up',
      { username: 'alex', displayName: 'Alex', pin: '1234', role: 'admin', email: 'a@b.c' },
      null,
      box.deps,
    )
    expect(box.created).toEqual([{ username: 'alex', displayName: 'Alex' }])
    expect(result).toEqual({ ok: true, kind: 'session', accessToken: 'access-token', refreshToken: 'refresh-token' })
    expect(box.creds.get('new-player')?.pinHash).toBe('hash:new-player:1234')
    expect(box.creds.get('new-player')?.lock.failedAttempts).toBe(0)
  })

  it('refuses a sign-up that would not stay a player and deletes it', async () => {
    const box = harness('admin')
    const result = await handlePinAuth('sign-up', { username: 'alex', displayName: 'Alex', pin: '1234' }, null, box.deps)
    expect(result).toEqual({ ok: false, message: 'Something went wrong. Try again.' })
    expect(box.deleted).toEqual(['new-player'])
  })

  it('says when the username is taken or unknown, and keeps email accounts on email sign-in', async () => {
    const box = harness()
    box.players.set('old', { id: 'old', username: 'alex', displayName: 'Alex', role: 'player', loginMethod: 'email' })
    expect(await handlePinAuth('sign-up', { username: 'Alex', displayName: 'Alex P', pin: '1234' }, null, box.deps)).toEqual({
      ok: false,
      message: USERNAME_TAKEN,
    })
    expect(box.created).toHaveLength(0)
    expect(await handlePinAuth('sign-in', { username: 'Alex', pin: '1234' }, null, box.deps)).toEqual({
      ok: false,
      message: EMAIL_ACCOUNT,
    })
    expect(box.obscured()).toBe(0)
    expect(await handlePinAuth('sign-in', { username: 'missing', pin: '1234' }, null, box.deps)).toEqual({
      ok: false,
      message: USERNAME_UNKNOWN,
    })
    expect(box.obscured()).toBe(1)
    expect(box.creds.size).toBe(0)
  })

  it('locks a PIN account after repeated wrong guesses and clears the lock on success', async () => {
    const box = harness()
    box.players.set('p1', { id: 'p1', username: 'alex', displayName: 'Alex', role: 'player', loginMethod: 'pin' })
    box.creds.set('p1', { pinHash: 'hash:p1:1234', authSecret: 'secret', lock: freshLock() })
    const wrong = await handlePinAuth('sign-in', { username: 'alex', pin: '9999' }, null, box.deps)
    expect(wrong).toEqual({ ok: false, message: PIN_WRONG })
    expect(box.creds.get('p1')?.lock.failedAttempts).toBe(1)
    box.creds.set('p1', {
      pinHash: 'hash:p1:1234',
      authSecret: 'secret',
      lock: { failedAttempts: 0, lockouts: 1, lockedUntil: box.deps.now() + 1000, held: false },
    })
    const checksBefore = box.checks()
    expect(await handlePinAuth('sign-in', { username: 'alex', pin: '1234' }, null, box.deps)).toEqual({
      ok: false,
      message: PIN_LOCKED,
    })
    expect(box.checks()).toBe(checksBefore)
    const right = await handlePinAuth('sign-in', { username: 'alex', pin: '1234' }, null, box.deps)
    box.setNow(box.deps.now() + LOCK_MS + 5)
    const opened = await handlePinAuth('sign-in', { username: 'alex', pin: '1234' }, null, box.deps)
    expect(right.ok).toBe(false)
    expect(opened).toEqual({ ok: true, kind: 'session', accessToken: 'access-token', refreshToken: 'refresh-token' })
    expect(box.creds.get('p1')?.lock).toEqual(freshLock())
  })

  it('does not let a player reset a PIN or change a role', async () => {
    const box = harness()
    box.setFacts({
      ctx: {
        actorId: 'p1',
        actorRole: 'player',
        targetId: 'p2',
        targetRole: 'player',
        actorHostCompetitionIds: [],
        targetCompetitionIds: ['comp-1'],
        competitionId: 'comp-1',
      },
    })
    expect(await handlePinAuth('reset-pin', { username: 'sam', pin: '2222', role: 'admin' }, null, box.deps)).toEqual({
      ok: false,
      message: SIGN_IN_REQUIRED,
    })
    expect(
      await handlePinAuth('reset-pin', { username: 'sam', pin: '2222', role: 'admin' }, 'p1', box.deps),
    ).toEqual({ ok: false, message: RESET_DENIED })
    expect(box.resets).toEqual([])

    box.setFacts({
      ctx: {
        actorId: 'host-1',
        actorRole: 'player',
        targetId: 'p2',
        targetRole: 'player',
        actorHostCompetitionIds: ['comp-1'],
        targetCompetitionIds: ['comp-1'],
        competitionId: 'comp-1',
      },
    })
    const reset = await handlePinAuth('reset-pin', { username: 'sam', pin: '2222', role: 'admin' }, 'host-1', box.deps)
    expect(reset).toEqual({ ok: true, kind: 'reset' })
    expect(box.resets).toEqual([{ userId: 'p2', pin: '2222' }])
    expect(box.setAllow(false))
    expect(await handlePinAuth('sign-in', { username: 'alex', pin: '1234' }, null, box.deps)).toEqual({
      ok: false,
      message: TOO_MANY_TRIES,
    })
  })
})

describe('legacy email sign-in', () => {
  it('keeps a friendly message and does not mention a PIN', () => {
    expect(emailSignInMessage({ message: 'Invalid login credentials' })).toBe(EMAIL_SIGN_IN_MISMATCH)
    expect(emailSignInMessage({ message: 'Email not confirmed' })).toBe(EMAIL_NOT_CONFIRMED)
    expect(EMAIL_SIGN_IN_MISMATCH.toLowerCase().includes('pin')).toBe(false)
  })
})

describe('migration and leaderboard privacy', () => {
  it('adds PIN storage without touching scores or auth users', () => {
    const sql = readFileSync('supabase/migrations/20261109160000_pin_login.sql', 'utf8')
    expect(sql).toMatch(/login_method text not null default 'email'/)
    expect(sql).toMatch(/security invoker/)
    expect(sql.toLowerCase()).not.toMatch(/security definer/)
    expect(sql).toMatch(/revoke all on table public\.pin_credentials from public, anon, authenticated/)
    expect(sql).not.toMatch(/create policy/i)
    expect(sql.toLowerCase()).not.toMatch(/delete from public\.scores/)
    expect(sql.toLowerCase()).not.toMatch(/auth\.users/)
    expect(scoresHideEmail).toBe(true)
  })

  it('points the phone QR at the public game URL through the Vite base', () => {
    const png = readFileSync(`public/${PLAY_QR_FILE}`)
    const signature = [...png.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    expect(signature).toBe('89504e470d0a1a0a')
    expect(PLAY_URL).toBe('https://www.yeshq.org/lemonade')
    expect(joinPublicPath('/', PLAY_QR_FILE)).toBe('/brand/play-qr.png')
    expect(joinPublicPath('/yes-lemonade-startup/', PLAY_QR_FILE)).toBe('/yes-lemonade-startup/brand/play-qr.png')
  })
})
