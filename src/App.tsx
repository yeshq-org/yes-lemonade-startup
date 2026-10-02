import { Component, useState, type ReactNode } from 'react'
import { AccountProvider, useAccount } from './auth/AccountContext'
import { GameSync } from './auth/GameSync'
import { Career } from './components/screens/Career'
import { HowTo } from './components/screens/HowTo'
import { LeaderboardScreen } from './components/screens/LeaderboardScreen'
import { LoginScreen } from './components/screens/LoginScreen'
import { AccountsOff } from './components/screens/AccountsOff'
import { Morning } from './components/screens/Morning'
import { Recipe } from './components/screens/Recipe'
import { Report } from './components/screens/Report'
import { Selling } from './components/screens/Selling'
import { SetupScreen } from './components/screens/SetupScreen'
import { Shop } from './components/screens/Shop'
import { Button, Shell } from './components/ui'
import { SAVE_KEY } from './game/storage'
import { GameProvider, useGame } from './state/GameContext'
import { NavContext } from './state/NavContext'

interface BoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    if (this.state.error) {
      return (
        <Shell>
          <main className="px-5 pt-16">
            <h1 className="font-display text-4xl font-semibold">The stand hit a snag.</h1>
            <p className="mt-3 text-ink-soft">Your saved season can be cleared so you can open fresh.</p>
            <div className="mt-6">
              <Button
                onClick={() => {
                  localStorage.removeItem(SAVE_KEY)
                  location.reload()
                }}
              >
                Reset saved game
              </Button>
            </div>
          </main>
        </Shell>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AccountProvider>
        <GameProvider>
          <GameSync />
          <Root />
        </GameProvider>
      </AccountProvider>
    </ErrorBoundary>
  )
}

type Screen = 'gate' | 'howto' | 'play' | 'board'

function Root() {
  const { state } = useGame()
  const { configured, ready, profileReady, session, profile } = useAccount()
  const [screen, setScreen] = useState<Screen>('gate')
  const [boardBack, setBoardBack] = useState<'gate' | 'play'>('gate')

  function openBoard(from: 'gate' | 'play') {
    setBoardBack(from)
    setScreen('board')
  }

  const nav = {
    onTitle: () => setScreen('gate'),
    onLeaderboard: () => openBoard(screen === 'play' ? 'play' : 'gate'),
  }

  let body: ReactNode
  if (!configured) {
    body =
      screen === 'board' ? (
        <LeaderboardScreen onBack={() => setScreen(boardBack)} />
      ) : screen === 'play' && state ? (
        <Play onTitle={() => setScreen('gate')} />
      ) : (
        <AccountsOff
          onFinishLegacy={state && !state.mode ? () => setScreen('play') : null}
          onLeaderboard={() => openBoard('gate')}
        />
      )
  } else if (!ready || (session && !profileReady)) {
    body = (
      <Shell>
        <main className="px-5 pt-16">
          <p className="font-display text-3xl font-semibold">Opening the stand…</p>
        </main>
      </Shell>
    )
  } else if (!session || !profile) {
    body = <LoginScreen />
  } else if (screen === 'board') {
    body = <LeaderboardScreen onBack={() => setScreen(boardBack)} />
  } else if (screen === 'howto') {
    body = <HowTo onDone={() => setScreen('play')} />
  } else if (screen === 'play' && state) {
    body = <Play onTitle={() => setScreen('gate')} />
  } else {
    body = (
      <SetupScreen
        onPlay={() => setScreen('play')}
        onReadyForHowTo={() => setScreen('howto')}
        onLeaderboard={() => openBoard('gate')}
      />
    )
  }

  return <NavContext.Provider value={nav}>{body}</NavContext.Provider>
}

function Play({ onTitle }: { onTitle: () => void }) {
  const { state } = useGame()
  if (!state) return null
  switch (state.phase) {
    case 'morning':
      return <Morning onTitle={onTitle} />
    case 'shop':
      return <Shop onTitle={onTitle} />
    case 'recipe':
      return <Recipe onTitle={onTitle} />
    case 'selling':
      return <Selling onTitle={onTitle} />
    case 'report':
      return <Report onTitle={onTitle} />
    case 'career':
      return <Career onTitle={onTitle} onNewSeason={onTitle} />
    default:
      return null
  }
}
