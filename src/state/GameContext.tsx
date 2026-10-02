import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { loadGame, saveGame } from '../game/storage'
import type { GameState } from '../game/types'
import { reducer, type Action } from './reducer'

interface GameApi {
  state: GameState | null
  dispatch: Dispatch<Action>
}

const GameContext = createContext<GameApi | null>(null)

export function GameProvider({ children, initialState }: { children: ReactNode; initialState?: GameState | null }) {
  const [state, dispatch] = useReducer(reducer, initialState, (boot: GameState | null | undefined) =>
    boot === undefined ? loadGame() : boot,
  )
  useEffect(() => {
    saveGame(state)
  }, [state])
  const api = useMemo(() => ({ state, dispatch }), [state])
  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const api = useContext(GameContext)
  if (!api) throw new Error('useGame must be used inside GameProvider')
  return api
}
