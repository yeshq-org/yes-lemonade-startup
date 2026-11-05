import { useEffect, useRef } from 'react'
import { showToast } from '../components/toast'
import { claimDay, errorText, finishGame, listOpenGames, releaseDay, saveSnapshot } from './api'
import { normalizeSave } from '../game/storage'
import { supabase } from '../lib/supabase'
import type { GameState } from '../game/types'
import { useGame } from '../state/GameContext'


export function GameSync() {
  const { state, dispatch } = useGame()
  const last = useRef('')
  const previous = useRef<GameState | null>(null)
  /** Game id already closed on the server this session. */
  const posted = useRef<string | null>(null)
  const skipRelease = useRef(false)
  const setNote = showToast

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
          // Close the season on the server. Posting to the leaderboard is a separate choice on the debrief screen.
          if (posted.current === current.gameId) return
          await finishGame(current.gameId, current)
          posted.current = current.gameId
          last.current = JSON.stringify(current)
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
  }, [state, dispatch])

  return null
}
