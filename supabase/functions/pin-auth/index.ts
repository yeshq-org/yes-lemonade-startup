// Username + PIN sign-in.
// Deploy from the repo root, after the pin_login migration:
//   supabase functions deploy pin-auth --no-verify-jwt
// Set the PIN_PEPPER secret (at least 16 random characters) in Edge Function secrets.
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.
// Never print those values. This file does not contain them.
// --no-verify-jwt is required because a new player has no session yet.
// Reset still checks the caller's user JWT inside this function.
//
// auth.admin.createUser does not send a confirmation email. email_confirm marks the
// synthetic mailbox confirmed so the player can sign in immediately.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import bcrypt from 'npm:bcryptjs@2.4.3'
import { handlePinAuth, isTakenError, type CredentialRecord, type PinDeps, type PlayerRecord } from '../_shared/handlePinAuth.ts'
import {
  attemptBucketKey,
  chargeBucket,
  decryptAuthSecret,
  encryptAuthSecret,
  freshLock,
  ipLimit,
  IP_WINDOW_MS,
  NOT_PIN_ACCOUNT,
  PIN_NOT_READY,
  pinVerifierMaterial,
  randomAuthPassword,
  SIGN_IN_REQUIRED,
  syntheticPinEmail,
  TRY_AGAIN,
  USERNAME_UNKNOWN,
  type AccountRole,
  type PinLock,
} from '../_shared/pinPolicy.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

class SetupError extends Error {}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, message: TRY_AGAIN }, 405)
  let text = ''
  try {
    text = await req.text()
  } catch {
    return json({ ok: false, message: TRY_AGAIN }, 400)
  }
  if (text.length > 4000) return json({ ok: false, message: TRY_AGAIN }, 400)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ ok: false, message: TRY_AGAIN }, 400)
  }
  const action = typeof body === 'object' && body !== null && 'action' in body ? String((body as { action: unknown }).action) : ''
  try {
    const pepper = readPepper()
    const url = requiredEnv('SUPABASE_URL')
    const admin = createClient(url, serviceCredential(), { auth: { persistSession: false, autoRefreshToken: false } })
    const anonKey = anonCredential()
    const ip = clientIp(req)
    const deps = makeDeps(admin, url, anonKey, pepper, ip)
    const actorId = action === 'reset-pin' ? await readCaller(url, anonKey, req) : null
    const outcome = await handlePinAuth(action, body, actorId, deps)
    if (!outcome.ok) return json({ ok: false, message: outcome.message })
    if (outcome.kind === 'reset') return json({ ok: true })
    return json({ ok: true, access_token: outcome.accessToken, refresh_token: outcome.refreshToken })
  } catch (error) {
    if (error instanceof SetupError) return json({ ok: false, message: PIN_NOT_READY })
    console.error('pin-auth failed', error instanceof Error ? error.name : 'error')
    return json({ ok: false, message: TRY_AGAIN }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors })
}

function readPepper(): string {
  const value = Deno.env.get('PIN_PEPPER')?.trim() ?? ''
  if (value.length < 16) throw new SetupError('pepper')
  return value
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? ''
  if (!value) throw new SetupError(name)
  return value
}

function serviceCredential(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (legacy) return legacy
  const parsed = parseKeyBag('SUPABASE_SECRET_KEYS')
  if (parsed) return parsed
  throw new SetupError('service')
}

function anonCredential(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
  if (legacy) return legacy
  const parsed = parseKeyBag('SUPABASE_PUBLISHABLE_KEYS')
  if (parsed) return parsed
  throw new SetupError('anon')
}

function parseKeyBag(name: string): string | null {
  const raw = Deno.env.get(name)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed.default?.trim() || null
  } catch {
    return null
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  return req.headers.get('cf-connecting-ip')?.trim() || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

async function readCaller(url: string, anonKey: string, req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)/i)?.[1] ?? ''
  if (!token) return null
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

