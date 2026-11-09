import { useEffect, useState } from 'react'
import {
  claimDay,
  createPrivateCompetition,
  createTeam,
  errorText,
  joinByCode,
  joinPublic,
  joinTeam,
  listHostedCompetitions,
  listOpenGames,
  listTeams,
  startGame,
  type CompetitionRow,
  type GameRow,
  type TeamRow,
} from '../../auth/api'
import { useAccount } from '../../auth/AccountContext'
import { canOfferPinReset } from '../../../supabase/functions/_shared/pinPolicy.ts'
import { PinResetScreen } from './PinResetScreen'
import { daysForMode, SCORING_VERSION } from '../../game/leaderboard'
import { randomSeed } from '../../game/rng'
import { createGame } from '../../game/setup'
import { normalizeSave } from '../../game/storage'
import { supabase } from '../../lib/supabase'
import type { GameMode, Keeper } from '../../game/types'
import { useGame } from '../../state/GameContext'
import { Button, Card, Shell, useFocusHeading } from '../ui'
import { ConfirmBox, endConfirmText } from '../EndGame'
import { canEndEarly, daysIfEndedNow } from '../../state/reducer'

export function SetupScreen({
  onPlay,
  onReadyForHowTo,
  onLeaderboard,
}: {
  onPlay: () => void
  onReadyForHowTo: () => void
  onLeaderboard: () => void
}) {
  const { state, dispatch } = useGame()
  const { profile, session } = useAccount()
  const heading = useFocusHeading()
  const legacy = state && !state.mode
  const active = state?.mode ? state : null
  const [replaceLegacy, setReplaceLegacy] = useState(false)
  const [step, setStep] = useState<'mode' | 'visibility' | 'private' | 'team' | 'keeper' | 'wait'>('mode')
  const [mode, setMode] = useState<GameMode | null>(null)
  const [competition, setCompetition] = useState<CompetitionRow | null>(null)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openGames, setOpenGames] = useState<GameRow[]>([])
  const [hostCode, setHostCode] = useState<string | null>(null)
  const [hosted, setHosted] = useState<CompetitionRow[]>([])
  const [resetOpen, setResetOpen] = useState(false)
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!profile) return
    listOpenGames()
      .then(setOpenGames)
      .catch(() => setOpenGames([]))
  }, [profile])

  useEffect(() => {
    if (!userId) return
    let cancel = false
    listHostedCompetitions(userId)
      .then((rows) => {
        if (!cancel) setHosted(rows)
      })
      .catch(() => {
        if (!cancel) setHosted([])
      })
    return () => {
      cancel = true
    }
  }, [userId])

  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)

  async function resume(row: GameRow, endNow = false) {
    setBusy(true)
    setError(null)
    try {
      let next = row
      if (row.mode === 'team_30' && row.writer_user_id == null) {
        next = await claimDay(row.id)
      } else if (row.writer_user_id && row.writer_user_id !== profile?.id && row.user_id !== profile?.id) {
        setStep('wait')
        setError(`Another teammate is running day ${row.locked_day ?? row.state.day}.`)
        return
      }
      const loaded = normalizeSave({
        ...next.state,
        gameId: next.id,
        competitionId: next.competition_id,
        teamId: next.team_id,
        mode: next.mode,
        scoringVersion: next.scoring_version,
      })
      if (!loaded) throw new Error('The saved game could not be read')
      dispatch({ type: 'hydrate', state: loaded })
      if (endNow && canEndEarly(loaded)) dispatch({ type: 'end-early' })
      onPlay()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function choosePublic() {
    if (!mode) return
    setBusy(true)
    setError(null)
    try {
      const row = await joinPublic(mode)
      setCompetition(row)
      if (mode === 'team_30') {
        setTeams(await listTeams(row.id))
        setStep('team')
      } else {
        setStep('keeper')
      }
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function createPrivate() {
    if (!mode) return
    setBusy(true)
    setError(null)
    try {
      const row = await createPrivateCompetition(name, mode)
      setCompetition(row)
      setHostCode(row.join_code)
      if (mode === 'team_30') setStep('team')
      else setStep('keeper')
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function joinPrivate() {
    setBusy(true)
    setError(null)
    try {
      const row = await joinByCode(code)
      if (mode && row.mode !== mode) {
        setError(row.mode === 'team_30' ? 'That code is a team competition (30 days).' : 'That code is an individual competition (7 days).')
        setMode(row.mode)
      }
      setMode(row.mode)
      setCompetition(row)
      if (row.mode === 'team_30') {
        setTeams(await listTeams(row.id))
        setStep('team')
      } else {
        setStep('keeper')
      }
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function makeTeam() {
    if (!competition) return
    setBusy(true)
    setError(null)
    try {
      const row = await createTeam(competition.id, teamName)
      setTeamId(row.id)
      setStep('keeper')
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function enterTeam(id: string) {
    setBusy(true)
    setError(null)
    try {
      const row = await joinTeam(id)
      setTeamId(row.id)
      const games = await listOpenGames()
      const existing = games.find((game) => game.team_id === row.id && game.status === 'in_progress')
      if (existing) {
        await resume(existing)
        return
      }
      setStep('keeper')
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function begin(keeper: Keeper) {
    if (!mode || !competition) return
    setBusy(true)
    setError(null)
    try {
      const seed = randomSeed()
      const days = daysForMode(mode)
      const draft = createGame(days, seed, keeper, {
        mode,
        scoringVersion: SCORING_VERSION,
        competitionId: competition.id,
        gameId: 'pending',
        teamId: mode === 'team_30' ? teamId : null,
      })
      const row = await startGame(competition.id, mode === 'team_30' ? teamId : null, draft)
      dispatch({
        type: 'start',
        seasonDays: days,
        seed,
        keeper,
        meta: {
          mode,
          scoringVersion: SCORING_VERSION,
          competitionId: competition.id,
          gameId: row.id,
          teamId: mode === 'team_30' ? teamId : null,
        },
      })
      onReadyForHowTo()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  const showWizard = !legacy || replaceLegacy
  // A server game already loaded on this device is shown once, in the card above.
  const serverGames = openGames.filter((game) => game.id !== active?.gameId)
  const soloInProgress =
    (active?.mode === 'individual_7' && active.phase !== 'career') || serverGames.some((game) => game.mode === 'individual_7')
  const canReset = profile ? canOfferPinReset(profile.role, hosted.length) : false

  if (resetOpen && profile) {
    return (
      <PinResetScreen
        role={profile.role}
        competitions={hosted.map((item) => ({ id: item.id, name: item.competition_name }))}
        onBack={() => setResetOpen(false)}
      />
    )
  }

  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-8 pb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-[0.14em] text-teal">Y.E.S.</p>
          <button type="button" data-testid="leaderboard-nav" className="min-h-12 font-bold text-ink" onClick={onLeaderboard}>
            LEADERBOARD
          </button>
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-4 font-display text-4xl leading-tight font-semibold outline-none">
          {profile ? `Hi, ${profile.display_name || profile.username}` : 'Start a season'}
        </h1>
        {canReset && (
          <button
            type="button"
            data-testid="open-pin-reset"
            className="mt-2 min-h-12 self-start text-left font-semibold text-teal"
            onClick={() => setResetOpen(true)}
          >
            Reset a player's PIN
          </button>
        )}
        {legacy && !replaceLegacy && (
          <Card className="mt-4">
            <p className="font-semibold">A season saved on this device can be finished here.</p>
            <p className="mt-1 text-sm text-ink-soft">It will not be posted to a leaderboard. Starting a logged-in season replaces it.</p>
            <div className="mt-4 space-y-2">
              <Button data-testid="finish-local-season" onClick={onPlay}>
                Finish the saved season
              </Button>
              <Button variant="secondary" onClick={() => setReplaceLegacy(true)}>
                Replace it and start a logged-in season
              </Button>
            </div>
          </Card>
        )}
        {active && (
          <Card className="mt-4">
            <p className="font-semibold">
              {active.phase === 'career' ? 'Your latest season is finished.' : `Day ${active.day} is still open.`}
            </p>
            <div className="mt-4 space-y-2">
              <Button data-testid="continue-run" onClick={onPlay}>
                {active.phase === 'career' ? 'View the season report' : `Continue day ${active.day}`}
              </Button>
              {canEndEarly(active) &&
                (confirmEnd === 'local' ? (
                  <ConfirmBox>
                    <p className="font-semibold">{endConfirmText(daysIfEndedNow(active))}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={() => setConfirmEnd(null)}>
                        Keep playing
                      </Button>
                      <Button
                        data-testid="end-confirm-yes"
                        onClick={() => {
                          dispatch({ type: 'end-early' })
                          setConfirmEnd(null)
                          onPlay()
                        }}
                      >
                        End game
                      </Button>
                    </div>
                  </ConfirmBox>
                ) : (
                  <Button variant="ghost" data-testid="end-game" onClick={() => setConfirmEnd('local')}>
                    End this game
                  </Button>
                ))}
            </div>
          </Card>
        )}
        {serverGames.length > 0 && (
          <div className="mt-4 space-y-2">
            {serverGames.map((game) => {
              const days = (game.state.history?.length ?? 0) + (game.state.phase === 'report' ? 1 : 0)
              const endable = game.mode === 'individual_7' && days >= 1 && game.state.phase !== 'career'
              return (
                <Card key={game.id}>
                  <p className="font-semibold">
                    {game.mode === 'team_30' ? `Team game · day ${game.locked_day ?? game.state.day}` : `Your 7-day game is on day ${game.state.day}.`}
                  </p>
                  <div className="mt-3 space-y-2">
                    <Button disabled={busy} onClick={() => void resume(game)}>
                      Continue day {game.mode === 'team_30' ? (game.locked_day ?? game.state.day) : game.state.day}
                    </Button>
                    {endable &&
                      (confirmEnd === game.id ? (
                        <ConfirmBox>
                          <p className="font-semibold">{endConfirmText(days)}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button variant="secondary" onClick={() => setConfirmEnd(null)}>
                              Keep playing
                            </Button>
                            <Button data-testid="end-confirm-yes" disabled={busy} onClick={() => void resume(game, true)}>
                              End game
                            </Button>
                          </div>
                        </ConfirmBox>
                      ) : (
                        <Button variant="ghost" data-testid="end-game" onClick={() => setConfirmEnd(game.id)}>
                          End this game
                        </Button>
                      ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        {showWizard && (
          <div className="mt-6 space-y-3">
            {step === 'mode' && (
              <>
                <p className="text-lg text-ink-soft">Individual is 7 days. Team is 30 days. Every sales day is still 8 hours.</p>
                {soloInProgress ? (
                  <p className="rounded-2xl bg-sand px-3 py-3 text-sm" data-testid="solo-in-progress">
                    You already have a 7-day game going. Continue it or end it above to start a new one.
                  </p>
                ) : (
                  <Button data-testid="mode-individual" onClick={() => { setMode('individual_7'); setStep('visibility') }}>
                    Individual · 7 days
                  </Button>
                )}
                <Button data-testid="mode-team" variant="secondary" onClick={() => { setMode('team_30'); setStep('visibility') }}>
                  Team · 30 days
                </Button>
              </>
            )}
            {step === 'visibility' && (
              <>
                <p className="text-lg text-ink-soft">Public seasons share one board. A private competition has a name and a join code.</p>
                <Button data-testid="visibility-public" disabled={busy} onClick={() => void choosePublic()}>
                  Public
                </Button>
                <Button data-testid="visibility-private" variant="secondary" onClick={() => setStep('private')}>
                  Private
                </Button>
              </>
            )}
            {step === 'private' && (
              <>
                <label className="block">
                  <span className="font-semibold">Competition name</span>
                  <input
                    data-testid="competition-name"
                    className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <Button data-testid="create-competition" disabled={busy} onClick={() => void createPrivate()}>
                  Create competition
                </Button>
                {hostCode && <p className="text-center font-display text-3xl font-semibold">{hostCode}</p>}
                <label className="block">
                  <span className="font-semibold">Or join with a code</span>
                  <input
                    data-testid="join-code"
                    className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                    placeholder="YES-4827"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <Button data-testid="join-competition" variant="secondary" disabled={busy} onClick={() => void joinPrivate()}>
                  Join with code
                </Button>
              </>
            )}
            {step === 'team' && (
              <>
                <p className="text-ink-soft">One teammate runs each day. After that day is reported, any teammate can take the next morning.</p>
                {hostCode && (
                  <p className="font-semibold">
                    You are the host. Share <span className="font-display text-2xl">{hostCode}</span>
                  </p>
                )}
                <label className="block">
                  <span className="font-semibold">New team name</span>
                  <input
                    data-testid="team-name"
                    className="mt-1 min-h-12 w-full rounded-2xl bg-card px-3 shadow-[0_0_0_1.5px_#eadcc6]"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                  />
                </label>
                <Button data-testid="create-team" disabled={busy} onClick={() => void makeTeam()}>
                  Create team
                </Button>
                {teams.map((team) => (
                  <Button key={team.id} variant="secondary" disabled={busy} onClick={() => void enterTeam(team.id)}>
                    Join {team.name}
                  </Button>
                ))}
              </>
            )}
            {step === 'keeper' && (
              <>
                {hostCode && mode === 'individual_7' && (
                  <p className="font-semibold">
                    You are the host. Share <span className="font-display text-2xl">{hostCode}</span>
                  </p>
                )}
                <p className="font-semibold">Who is running the stand?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button data-testid="keeper-guy" disabled={busy} onClick={() => void begin('guy')}>
                    Guy
                  </Button>
                  <Button data-testid="keeper-girl" variant="secondary" disabled={busy} onClick={() => void begin('girl')}>
                    Girl
                  </Button>
                </div>
              </>
            )}
            {step === 'wait' && <p className="text-ink-soft">Come back when this day has been reported.</p>}
            {error && <p className="text-sm font-semibold text-coral">{error}</p>}
          </div>
        )}
        <button
          type="button"
          className="mt-auto min-h-12 self-start font-semibold text-teal"
          onClick={() => void supabase?.auth.signOut()}
        >
          Sign out
        </button>
      </main>
    </Shell>
  )
}
