import { bestPackIndex, CATALOG, ITEM_COPY, packLabel } from '../../game/catalog'
import { IDEAL_ICE, expectedVisitors } from '../../game/demand'
import { cartCostCents, displayCount, formatStock, totalQty } from '../../game/inventory'
import { formatMoney, formatUnitCents } from '../../game/money'
import { ITEM_IDS, type ItemId } from '../../game/types'
import { weatherPhrase } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Header } from '../Header'
import { Button, Card, Dock, Shell, cx, useFocusHeading } from '../ui'

export function Shop({ onTitle }: { onTitle: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state) return null
  const prices = state.priceBook[state.day - 1]
  const weather = state.forecast[state.day - 1]
  if (!prices || !weather) return null
  const cost = cartCostCents(state.cart, prices)
  const after = state.cashCents - cost
  const onHand = ITEM_IDS.map((item) => formatStock(item, totalQty(state.inventory[item]))).join(' · ')
  const emptyStand = ITEM_IDS.every((item) => totalQty(state.inventory[item]) === 0)
  const visitors = expectedVisitors(weather, 8, state.popularity)
  const iceHave =
    displayCount('ice', totalQty(state.inventory.ice)) +
    state.cart.filter((line) => line.item === 'ice').reduce((sum, line) => sum + line.packs * CATALOG.ice[line.packIndex].qty, 0)
  const iceNeed = visitors * Math.max(state.recipe.ice, IDEAL_ICE[weather.heat], 1)
  const iceWarning = iceHave > iceNeed + 60
  const harshIce = (weather.heat === 'cold' || weather.sky === 'rain') && state.cart.some((line) => line.item === 'ice' && line.packIndex === 2)

  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <h1 ref={heading} tabIndex={-1} className="font-display text-4xl font-semibold outline-none">
          Stock the stand
        </h1>
        <p className="mt-2 text-ink-soft">
          {weatherPhrase(weather)} · prices moved today. Bigger packs usually cost less per piece. Ice melts tonight no matter what.
        </p>
        <Card className="mt-4">
          <p className="text-xs font-bold tracking-[0.14em] text-teal">ON HAND</p>
          <p className="mt-1">{emptyStand ? 'Nothing in the stand yet.' : onHand}</p>
        </Card>
        <div className="mt-4 space-y-5">
          {ITEM_IDS.map((item) => (
            <ItemBlock key={item} item={item} />
          ))}
        </div>
        {(iceWarning || harshIce) && (
          <Card className="mt-4 border border-coral/30">
            <p className="font-semibold text-coral">Ice warning</p>
            <p className="mt-1 text-sm">
              {harshIce
                ? 'A huge ice pack on a cold or rainy day mostly melts. That cash does not come back in the morning.'
                : 'That is a lot of ice for the crowd you are likely to see. Cubes you do not sell are gone overnight.'}
            </p>
          </Card>
        )}
      </main>
      <Dock>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold">{cost === 0 ? 'No supplies selected' : `Stocking costs ${formatMoney(cost)}`}</span>
          <span className="text-ink-soft">Cash after {formatMoney(after)}</span>
        </div>
        <Button data-testid="checkout" onClick={() => dispatch({ type: 'checkout' })}>
          {cost === 0 ? 'Continue without buying' : 'Stock the stand'}
        </Button>
        {cost > 0 && (
          <Button variant="ghost" className="mt-1" onClick={() => dispatch({ type: 'clear-cart' })}>
            Put it all back
          </Button>
        )}
      </Dock>
    </Shell>
  )
}

function ItemBlock({ item }: { item: ItemId }) {
  const { state, dispatch } = useGame()
  if (!state) return null
  const prices = state.priceBook[state.day - 1]
  if (!prices) return null
  const copy = ITEM_COPY[item]
  const best = bestPackIndex(item, prices[item])
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">{copy.name}</h2>
        <p className={cx('text-sm font-semibold', item === 'ice' ? 'text-coral' : 'text-ink-soft')}>{copy.keeps}</p>
      </div>
      <div className="space-y-2">
        {CATALOG[item].map((pack, index) => {
          const price = prices[item][index]!
          const inCart = state.cart.find((line) => line.item === item && line.packIndex === index)?.packs ?? 0
          const canAdd = state.cashCents - cartCostCents(state.cart, prices) >= price
          return (
            <div key={pack.qty} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-[0_0_0_1.5px_#eadcc6]">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {packLabel(item, pack.qty)}
                  {index === best && (
                    <span className="ml-2 rounded-full bg-leaf px-2 py-0.5 align-middle text-xs font-bold text-cream">Best rate</span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">
                  {formatMoney(price)} · {formatUnitCents(price / pack.qty)} each
                </p>
              </div>
              {inCart > 0 && (
                <button
                  type="button"
                  aria-label={`Remove one ${packLabel(item, pack.qty)} pack`}
                  className="grid h-12 w-12 place-items-center rounded-xl bg-sand text-xl font-bold"
                  onClick={() => dispatch({ type: 'remove-pack', item, packIndex: index })}
                >
                  −
                </button>
              )}
              {inCart > 0 && <span className="w-6 text-center font-display text-xl font-semibold">{inCart}</span>}
              <button
                type="button"
                aria-label={`Add ${packLabel(item, pack.qty)} for ${formatMoney(price)}`}
                disabled={!canAdd}
                className="grid h-12 w-12 place-items-center rounded-xl bg-lemon text-xl font-bold disabled:opacity-40"
                onClick={() => dispatch({ type: 'add-pack', item, packIndex: index })}
              >
                +
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
