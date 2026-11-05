import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** Null when the project URL or anon key is missing. Callers must show the accounts-off screen. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export function accountsConfigured(): boolean {
  return supabase !== null
}