// The admin client is the service-role client. Its type is the return of createClient.
// Deno's npm specifier types are loose here, so the helpers take a structural client.
interface AdminClient {
  from(table: string): any
  auth: {
    admin: {
      createUser(input: { email: string; password: string; email_confirm: boolean }): Promise<{ data: { user: { id: string } | null }; error: { message?: string; code?: string } | null }>
      deleteUser(id: string): Promise<{ error: { message?: string } | null }>
      getUserById(id: string): Promise<{ data: { user: { email?: string | null } | null }; error: { message?: string } | null }>
      updateUserById(id: string, input: { password: string }): Promise<{ error: { message?: string } | null }>
    }
  }
}

function makeDeps(admin: AdminClient, url: string, anonKey: string, pepper: string, ip: string): PinDeps {
  let dummy: Promise<string> | null = null

  async function hashPin(userId: string, pin: string): Promise<string> {
    const material = await pinVerifierMaterial(pepper, userId, pin)
    return bcrypt.hash(material, 10)
  }

  async function writeCredentials(userId: string, pinHash: string, authSecret: string, lock: PinLock): Promise<void> {
    const { error } = await admin.from('pin_credentials').upsert({
      user_id: userId,
      pin_hash: pinHash,
      auth_secret: authSecret,
      failed_attempts: lock.failedAttempts,
      lockouts: lock.lockouts,
      locked_until: lock.lockedUntil === null ? null : new Date(lock.lockedUntil).toISOString(),
      held: lock.held,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  return {
    allow: async (kind) => {
      const key = await attemptBucketKey(kind, pepper, ip)
      const now = Date.now()
      const { data, error } = await admin.from('pin_attempt_buckets').select('attempts, window_started_at').eq('bucket_key', key).maybeSingle()
      if (error) throw error
      const bucket = data
        ? { attempts: Number(data.attempts), windowStartedAt: Date.parse(String(data.window_started_at)) }
        : null
      const charged = chargeBucket(bucket, now, ipLimit(kind), IP_WINDOW_MS)
      const { error: writeError } = await admin.from('pin_attempt_buckets').upsert({
        bucket_key: key,
        attempts: charged.next.attempts,
        window_started_at: new Date(charged.next.windowStartedAt).toISOString(),
      })
      if (writeError) throw writeError
      return charged.ok
    },
    usernameTaken: async (username) => {
      const { data, error } = await admin.from('users').select('id').eq('username_lower', username.toLowerCase()).maybeSingle()
      if (error) throw error
      return Boolean(data)
    },
    createPlayer: async (input) => {
      const password = randomAuthPassword()
      const email = syntheticPinEmail()
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error || !data.user) throw error ?? new Error('create failed')
      const id = data.user.id
      const { error: insertError } = await admin.from('users').insert({
        id,
        display_name: input.displayName,
        username: input.username,
        role: 'player',
        login_method: 'pin',
      })
      if (insertError) {
        await admin.auth.admin.deleteUser(id)
        if (isTakenError(insertError) || insertError.code === '23505') {
          const taken = new Error('taken') as Error & { code: string }
          taken.code = 'taken'
          throw taken
        }
        throw insertError
      }
      return {
        player: {
          id,
          username: input.username,
          displayName: input.displayName,
          role: 'player',
          loginMethod: 'pin',
        },
        authSecret: await encryptAuthSecret(pepper, password),
      }
    },
    deletePlayer: async (userId) => {
      await admin.auth.admin.deleteUser(userId)
    },
    findByUsername: (username) => findPlayer(admin, username),
    readCredentials: async (userId) => readCredentials(admin, userId),
    writeCredentials,
    hashPin,
    checkPin: async (userId, pin, pinHash) => {
      const material = await pinVerifierMaterial(pepper, userId, pin)
      return bcrypt.compare(material, pinHash)
    },
    obscureMiss: async () => {
      dummy ??= bcrypt.hash('yes-pin-timing-pad', 10)
      await bcrypt.compare('0000', await dummy)
    },
    openSession: async (userId, authSecret) => {
      const password = await decryptAuthSecret(pepper, authSecret)
      const { data, error } = await admin.auth.admin.getUserById(userId)
      if (error || !data.user?.email) throw error ?? new Error('missing user')
      const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const signed = await anon.auth.signInWithPassword({ email: data.user.email, password })
      if (signed.error || !signed.data.session) throw signed.error ?? new Error('no session')
      return { accessToken: signed.data.session.access_token, refreshToken: signed.data.session.refresh_token }
    },
    now: () => Date.now(),
    resetFacts: async (actorId, username, competitionId) => {
      const { data: actor, error: actorError } = await admin.from('users').select('id, role').eq('id', actorId).maybeSingle()
      if (actorError) throw actorError
      const actorRole = asRole(actor?.role)
      if (!actor || !actorRole) return { error: SIGN_IN_REQUIRED }
      const target = await findPlayer(admin, username)
      if (!target) return { error: USERNAME_UNKNOWN }
      if (target.loginMethod !== 'pin') return { error: NOT_PIN_ACCOUNT }
      const { data: hostMemberships, error: hostError } = await admin
        .from('memberships')
        .select('competition_id')
        .eq('user_id', actorId)
        .eq('role', 'host')
      if (hostError) throw hostError
      const { data: hosted, error: hostedError } = await admin.from('competitions').select('id').eq('host_user_id', actorId)
      if (hostedError) throw hostedError
      const { data: targetMemberships, error: targetError } = await admin
        .from('memberships')
        .select('competition_id')
        .eq('user_id', target.id)
      if (targetError) throw targetError
      const hostIds = new Set<string>()
      for (const row of hostMemberships ?? []) hostIds.add(String(row.competition_id))
      for (const row of hosted ?? []) hostIds.add(String(row.id))
      return {
        ctx: {
          actorId,
          actorRole,
          targetId: target.id,
          targetRole: target.role,
          actorHostCompetitionIds: [...hostIds],
          targetCompetitionIds: (targetMemberships ?? []).map((row: { competition_id: string }) => String(row.competition_id)),
          competitionId,
        },
      }
    },
    resetPin: async (userId, pin) => {
      const password = randomAuthPassword()
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      const authSecret = await encryptAuthSecret(pepper, password)
      const pinHash = await hashPin(userId, pin)
      try {
        await writeCredentials(userId, pinHash, authSecret, freshLock())
      } catch {
        await writeCredentials(userId, pinHash, authSecret, freshLock())
      }
    },
    logReset: async (actorId, targetId) => {
      const { error } = await admin.from('pin_reset_log').insert({ actor_id: actorId, target_id: targetId })
      if (error) throw error
    },
  }
}

async function findPlayer(admin: AdminClient, username: string): Promise<PlayerRecord | null> {
  const { data, error } = await admin
    .from('users')
    .select('id, username, display_name, role, login_method')
    .eq('username_lower', username.toLowerCase())
    .maybeSingle()
  if (error) throw error
  if (!data || typeof data.username !== 'string') return null
  const role = asRole(data.role)
  if (!role) return null
  return {
    id: String(data.id),
    username: data.username,
    displayName: String(data.display_name ?? ''),
    role,
    loginMethod: data.login_method === 'pin' ? 'pin' : 'email',
  }
}

async function readCredentials(admin: AdminClient, userId: string): Promise<CredentialRecord | null> {
  const { data, error } = await admin
    .from('pin_credentials')
    .select('pin_hash, auth_secret, failed_attempts, lockouts, locked_until, held')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    pinHash: String(data.pin_hash),
    authSecret: String(data.auth_secret),
    lock: {
      failedAttempts: Number(data.failed_attempts),
      lockouts: Number(data.lockouts),
      lockedUntil: data.locked_until ? Date.parse(String(data.locked_until)) : null,
      held: Boolean(data.held),
    },
  }
}

function asRole(value: unknown): AccountRole | null {
  if (value === 'player' || value === 'host' || value === 'admin') return value
  return null
}
