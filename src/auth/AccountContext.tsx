import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { TIMEOUT_MS, withTimeout } from './timeout'

export interface Profile {
  id: string
  display_name: string
  username: string | null
  role: 'player' | 'host' | 'admin'
}

interface AccountApi {
  configured: boolean
  ready: boolean
  profileReady: boolean
  session: Session | null
  profile: Profile | null
  profileError: boolean
  refreshProfile: () => Promise<void>
}

const AccountContext = createContext<AccountApi | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = supabase !== null
  const [ready, setReady] = useState(!configured)
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState<{ userId: string | null; profile: Profile | null; error: boolean } | null>(null)
  const userId = session?.user.id ?? null
  // The profile counts as loaded only once the fetch finished for the user who is signed in right now.
  const profileReady = !configured || (ready && (userId === null || loaded?.userId === userId))
  const profile = userId !== null && loaded?.userId === userId ? loaded.profile : null
  const profileError = userId !== null && loaded?.userId === userId ? loaded.error : false

  const refreshProfile = useCallback(async () => {
    if (!supabase || !userId) {
      setLoaded(null)
      return
    }
    const id = userId
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('id, display_name, username, role').eq('id', id).maybeSingle(),
      )
      if (error) throw error
      setLoaded({ userId: id, profile: (data as Profile | null) ?? null, error: false })
    } catch (e) {
      console.error('Profile load failed', e)
      setLoaded({ userId: id, profile: null, error: true })
    }
  }, [userId])

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let cancel = false
    let settled = false
    const finish = (next: Session | null) => {
      if (cancel || settled) return
      settled = true
      setSession(next)
      setReady(true)
    }
    const timer = setTimeout(() => finish(null), TIMEOUT_MS)
    sb.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error
        finish(data.session)
      })
      .catch((e) => {
        console.error('Session load failed', e)
        finish(null)
        sb.auth.signOut({ scope: 'local' }).catch(() => {})
      })
      .finally(() => clearTimeout(timer))
    const { data } = sb.auth.onAuthStateChange((_event, next) => {
      if (cancel) return
      settled = true
      clearTimeout(timer)
      setSession(next)
      setReady(true)
    })
    return () => {
      cancel = true
      clearTimeout(timer)
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const api = useMemo(
    () => ({ configured, ready, profileReady, session, profile, profileError, refreshProfile }),
    [configured, ready, profileReady, session, profile, profileError, refreshProfile],
  )
  return <AccountContext.Provider value={api}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountApi {
  const api = useContext(AccountContext)
  if (!api) throw new Error('useAccount must be used inside AccountProvider')
  return api
}
