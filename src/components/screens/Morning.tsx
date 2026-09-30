import { morningBrief } from '../../game/coach'
import { expectedVisitors, trafficWord } from '../../game/demand'
import { formatHourly, formatMoney } from '../../game/money'
import { weatherReadout } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { LemonMentor, WeatherArt } from '../art'
import { Header } from '../Header'
import { Button, Card, Dock, Meter, Shell, useFocusHeading } from '../ui'

export function Morning({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state) return null
  const weather = state.forecast[state.day - 1]
  if (!weather) return null
  const yesterday = state.history[state.history.length - 1] ?? null
  const brief = morningBrief(weather, yesterday)
  const visitors = expectedVisitors(weather, 8, state.popularity)
  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <WeatherArt weather={weather} />
        <h1 ref={heading} tabIndex={-1} className="mt-4 font-display text-3xl leading-tight font-semibold outline-none" data-testid="day-weather">
          {weatherReadout(weather)}
        </h1>
        <p className="mt-3 text-base">
          Foot traffic looks <span className="font-semibold">{trafficWord(visitors).toLowerCase()}</span> — about {visitors} people
          might pass a stand open for 8 hours. Not all of them will buy.
        </p>
        <Card className="mt-4">
          <div className="flex gap-3">
            <LemonMentor />
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-teal">{brief.kicker.toUpperCase()}</p>
              <p className="mt-1 text-base">{brief.text}</p>
            </div>
          </div>
        </Card>
        <div className="mt-4">
          <Meter
            label="Word of mouth"
            value={state.popularity}
            caption="Rises when the cup feels worth it. Slips when people leave unhappy or find you sold out."
          />
        </div>
        {yesterday && (
          <p className="mt-4 text-sm text-ink-soft">
            Yesterday: {formatHourly(yesterday.earningsPerHourCents)} · net {formatMoney(yesterday.netCents)}
          </p>
        )}
      </main>
      <Dock>
        <Button data-testid="ack-morning" onClick={() => dispatch({ type: 'ack-morning' })}>
          Shop for supplies
        </Button>
      </Dock>
    </Shell>
  )
}
