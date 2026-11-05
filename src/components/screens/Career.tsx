import { useRef, useState } from 'react'
import { BUSINESS_QUESTION, REFLECTIONS, seasonVerdict } from '../../game/coach'
import { STARTING_CASH_CENTS } from '../../game/constants'
import { formatHourly, formatMoney } from '../../game/money'
import { chainFromSummary, summarize, TIER_META } from '../../game/scoring'
import { useAccount } from '../../auth/AccountContext'
import { errorText, submitFinishedGame } from '../../auth/api'
import { debriefText, shareText } from '../../game/share'
import { supabase } from '../../lib/supabase'
import { appendTranscript, speechAvailable, speechHint, startTalk, stopTalk } from '../../game/speech'
import { weekdayName } from '../../game/weather'
import { useGame } from '../../state/GameContext'
import { Chain } from '../Chain'
import { Header } from '../Header'
import { Receipt } from '../Receipt'
import { Button, Card, Dock, Shell, cx, useFocusHeading } from '../ui'

export function Career({ onTitle, onNewSeason }: { onTitle: () => void; onNewSeason: () => void }) {
  const { state, dispatch } = useGame()
  const heading = useFocusHeading()
  if (!state) return null
  const summary = summarize(state)
  const tier = TIER_META[summary.tier]
  const verdict = seasonVerdict(summary.earningsPerHourCents, summary.totalNetCents)
  const standFee = state.history.reduce((sum, day) => sum + day.standFeeCents, 0)
  const helper = state.history.reduce((sum, day) => sum + day.helperCents, 0)
  const worthDelta = summary.netWorthCents - STARTING_CASH_CENTS
  const waste = {
    iceCents: state.history.reduce((sum, day) => sum + day.iceMeltCents, 0),
    lemonsCents: state.history.reduce((sum, day) => sum + day.spoilLemonsCents, 0),
    sugarCents: state.history.reduce((sum, day) => sum + day.spoilSugarCents, 0),
  }
  const wasteTotal = waste.iceCents + waste.lemonsCents + waste.sugarCents
  return (
    <Shell>
      <Header onTitle={onTitle} />
      <main className="flex-1 space-y-5 px-4 pt-4">
        <div
          className={cx(
            'rounded-3xl px-4 py-5 text-center',
            summary.tier === 'boss' && 'bg-lemon',
            summary.tier === 'scalable' && 'bg-teal text-cream',
            summary.tier === 'growing' && 'bg-leaf text-cream',
            summary.tier === 'side' && 'bg-sand',
          )}
        >
          <p className="text-xs font-bold tracking-[0.16em]">STARTUP TIER</p>
          <p className="font-display text-5xl font-semibold">{tier.name}</p>
          <p className="mt-2 text-base">{tier.blurb}</p>
        </div>
        <div>
          <h1 ref={heading} tabIndex={-1} className="font-display text-3xl leading-tight font-semibold outline-none">
            {BUSINESS_QUESTION}
          </h1>
          <p className="mt-3 text-lg font-semibold">{verdict.headline}</p>
          <p className="mt-1 text-ink-soft">{verdict.answer}</p>
        </div>
        <Receipt
          testId="career-receipt"
          title="Whole season"
          subtitle={`${summary.daysOpened} of ${state.seasonDays} days open`}
          revenueCents={summary.totalRevenueCents}
          cogsCents={summary.totalCogsCents}
          grossCents={summary.totalGrossCents}
          otherCents={summary.totalOtherCents}
          standFeeCents={standFee}
          helperCents={helper}
          waste={waste}
          netCents={summary.totalNetCents}
          hours={summary.totalHours}
          hourlyCents={summary.earningsPerHourCents}
        />
        <p className="text-center text-sm text-ink-soft">
          Season earnings per hour are total net profit divided by 8 hours for each day the stand was open. Leaderboards rank by net
          profit. Earnings per hour only breaks a tie.
        </p>
        <Chain stats={chainFromSummary(summary)} title="The season in one chain" />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Net worth" value={formatMoney(summary.netWorthCents)} hint={`${worthDelta >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(worthDelta))} from $20`} />
          <Stat label="Cash" value={formatMoney(summary.cashCents)} hint={`Supplies still worth ${formatMoney(summary.inventoryCents)}`} />
          <Stat
            label="Best day"
            value={summary.best ? formatHourly(summary.best.earningsPerHourCents) : '—'}
            hint={summary.best ? `${weekdayName(summary.best.day)} · Day ${summary.best.day}` : 'You never opened'}
          />
          <Stat
            label="Toughest day"
            value={summary.worst ? formatHourly(summary.worst.earningsPerHourCents) : '—'}
            hint={summary.worst ? `${weekdayName(summary.worst.day)} · Day ${summary.worst.day}` : 'No hours on the books'}
          />
        </div>
        <Card>
          <h2 className="font-display text-2xl font-semibold">Badges</h2>
          <ul className="mt-3 space-y-2">
            {summary.badges.map((badge) => (
              <li key={badge.id} className={cx('rounded-2xl px-3 py-3', badge.earned ? 'bg-sand' : 'bg-card shadow-[0_0_0_1.5px_#eadcc6]')}>
                <p className="font-semibold">
                  {badge.earned ? 'Earned' : 'Not yet'} · {badge.name}
                </p>
                <p className="text-sm text-ink-soft">{badge.description}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-2xl font-semibold">Waste and satisfaction</h2>
          <p className="mt-2">
            Waste cost you {formatMoney(wasteTotal)} this season: {formatMoney(waste.iceCents)} of melted ice,{' '}
            {formatMoney(waste.lemonsCents)} of lemons and {formatMoney(waste.sugarCents)} of sugar that went bad. It is not in cost of
            goods, because none of it was sold. It is an other expense, so it lowers your net profit.
          </p>
          <p className="mt-2">
            Average satisfaction:{' '}
            <span className="font-semibold">{summary.avgSatisfaction === null ? '—' : `${summary.avgSatisfaction}`}</span>
          </p>
        </Card>
        <section>
          <h2 className="font-display text-2xl font-semibold">Sit with it</h2>
          <p className="mt-1 text-sm text-ink-soft">Nobody grades these. They save on this device with your season.</p>
          <p className="mt-1 text-sm text-ink-soft">{speechHint(typeof window === 'undefined' ? null : window)}</p>
          <div className="mt-3 space-y-4">
            {REFLECTIONS.map((prompt, index) => (
              <Reflection
                key={prompt.title}
                index={index as 0 | 1 | 2}
                title={prompt.title}
                prompt={prompt.prompt}
                value={state.reflections[index] ?? ''}
                onChange={(text) => dispatch({ type: 'reflect', index: index as 0 | 1 | 2, text })}
              />
            ))}
          </div>
        </section>
        <PostAndShare summaryText={debriefText(summary, state.seasonDays, state.reflections)} />
      </main>
      <Dock>
        <Button onClick={onNewSeason}>Run another season</Button>
      </Dock>
    </Shell>
  )
}

function Reflection({
  index,
  title,
  prompt,
  value,
  onChange,
}: {
  index: 0 | 1 | 2
  title: string
  prompt: string
  value: string
  onChange: (text: string) => void
}) {
  const canTalk = speechAvailable(typeof window === 'undefined' ? null : window)
  const [listening, setListening] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const valueRef = useRef(value)
  const token = useRef<object | null>(null)
  valueRef.current = value
  const fieldId = `reflection-${index}`

  function toggle() {
    if (listening) {
      token.current = null
      stopTalk()
      setListening(false)
      return
    }
    const mine = {}
    token.current = mine
    const started = startTalk({
      onFinal: (said) => {
        const next = appendTranscript(valueRef.current, said)
        valueRef.current = next
        onChange(next)
      },
      onEnd: () => {
        if (token.current === mine) setListening(false)
      },
      onError: (message) => {
        if (token.current !== mine) return
        setListening(false)
        setNote(message)
      },
    })
    if (!started) {
      setNote('Talk-to-type is not in this browser. You can still type.')
      return
    }
    setNote(null)
    setListening(true)
  }

  return (
    <div>
      <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between">
        <label htmlFor={fieldId} className="block min-w-0">
          <span className="font-semibold">{title}</span>
          <span className="mt-1 block text-sm text-ink-soft">{prompt}</span>
        </label>
        {canTalk && (
          <button
            type="button"
            data-testid={`talk-${index}`}
            aria-pressed={listening}
            aria-label={listening ? 'Stop talking' : 'Talk to type this answer'}
            onClick={toggle}
            className="min-h-11 w-full shrink-0 rounded-2xl bg-ink px-4 text-sm font-bold tracking-wide text-cream min-[480px]:w-auto"
          >
            {listening ? 'Stop' : 'Talk'}
          </button>
        )}
      </div>
      <textarea
        id={fieldId}
        data-testid={fieldId}
        className="mt-2 min-h-24 w-full rounded-2xl bg-card px-3 py-3 text-base shadow-[0_0_0_1.5px_#eadcc6]"
        maxLength={280}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {listening && <p className="mt-1 text-sm font-semibold text-teal">Listening… tap Stop when you are done.</p>}
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-[0_0_0_1.5px_#eadcc6]">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="font-display text-xl leading-tight font-semibold">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  )
}

function PostAndShare({ summaryText }: { summaryText: string }) {
  const { state, dispatch } = useGame()
  const { profile } = useAccount()
  const [posting, setPosting] = useState(false)
  const [postNote, setPostNote] = useState<string | null>(null)
  const [shareNote, setShareNote] = useState<string | null>(null)
  if (!state) return null
  const canPost = !!supabase && !!state.gameId && !!state.mode && state.scoringVersion === 1 && !!profile

  async function post() {
    if (!state || !profile || posting) return
    setPosting(true)
    setPostNote(null)
    try {
      let teamName: string | null = null
      if (state.teamId && supabase) {
        const { data } = await supabase.from('teams').select('name').eq('id', state.teamId).maybeSingle()
        teamName = typeof data?.name === 'string' ? data.name : null
      }
      await submitFinishedGame(state, profile.display_name, teamName)
      dispatch({ type: 'mark-posted' })
    } catch (caught) {
      setPostNote(errorText(caught))
    } finally {
      setPosting(false)
    }
  }

  async function share() {
    const outcome = await shareText(summaryText)
    setShareNote(
      outcome === 'copied'
        ? 'Copied. Paste it wherever you want to share it.'
        : outcome === 'failed'
          ? 'Sharing is not available in this browser.'
          : null,
    )
  }

  return (
    <section className="space-y-3" data-testid="post-and-share">
      <h2 className="font-display text-2xl font-semibold">Post and share</h2>
      {canPost ? (
        state.posted ? (
          <p className="rounded-2xl bg-sand px-3 py-3 font-semibold" data-testid="posted">
            Posted to the leaderboard under your username. Your email is never shown.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Your season is saved to your account either way. Posting puts your net profit and hourly rate on the leaderboard under your
              username. Your email is never shown.
            </p>
            <Button data-testid="post-results" disabled={posting} onClick={() => void post()}>
              {posting ? 'Posting…' : 'Post my results'}
            </Button>
          </>
        )
      ) : (
        <p className="text-sm text-ink-soft">This season stays on this device. It is not posted to a leaderboard.</p>
      )}
      {postNote && <p className="text-sm font-semibold text-[#b42318]">{postNote}</p>}
      <Button variant="secondary" data-testid="share-debrief" onClick={() => void share()}>
        Share my debrief
      </Button>
      <p className="text-xs text-ink-soft">Shares your results and your answers above. Nothing else.</p>
      {shareNote && <p className="text-sm text-ink-soft" role="status">{shareNote}</p>}
    </section>
  )
}
