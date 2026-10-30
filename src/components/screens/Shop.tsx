import { bestPackIndex, CATALOG, ITEM_COPY, packLabel } from '../../game/catalog'
import { cartCostCents, formatStock, totalQty } from '../../game/inventory'
import { formatMoney, formatUnitCents } from '../../game/money'
import { ITEM_IDS, type ItemId } from '../../game/types'
import { weatherReadout } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Header } from '../Header'
import { Button, Card, Dock, Shell, useFocusHeading } from '../ui'

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

  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 px-4 pt-4">
        <h1 ref={heading} tabIndex={-1} className="font-display text-4xl font-semibold outline-none">
          Stock the stand
        </h1>
        <p className="mt-2 text-ink-soft" data-testid="day-weather">
          {weatherReadout(weather)} · prices moved today. Bigger packs usually cost less per piece.
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

/** Names the item on the button so a bare + or − is never ambiguous. */
function buttonLabel(item: ItemId, qty: number): string {
  if (item === 'sugar') return `${qty} cups of sugar`
  if (item === 'ice') return `${qty} ice cubes`
  if (item === 'lemons') return `${qty} lemons`
  return `${qty} cups`
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
      </div>
      <div className="space-y-2">
        {CATALOG[item].map((pack, index) => {
          const price = prices[item][index]!
          const inCart = state.cart.find((line) => line.item === item && line.packIndex === index)?.packs ?? 0
          const canAdd = state.cashCents - cartCostCents(state.cart, prices) >= price
          return (
            <div key={pack.qty} className="min-w-0 rounded-2xl bg-card px-3 py-3 shadow-[0_0_0_1.5px_#eadcc6]">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {packLabel(item, pack.qty)}
                  {index === best && (
                    <span className="ml-2 rounded-full bg-leaf px-2 py-0.5 align-middle text-xs font-bold text-cream">Best rate</span>
                  )}
                </p>
                <p className="shrink-0 font-semibold">{formatMoney(price)}</p>
              </div>
              <p className="text-sm text-ink-soft">{formatUnitCents(price / pack.qty)} each</p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                {inCart > 0 && (
                  <button
                    type="button"
                    aria-label={`Remove one ${packLabel(item, pack.qty)} pack`}
                    className="min-h-12 min-w-0 flex-1 rounded-xl bg-sand px-2 text-center text-sm leading-tight font-bold"
                    onClick={() => dispatch({ type: 'remove-pack', item, packIndex: index })}
                  >
                    − {buttonLabel(item, pack.qty)}
                  </button>
                )}
                {inCart > 0 && (
                  <span className="min-w-8 text-center font-display text-xl font-semibold" aria-label={`${inCart} in cart`}>
                    {inCart}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Add ${packLabel(item, pack.qty)} for ${formatMoney(price)}`}
                  disabled={!canAdd}
                  className="min-h-12 min-w-0 flex-1 rounded-xl bg-lemon px-2 text-center text-sm leading-tight font-bold disabled:opacity-40"
                  onClick={() => dispatch({ type: 'add-pack', item, packIndex: index })}
                >
                  + {buttonLabel(item, pack.qty)}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
