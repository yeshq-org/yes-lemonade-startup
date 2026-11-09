import { useEffect, useState } from 'react'
import { listCompetitionMembers } from '../../auth/api'
import { requestPin } from '../../auth/pinClient'
import {
  cleanPin,
  cleanPinUsername,
  PIN_HELP,
  PIN_MISMATCH,
  PIN_RESET_DONE,
  PICK_COMPETITION,
  USERNAME_HELP,
  type AccountRole,
} from '../../../supabase/functions/_shared/pinPolicy.ts'
import { supabase } from '../../lib/supabase'
import { Button, Shell, useFocusHeading } from '../ui'

export interface PinResetCompetition {
  id: string
  name: string
}

export interface PinResetMember {
  id: string
  username: string
  displayName: string
}

export function PinResetScreen({
  role,
  competitions,
  onBack,
}: {
  role: AccountRole
  competitions: PinResetCompetition[]
  onBack: () => void
}) {
  const requireCompetition = role === 'player'
  const [competitionId, setCompetitionId] = useState<string | null>(requireCompetition && competitions.length === 1 ? competitions[0].id : null)
  const [members, setMembers] = useState<PinResetMember[]>([])
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!competitionId) {
      setMembers([])
      return
    }
    let cancel = false
    listCompetitionMembers(competitionId)
      .then((rows) => {
        if (cancel) return
        setMembers(
          rows
            .filter((row): row is { id: string; username: string; displayName: string } => Boolean(row.username))
            .map((row) => ({ id: row.id, username: row.username, displayName: row.displayName })),
        )
      })
      .catch(() => {
        if (!cancel) setMembers([])
      })
    return () => {
      cancel = true
    }
  }, [competitionId])

  async function onSubmit() {
    setError(null)
    setNotice(null)
    const handle = cleanPinUsername(username)
    if (!handle) {
      setError(USERNAME_HELP)
      return
    }
    const next = cleanPin(pin)
    if (!next) {
      setError(PIN_HELP)
      return
    }
    if (cleanPin(pinAgain) !== next) {
      setError(PIN_MISMATCH)
      return
    }
    if (requireCompetition && !competitionId) {
      setError(PICK_COMPETITION)
      return
    }
    setBusy(true)
    try {
      const result = await requestPin({
        action: 'reset-pin',
        username: handle,
        pin: next,
        competitionId,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setPin('')
      setPinAgain('')
      setNotice(PIN_RESET_DONE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PinResetView
      competitions={competitions}
      requireCompetition={requireCompetition}
      competitionId={competitionId}
      members={members}
      username={username}
      pin={pin}
      pinAgain={pinAgain}
      error={error}
      notice={notice}
      busy={busy}
      onCompetition={(id) => {
        setCompetitionId(id)
        setUsername('')
        setError(null)
        setNotice(null)
      }}
      onUsername={(value) => {
        setUsername(value)
        setNotice(null)
      }}
      onPin={setPin}
      onPinAgain={setPinAgain}
      onSubmit={() => void onSubmit()}
      onBack={onBack}
      onSignOut={() => void supabase?.auth.signOut()}
    />
  )
}

export function PinResetView({
  competitions,
  requireCompetition,
  competitionId,
  members,
  username,
  pin,
  pinAgain,
  error,
  notice,
  busy,
  onCompetition,
  onUsername,
  onPin,
  onPinAgain,
  onSubmit,
  onBack,
  onSignOut,
}: {
  competitions: PinResetCompetition[]
  requireCompetition: boolean
  competitionId: string | null
  members: PinResetMember[]
  username: string
  pin: string
  pinAgain: string
  error: string | null
  notice: string | null
  busy: boolean
  onCompetition: (id: string | null) => void
  onUsername: (value: string) => void
  onPin: (value: string) => void
  onPinAgain: (value: string) => void
  onSubmit: () => void
  onBack: () => void
  onSignOut: () => void
}) {
  const heading = useFocusHeading()
  const chosen = competitions.find((item) => item.id === competitionId) ?? null
  const showCompetitionPicker = !requireCompetition || competitions.length !== 1

  return (
    <Shell>
      <main className="flex min-w-0 flex-1 flex-col px-5 pt-8 pb-8">
        <button type="button" className="min-h-12 self-start font-semibold text-teal" onClick={onBack}>
          Back
        </button>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-4xl leading-tight font-semibold outline-none">
          Reset a PIN
        </h1>
        <p className="mt-3 text-ink-soft">
          {requireCompetition
            ? 'Set a new 4-digit PIN for a player in your competition. This does not change their role or their score.'
            : 'Set a new 4-digit PIN for a player. This does not change their role or their score.'}
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          {competitions.length === 1 && requireCompetition && chosen && (
            <p className="font-semibold">
              Competition <span className="font-display text-2xl">{chosen.name}</span>
            </p>
          )}
          {showCompetitionPicker && competitions.length > 0 && (
            <label className="block" htmlFor="pin-reset-competition">
              <span className="font-semibold">Competition</span>
              <select
                id="pin-reset-competition"
                data-testid="pin-reset-competition"
                className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                value={competitionId ?? ''}
                onChange={(event) => onCompetition(event.target.value || null)}
              >
                {!requireCompetition && <option value="">Any player</option>}
                {requireCompetition && <option value="">Choose a competition</option>}
                {competitions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {members.length > 0 && (
            <label className="block" htmlFor="pin-reset-player">
              <span className="font-semibold">Player</span>
              <select
                id="pin-reset-player"
                data-testid="pin-reset-player"
                className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                value={members.some((member) => member.username === username) ? username : ''}
                onChange={(event) => onUsername(event.target.value)}
              >
                <option value="">Choose a player</option>
                {members.map((member) => (
                  <option key={member.id} value={member.username}>
                    {member.displayName !== member.username ? `${member.username} (${member.displayName})` : member.username}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block" htmlFor="pin-reset-username">
            <span className="font-semibold">Username</span>
            <input
              id="pin-reset-username"
              data-testid="pin-reset-username"
              className="mt-1 min-h-12 w-full min-w-0 rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={21}
              value={username}
              onChange={(event) => onUsername(event.target.value)}
            />
          </label>
          <PinField id="pin-reset-pin" testId="pin-reset-pin" label="New PIN" value={pin} onChange={onPin} />
          <PinField id="pin-reset-pin-again" testId="pin-reset-pin-again" label="Type the new PIN again" value={pinAgain} onChange={onPinAgain} />
          {error && (
            <p id="pin-reset-error" role="alert" className="text-sm font-semibold text-coral">
              {error}
            </p>
          )}
          {notice && <p className="text-sm font-semibold text-leaf">{notice}</p>}
          <Button data-testid="pin-reset-submit" type="submit" disabled={busy}>
            Reset PIN
          </Button>
        </form>
        <button type="button" className="mt-6 min-h-12 self-start font-semibold text-teal" onClick={onSignOut}>
          Sign out
        </button>
      </main>
    </Shell>
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
