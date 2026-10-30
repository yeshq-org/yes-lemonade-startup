import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
  refreshProfile: () => Promise<void>
}

const AccountContext = createContext<AccountApi | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = supabase !== null
  const [ready, setReady] = useState(!configured)
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState<{ userId: string | null; profile: Profile | null } | null>(null)
  const userId = session?.user.id ?? null
  // The profile counts as loaded only once the fetch finished for the user who is signed in right now.
  const profileReady = !configured || (ready && (userId === null || loaded?.userId === userId))
  const profile = userId !== null && loaded?.userId === userId ? loaded.profile : null

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session) {
      setLoaded(null)
      return
    }
    const id = session.user.id
    const { data } = await supabase
      .from('users')
      .select('id, display_name, username, role')
      .eq('id', id)
      .maybeSingle()
    setLoaded({ userId: id, profile: (data as Profile | null) ?? null })
  }, [session])

  useEffect(() => {
    if (!supabase) return
    let cancel = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancel) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => {
      cancel = true
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const api = useMemo(
    () => ({ configured, ready, profileReady, session, profile, refreshProfile }),
    [configured, ready, profileReady, session, profile, refreshProfile],
  )
  return <AccountContext.Provider value={api}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountApi {
  const api = useContext(AccountContext)
  if (!api) throw new Error('useAccount must be used inside AccountProvider')
  return api
}
