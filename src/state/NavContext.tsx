import { createContext, useContext } from 'react'

export interface NavApi {
  onTitle: () => void
  onLeaderboard: () => void
}

export const NavContext = createContext<NavApi | null>(null)

export function useNav(): NavApi | null {
  return useContext(NavContext)
}
