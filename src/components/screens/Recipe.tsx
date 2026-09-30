import { cupsFromInventory, displayCount, estimateUnitCogsCents, totalQty } from '../../game/inventory'
import { dayFees, expectedVisitors, trafficWord } from '../../game/demand'
import { formatMoney, formatUnitCents } from '../../game/money'
import { DAY_HOURS, PRICE_MAX_CENTS, PRICE_MIN_CENTS, PITCHER_CUPS } from '../../game/constants'
import { weatherReadout } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Header } from '../Header'
import { Button, Dock, Shell, Stepper, cx, useFocusHeading } from '../ui'

export function Recipe({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state) return null
  const weather = state.forecast[state.day - 1]
  if (!weather) return null
  const recipe = state.recipe
  const ready = cupsFromInventory(state.inventory, recipe)
  const visitors = expectedVisitors(weather, DAY_HOURS, state.popularity)
  const unit = estimateUnitCogsCents(state.inventory, recipe)
  const margin = unit === null ? null : recipe.priceCents - unit
  const fees = dayFees(DAY_HOURS)
  const shortStock = ready < visitors * 0.7
  const brokeOpen = ready === 0

  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <p className="text-lg font-semibold" data-testid="day-weather">
          {weatherReadout(weather)}
        </p>
        <h1 ref={heading} tabIndex={-1} className="mt-1 font-display text-4xl font-semibold outline-none">
          Build the cup
        </h1>
        <p className="mt-2 text-ink-soft">One pitcher makes {PITCHER_CUPS} cups. Yesterday’s recipe is still set — change it if the sky changed.</p>
        <div className="mt-4 rounded-3xl bg-ink px-4 py-4 text-cream">
          <p className="text-sm font-semibold text-lemon">Cups you can make</p>
          <p className="font-display text-5xl font-semibold">{ready}</p>
          <p className="text-sm text-cream/80">
            On hand: {displayCount('cups', totalQty(state.inventory.cups))} cups ·{' '}
            {displayCount('lemons', totalQty(state.inventory.lemons))} lemons ·{' '}
            {displayCount('sugar', totalQty(state.inventory.sugar))} sugar · {displayCount('ice', totalQty(state.inventory.ice))} ice
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <Stepper
            label="Lemons / pitcher"
            value={recipe.lemons}
            decLabel="Fewer lemons"
            incLabel="More lemons"
            disableDec={recipe.lemons <= 1}
            disableInc={recipe.lemons >= 8}
            onDec={() => dispatch({ type: 'set-lemons', value: recipe.lemons - 1 })}
            onInc={() => dispatch({ type: 'set-lemons', value: recipe.lemons + 1 })}
          />
          <Stepper
            label="Sugar / pitcher"
            value={recipe.sugar}
            decLabel="Less sugar"
            incLabel="More sugar"
            disableDec={recipe.sugar <= 1}
            disableInc={recipe.sugar >= 8}
            onDec={() => dispatch({ type: 'set-sugar', value: recipe.sugar - 1 })}
            onInc={() => dispatch({ type: 'set-sugar', value: recipe.sugar + 1 })}
          />
          <Stepper
            label="Ice / cup"
            value={recipe.ice}
            decLabel="Less ice"
            incLabel="More ice"
            disableDec={recipe.ice <= 0}
            disableInc={recipe.ice >= 8}
            onDec={() => dispatch({ type: 'set-ice', value: recipe.ice - 1 })}
            onInc={() => dispatch({ type: 'set-ice', value: recipe.ice + 1 })}
          />
        </div>
        <section className="mt-5" data-testid="recipe">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Price per cup</h2>
            <p className="font-display text-4xl font-semibold">{formatMoney(recipe.priceCents)}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <PriceNudge label="−25¢" delta={-25} />
            <PriceNudge label="−5¢" delta={-5} />
            <PriceNudge label="+5¢" delta={5} />
            <PriceNudge label="+25¢" delta={25} />
          </div>
          {unit !== null && margin !== null && (
            <p className={cx('mt-2 text-sm font-semibold', margin < 10 && 'text-coral')}>
              About {formatUnitCents(unit)} of supplies in each cup. At this price you keep about {formatUnitCents(margin)} before the
              stand fee and your time.
            </p>
          )}
          {ready === 0 && <p className="mt-2 text-sm text-ink-soft">Buy supplies or ease the recipe before this price can matter.</p>}
        </section>
        <p className="mt-4 text-base">
          The stand is open {DAY_HOURS} hours, 9:00am to 5:00pm. Crowd:{' '}
          <span className="font-semibold">{trafficWord(visitors)}</span>
          {` · about ${visitors} passersby`}. Opening charges {formatMoney(fees.standFeeCents)}.
        </p>
        {shortStock && !brokeOpen && (
          <p className="mt-2 text-sm font-semibold text-coral">
            You can only make {ready} cups. The day will not serve people you cannot pour for.
          </p>
        )}
        {brokeOpen && (
          <p className="mt-2 text-sm font-semibold text-coral">
            You cannot make a cup. Opening still charges {formatMoney(fees.standFeeCents)} for the {DAY_HOURS} hours.
          </p>
        )}
      </main>
      <Dock>
        <Button data-testid="open-stand" onClick={() => dispatch({ type: 'open' })}>
          {brokeOpen ? 'Open anyway' : 'Open the stand'}
        </Button>
        <Button variant="ghost" className="mt-1" onClick={() => dispatch({ type: 'to-shop' })}>
          Back to supplies
        </Button>
      </Dock>
    </Shell>
  )
}

function PriceNudge({ label, delta }: { label: string; delta: number }) {
  const { state, dispatch } = useGame()
  if (!state) return null
  const next = state.recipe.priceCents + delta
  return (
    <button
      type="button"
      className="min-h-12 flex-1 rounded-xl bg-sand font-semibold disabled:opacity-40"
      disabled={next < PRICE_MIN_CENTS || next > PRICE_MAX_CENTS}
      onClick={() => dispatch({ type: 'set-price', cents: next })}
    >
      {label}
    </button>
  )
}
