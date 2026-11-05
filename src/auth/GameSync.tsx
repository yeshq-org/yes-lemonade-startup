import { useEffect, useRef, useState } from 'react'
import { claimDay, errorText, finishGame, listOpenGames, releaseDay, saveSnapshot } from './api'
import { normalizeSave } from '../game/storage'
import { supabase } from '../lib/supabase'
import type { GameState } from '../game/types'
import { useGame } from '../state/GameContext'

/** How long a toast stays on screen. */
const TOAST_MS = 3500

export function GameSync() {
  const { state, dispatch } = useGame()
  const last = useRef('')
  const previous = useRef<GameState | null>(null)
  /** Game id already closed on the server this session. */
  const posted = useRef<string | null>(null)
  const skipRelease = useRef(false)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const toastId = useRef(0)
  const setNote = (text: string) => {
    toastId.current += 1
    setToast({ id: toastId.current, text })
  }

  // Every toast clears itself after a few seconds.
  useEffect(() => {
    if (!toast) return
    const handle = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(handle)
  }, [toast])

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

  if (!toast) return null
  // Top of the screen and click-through, so a toast can never sit on the sticky action buttons.
  return (
    <p
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-3 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-cream shadow-lg"
    >
      {toast.text}
    </p>
  )
}
