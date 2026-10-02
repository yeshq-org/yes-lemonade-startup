import { useEffect, useRef, useState } from 'react'
import { claimDay, errorText, listOpenGames, releaseDay, saveSnapshot, submitFinishedGame } from './api'
import { useAccount } from './AccountContext'
import { normalizeSave } from '../game/storage'
import { supabase } from '../lib/supabase'
import type { GameState } from '../game/types'
import { useGame } from '../state/GameContext'

export function GameSync() {
  const { state, dispatch } = useGame()
  const { profile } = useAccount()
  const last = useRef('')
  const previous = useRef<GameState | null>(null)
  const posted = useRef<string | null>(null)
  const skipRelease = useRef(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !state?.gameId || !state.mode || state.scoringVersion !== 1) {
      previous.current = state
      return
    }
    if (skipRelease.current) {
      skipRelease.current = false
      previous.current = state
      last.current = JSON.stringify(state)
      return
    }
    const serial = JSON.stringify(state)
    if (serial === last.current) return
    const before = previous.current
    previous.current = state
    const handle = window.setTimeout(() => {
      void push(state, before)
    }, 400)
    return () => window.clearTimeout(handle)

    async function push(current: GameState, prior: GameState | null) {
      if (!current.gameId) return
      try {
        if (current.phase === 'career') {
          if (!profile || posted.current === current.gameId) return
          let teamName: string | null = null
          if (current.teamId && supabase) {
            const { data } = await supabase.from('teams').select('name').eq('id', current.teamId).maybeSingle()
            teamName = typeof data?.name === 'string' ? data.name : null
          }
          await submitFinishedGame(current, profile.display_name, teamName)
          posted.current = current.gameId
          last.current = JSON.stringify(current)
          setNote('Posted to the leaderboard.')
          return
        }
        const handoff =
          current.mode === 'team_30' &&
          prior?.gameId === current.gameId &&
          prior.day !== current.day &&
          current.phase === 'morning'
        if (handoff) {
          await releaseDay(current.gameId, current)
          try {
            await claimDay(current.gameId)
          } catch (caught) {
            setNote(errorText(caught))
            const rows = await listOpenGames()
            const remote = rows.find((row) => row.id === current.gameId)
            const loaded = remote ? normalizeSave({ ...remote.state, gameId: remote.id }) : null
            if (loaded) {
              skipRelease.current = true
              dispatch({ type: 'hydrate', state: loaded })
            }
            return
          }
        }
        await saveSnapshot(current.gameId, current)
        last.current = serial
      } catch (caught) {
        setNote(errorText(caught))
      }
    }
  }, [state, profile, dispatch])

  if (!note) return null
  return (
    <p
      role="status"
      className="fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-cream"
    >
      {note}
    </p>
  )
}
