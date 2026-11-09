import { errorText } from './api'
import { supabase } from '../lib/supabase'
import { EMAIL_NOT_CONFIRMED, EMAIL_SIGN_IN_MISMATCH, PIN_NOT_READY, TRY_AGAIN } from '../../supabase/functions/_shared/pinPolicy.ts'

export interface PinCallResult {
  ok: boolean
  message: string
  accessToken?: string
  refreshToken?: string
}

/** Calls the pin-auth Edge Function. The service-role key stays on the server. */
export async function requestPin(body: Record<string, unknown>): Promise<PinCallResult> {
  if (!supabase) return { ok: false, message: PIN_NOT_READY }
  const { data, error } = await supabase.functions.invoke('pin-auth', { body })
  if (error || !data || typeof data !== 'object') return { ok: false, message: TRY_AGAIN }
  const row = data as { ok?: unknown; message?: unknown; access_token?: unknown; refresh_token?: unknown }
  if (row.ok !== true) {
    const message = typeof row.message === 'string' && row.message.length > 0 && row.message.length < 200 ? row.message : TRY_AGAIN
    return { ok: false, message }
  }
  return {
    ok: true,
    message: '',
    accessToken: typeof row.access_token === 'string' ? row.access_token : undefined,
    refreshToken: typeof row.refresh_token === 'string' ? row.refresh_token : undefined,
  }
}

/** Saves the session the function returned. Returns an error message, or null. */
export async function establishPinSession(result: PinCallResult): Promise<string | null> {
  if (!supabase || !result.accessToken || !result.refreshToken) return TRY_AGAIN
  const { error } = await supabase.auth.setSession({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  })
  if (error) return TRY_AGAIN
  return null
}

export function emailSignInMessage(error: unknown): string {
  const text = errorText(error)
  if (/invalid login credentials/i.test(text)) return EMAIL_SIGN_IN_MISMATCH
  if (/email not confirmed/i.test(text)) return EMAIL_NOT_CONFIRMED
  return text
}
