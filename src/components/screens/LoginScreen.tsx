import { useState } from 'react'
import { cleanDisplayName, cleanUsername, USERNAME_HELP } from '../../game/leaderboard'
import { publicUrl } from '../../lib/publicUrl'
import { supabase } from '../../lib/supabase'
import { profileErrorText } from '../../auth/api'
import { useAccount } from '../../auth/AccountContext'
import { emailSignInMessage, establishPinSession, requestPin } from '../../auth/pinClient'
import {
  cleanPin,
  cleanPinDisplayName,
  cleanPinUsername,
  DISPLAY_NAME_HELP,
  PIN_HELP,
  PIN_MISMATCH,
  USERNAME_HELP as PIN_USERNAME_HELP,
} from '../../../supabase/functions/_shared/pinPolicy.ts'
import { Button, Shell, useFocusHeading } from '../ui'
import { PlayQr } from './PlayQr'

type AuthMode = 'up' | 'in' | 'email'

export function LoginScreen() {
  const { session, profile, refreshProfile } = useAccount()
  const [mode, setMode] = useState<AuthMode>('up')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    setError(null)
    setNotice(null)
    if (!supabase) return
    if (mode === 'email') {
      if (!email.trim() || !password) {
        setError('Enter the email and password for your account.')
        return
      }
      setBusy(true)
      try {
        const { error: signError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signError) setError(emailSignInMessage(signError))
      } finally {
        setBusy(false)
      }
      return
    }
    const handle = cleanPinUsername(username)
    if (!handle) {
      setError(PIN_USERNAME_HELP)
      return
    }
    const nextPin = cleanPin(pin)
    if (!nextPin) {
      setError(PIN_HELP)
      return
    }
    if (mode === 'up') {
      const displayName = cleanPinDisplayName(name)
      if (!displayName) {
        setError(DISPLAY_NAME_HELP)
        return
      }
      if (cleanPin(pinAgain) !== nextPin) {
        setError(PIN_MISMATCH)
        return
      }
      setBusy(true)
      try {
        const result = await requestPin({ action: 'sign-up', username: handle, displayName, pin: nextPin })
        if (!result.ok) {
          setError(result.message)
          return
        }
        const sessionError = await establishPinSession(result)
        if (sessionError) {
          setError(sessionError)
          return
        }
        await refreshProfile()
      } finally {
        setBusy(false)
      }
      return
    }
    setBusy(true)
    try {
      const result = await requestPin({ action: 'sign-in', username: handle, pin: nextPin })
      if (!result.ok) {
        setError(result.message)
        return
      }
      const sessionError = await establishPinSession(result)
      if (sessionError) setError(sessionError)
    } finally {
      setBusy(false)
    }
  }

  if (session && !busy && (!profile || !profile.username)) {
    return (
      <NamePrompt
        initialName={profile?.display_name ?? String(session.user.user_metadata.display_name ?? '')}
        initialUsername={profile?.username ?? String(session.user.user_metadata.username ?? '')}
        initialError={error}
      />
    )
  }

  return (
    <LoginView
      mode={mode}
      name={name}
      username={username}
      pin={pin}
      pinAgain={pinAgain}
      email={email}
      password={password}
      error={error}
      notice={notice}
      busy={busy}
      onMode={(next) => {
        setMode(next)
        setError(null)
        setNotice(null)
      }}
      onName={setName}
      onUsername={setUsername}
      onPin={setPin}
      onPinAgain={setPinAgain}
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={() => void onSubmit()}
    />
  )
}

