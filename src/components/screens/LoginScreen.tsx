import { useState } from 'react'
import { cleanDisplayName } from '../../game/leaderboard'
import { supabase } from '../../lib/supabase'
import { errorText } from '../../auth/api'
import { useAccount } from '../../auth/AccountContext'
import { Button, Shell, useFocusHeading } from '../ui'

export function LoginScreen() {
  const heading = useFocusHeading()
  const { session, profile, refreshProfile } = useAccount()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    if (!supabase) return
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'up') {
        const displayName = cleanDisplayName(name)
        if (!displayName) {
          setError('Use a display name of 2 to 24 characters. Do not use an email address.')
          return
        }
        if (password.length < 8) {
          setError('Use a password of at least 8 characters.')
          return
        }
        const { data, error: signError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName } },
        })
        if (signError) throw signError
        if (!data.session) {
          setNotice('Check your email to confirm the account, then sign in. Your email stays private.')
          setMode('in')
          return
        }
        const { error: profileError } = await supabase.from('users').insert({
          id: data.session.user.id,
          display_name: displayName,
          role: 'player',
        })
        if (profileError) throw profileError
        await refreshProfile()
      } else {
        const { error: signError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signError) throw signError
      }
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  if (session && !profile) {
    return <NamePrompt initial={String(session.user.user_metadata.display_name ?? '')} />
  }

  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <img src="/brand/logo.png" alt="Y.E.S. Youth Entrepreneur Startup" className="mx-auto h-auto w-44" />
        <h1 ref={heading} tabIndex={-1} className="mt-6 font-display text-4xl leading-tight font-semibold outline-none">
          {mode === 'up' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="mt-3 text-ink-soft">
          Play starts after login. Leaderboards show your display name, never your email.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          {mode === 'up' && (
            <label className="block">
              <span className="font-semibold">Display name</span>
              <input
                data-testid="signup-name"
                className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                autoComplete="nickname"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="block">
            <span className="font-semibold">Email</span>
            <input
              data-testid="auth-email"
              type="email"
              autoComplete="email"
              className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold">Password</span>
            <input
              data-testid="auth-password"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="text-sm font-semibold text-coral">{error}</p>}
          {notice && <p className="text-sm font-semibold">{notice}</p>}
          <Button data-testid="auth-submit" type="submit" disabled={busy}>
            {mode === 'up' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 min-h-12 font-semibold text-teal"
          onClick={() => {
            setMode(mode === 'up' ? 'in' : 'up')
            setError(null)
          }}
        >
          {mode === 'up' ? 'I already have an account' : 'Need an account?'}
        </button>
      </main>
    </Shell>
  )
}

function NamePrompt({ initial }: { initial: string }) {
  const { session, refreshProfile } = useAccount()
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const heading = useFocusHeading()

  async function save() {
    if (!supabase || !session) return
    const displayName = cleanDisplayName(name)
    if (!displayName) {
      setError('Use a display name of 2 to 24 characters. Do not use an email address.')
      return
    }
    const { error: insertError } = await supabase.from('users').insert({
      id: session.user.id,
      display_name: displayName,
      role: 'player',
    })
    if (insertError) {
      setError(errorText(insertError))
      return
    }
    await refreshProfile()
  }

  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <h1 ref={heading} tabIndex={-1} className="font-display text-4xl font-semibold outline-none">
          Choose a display name
        </h1>
        <p className="mt-3 text-ink-soft">This is the only name that appears on a leaderboard.</p>
        <label className="mt-6 block">
          <span className="font-semibold">Display name</span>
          <input
            className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-coral">{error}</p>}
        <div className="mt-6">
          <Button onClick={() => void save()}>Save name</Button>
        </div>
      </main>
    </Shell>
  )
}
