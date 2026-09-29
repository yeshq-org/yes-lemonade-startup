import { Component, useEffect, useState, type ReactNode } from 'react'
import { Career } from './components/screens/Career'
import { HowTo } from './components/screens/HowTo'
import { Morning } from './components/screens/Morning'
import { Recipe } from './components/screens/Recipe'
import { Report } from './components/screens/Report'
import { Season } from './components/screens/Season'
import { Selling } from './components/screens/Selling'
import { Shop } from './components/screens/Shop'
import { Splash } from './components/screens/Splash'
import { Button, Shell } from './components/ui'
import { SAVE_KEY } from './game/storage'
import { GameProvider, useGame } from './state/GameContext'

type Gate = 'splash' | 'howto' | 'season' | 'play'

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
      <GameProvider>
        <Root />
      </GameProvider>
    </ErrorBoundary>
  )
}

function Root() {
  const { state } = useGame()
  const [gate, setGate] = useState<Gate>('splash')

  useEffect(() => {
    if (!state && gate === 'play') setGate('splash')
  }, [state, gate])

  useEffect(() => {
    if (gate !== 'play' || !state) {
      document.title = 'Y.E.S. Lemonade Startup'
      return
    }
    document.title =
      state.phase === 'career' ? 'Season report · Y.E.S. Lemonade Startup' : `Day ${state.day} · Y.E.S. Lemonade Startup`
  }, [gate, state])

  if (gate === 'howto') return <HowTo onDone={() => setGate('season')} />
  if (gate === 'season') {
    return <Season onBack={() => setGate(state ? 'play' : 'splash')} onStart={() => setGate('play')} />
  }
  if (gate !== 'play' || !state) {
    return <Splash onStart={() => setGate('howto')} onContinue={() => setGate('play')} />
  }

  const onTitle = () => setGate('splash')
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
      return <Career onTitle={onTitle} onNewSeason={() => setGate('season')} />
    default:
      return <Splash onStart={() => setGate('howto')} onContinue={() => setGate('play')} />
  }
}
