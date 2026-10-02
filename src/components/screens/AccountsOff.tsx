import { Button, Shell, useFocusHeading } from '../ui'

export function AccountsOff({
  onFinishLegacy,
  onLeaderboard,
}: {
  onFinishLegacy: (() => void) | null
  onLeaderboard: () => void
}) {
  const heading = useFocusHeading()
  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-10 pb-8">
        <div className="flex items-center justify-between">
          <img src="/brand/logo.png" alt="Y.E.S. Youth Entrepreneur Startup" className="h-auto w-36" />
          <button type="button" data-testid="leaderboard-nav" className="min-h-12 font-bold tracking-[0.08em] text-ink" onClick={onLeaderboard}>
            LEADERBOARD
          </button>
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-6 font-display text-4xl leading-tight font-semibold outline-none">
          Accounts are not configured
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Leaderboards and new logged-in seasons need a Supabase project. Add <span className="font-semibold">VITE_SUPABASE_URL</span> and{' '}
          <span className="font-semibold">VITE_SUPABASE_ANON_KEY</span>, then restart the app.
        </p>
        <p className="mt-3 text-ink-soft">Until then, a season already saved on this device can be finished here. It is not posted to a board.</p>
        {onFinishLegacy && (
          <div className="mt-8">
            <Button data-testid="finish-local-season" onClick={onFinishLegacy}>
              Finish the saved season
            </Button>
          </div>
        )}
      </main>
    </Shell>
  )
}