export function LoginView({
  mode,
  name,
  username,
  pin,
  pinAgain,
  email,
  password,
  error,
  notice,
  busy,
  onMode,
  onName,
  onUsername,
  onPin,
  onPinAgain,
  onEmail,
  onPassword,
  onSubmit,
}: {
  mode: AuthMode
  name: string
  username: string
  pin: string
  pinAgain: string
  email: string
  password: string
  error: string | null
  notice: string | null
  busy: boolean
  onMode: (mode: AuthMode) => void
  onName: (value: string) => void
  onUsername: (value: string) => void
  onPin: (value: string) => void
  onPinAgain: (value: string) => void
  onEmail: (value: string) => void
  onPassword: (value: string) => void
  onSubmit: () => void
}) {
  const heading = useFocusHeading()
  const title = mode === 'up' ? 'Create your account' : mode === 'in' ? 'Sign in' : 'Email sign in'
  const intro =
    mode === 'up'
      ? 'Pick a username and a 4-digit PIN. No email needed. Leaderboards show your username only.'
      : mode === 'in'
        ? 'Same username and PIN on any phone. Leaderboards show your username only.'
        : 'For accounts created with email before PIN sign-in. Your scores stay put. Leaderboards still show your username only.'

  return (
    <div className="grove min-h-dvh overflow-x-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center min-[960px]:flex-row min-[960px]:items-center min-[960px]:justify-center min-[960px]:gap-12 min-[960px]:px-8 min-[960px]:py-10">
        <div className="flex min-h-dvh w-full min-w-0 max-w-[440px] flex-col bg-cream px-5 pt-10 pb-8 min-[960px]:min-h-0 min-[960px]:rounded-[28px] min-[960px]:px-6 min-[960px]:shadow-[0_0_0_1px_rgba(28,25,21,0.05),0_24px_80px_rgba(90,55,10,0.12)]">
          <img src={publicUrl('brand/logo.png')} alt="Y.E.S. Youth Entrepreneur Startup" className="mx-auto h-auto w-44 max-w-full" />
          <h1 ref={heading} tabIndex={-1} className="mt-6 font-display text-4xl leading-tight font-semibold outline-none">
            {title}
          </h1>
          <p className="mt-3 text-ink-soft">{intro}</p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            {mode === 'up' && (
              <>
                <TextField id="signup-username" testId="signup-username" label="Username" value={username} autoComplete="username" onChange={onUsername} />
                <p className="-mt-1 text-sm text-ink-soft">Shown on leaderboards. Only you can have it.</p>
                <TextField id="signup-name" testId="signup-name" label="Your name" value={name} autoComplete="name" onChange={onName} />
                <p className="-mt-1 text-sm text-ink-soft">Other players can have the same name.</p>
                <PinField id="signup-pin" testId="signup-pin" label="PIN" value={pin} onChange={onPin} />
                <PinField id="signup-pin-again" testId="signup-pin-again" label="Type the PIN again" value={pinAgain} onChange={onPinAgain} />
              </>
            )}
            {mode === 'in' && (
              <>
                <TextField id="signin-username" testId="signin-username" label="Username" value={username} autoComplete="username" onChange={onUsername} />
                <PinField id="signin-pin" testId="signin-pin" label="PIN" value={pin} onChange={onPin} />
              </>
            )}
            {mode === 'email' && (
              <>
                <label className="block" htmlFor="auth-email">
                  <span className="font-semibold">Email</span>
                  <input
                    id="auth-email"
                    data-testid="auth-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1 min-h-12 w-full min-w-0 rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                    value={email}
                    onChange={(event) => onEmail(event.target.value)}
                  />
                </label>
                <label className="block" htmlFor="auth-password">
                  <span className="font-semibold">Password</span>
                  <input
                    id="auth-password"
                    data-testid="auth-password"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1 min-h-12 w-full min-w-0 rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                    value={password}
                    onChange={(event) => onPassword(event.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p id="auth-error" role="alert" data-testid="auth-error" className="text-sm font-semibold text-coral">
                {error}
              </p>
            )}
            {notice && <p className="text-sm font-semibold">{notice}</p>}
            <Button data-testid="auth-submit" type="submit" disabled={busy}>
              {mode === 'up' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          {mode === 'up' && (
            <ModeButton onClick={() => onMode('in')}>I already have an account</ModeButton>
          )}
          {mode === 'in' && <ModeButton onClick={() => onMode('up')}>Need an account?</ModeButton>}
          {mode !== 'email' && <ModeButton onClick={() => onMode('email')}>I use an email and password</ModeButton>}
          {mode === 'email' && <ModeButton onClick={() => onMode('in')}>Use a username and PIN</ModeButton>}
          <div className="mt-8 min-[960px]:hidden">
            <PlayQr size="small" />
          </div>
        </div>
        <div className="hidden min-[960px]:block">
          <PlayQr size="large" />
        </div>
      </div>
    </div>
  )
}

function ModeButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="mt-2 min-h-12 font-semibold text-teal" onClick={onClick}>
      {children}
    </button>
  )
}

function TextField({
  id,
  testId,
  label,
  value,
  autoComplete,
  onChange,
}: {
  id: string
  testId: string
  label: string
  value: string
  autoComplete: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="font-semibold">{label}</span>
      <input
        id={id}
        data-testid={testId}
        className="mt-1 min-h-12 w-full min-w-0 rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={autoComplete === 'username' ? 21 : 24}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function PinField({
  id,
  testId,
  label,
  value,
  onChange,
}: {
  id: string
  testId: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="font-semibold">{label}</span>
      <input
        id={id}
        data-testid={testId}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        pattern="[0-9]*"
        maxLength={4}
        enterKeyHint="done"
        className="mt-1 min-h-12 w-full min-w-0 rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
      />
    </label>
  )
}

function NamePrompt({
  initialName,
  initialUsername,
  initialError,
}: {
  initialName: string
  initialUsername: string
  initialError: string | null
}) {
  const { session, profile, refreshProfile } = useAccount()
  const [name, setName] = useState(initialName)
  const [username, setUsername] = useState(initialUsername)
  const [error, setError] = useState<string | null>(initialError)
  const [busy, setBusy] = useState(false)
  const heading = useFocusHeading()

  async function save() {
    if (!supabase || !session) return
    setError(null)
    const handle = cleanUsername(username)
    if (!handle) {
      setError(USERNAME_HELP)
      return
    }
    const displayName = cleanDisplayName(name)
    if (!displayName) {
      setError(DISPLAY_NAME_HELP)
      return
    }
    setBusy(true)
    try {
      const row = { display_name: displayName, username: handle }
      const { error: saveError } = profile
        ? await supabase.from('users').update(row).eq('id', session.user.id)
        : await supabase.from('users').insert({ id: session.user.id, ...row, role: 'player' })
      if (saveError) {
        setError(profileErrorText(saveError))
        return
      }
      await refreshProfile()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <h1 ref={heading} tabIndex={-1} className="font-display text-4xl font-semibold outline-none">
          Choose a username
        </h1>
        <p className="mt-3 text-ink-soft">Your username is what appears on a leaderboard. Pick one nobody else has.</p>
        <label className="mt-6 block" htmlFor="prompt-username">
          <span className="font-semibold">Username</span>
          <input
            id="prompt-username"
            data-testid="prompt-username"
            className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={21}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="mt-4 block" htmlFor="prompt-name">
          <span className="font-semibold">Your name</span>
          <input
            id="prompt-name"
            data-testid="prompt-name"
            className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <span className="mt-1 block text-sm text-ink-soft">Other players can have the same name.</span>
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-coral">{error}</p>}
        <div className="mt-6">
          <Button data-testid="prompt-save" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </main>
    </Shell>
  )
}
