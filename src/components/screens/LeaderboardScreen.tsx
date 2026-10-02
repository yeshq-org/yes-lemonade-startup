import { useEffect, useState } from 'react'
import { errorText, listMyPrivateCompetitions, loadBoard, type CompetitionRow, type ScoreRow } from '../../auth/api'
import { useAccount } from '../../auth/AccountContext'
import { PUBLIC_INDIVIDUAL_ID, PUBLIC_TEAM_ID, topBoard } from '../../game/leaderboard'
import { formatHourly, formatMoney } from '../../game/money'
import { accountsConfigured } from '../../lib/supabase'
import { Button, Shell, useFocusHeading } from '../ui'

type BoardKey = 'individual' | 'team' | string

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const heading = useFocusHeading()
  const { profile } = useAccount()
  const [board, setBoard] = useState<BoardKey>('individual')
  const [privateBoards, setPrivateBoards] = useState<CompetitionRow[]>([])
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountsConfigured() || !profile) return
    listMyPrivateCompetitions()
      .then(setPrivateBoards)
      .catch((caught) => setError(errorText(caught)))
  }, [profile])

  useEffect(() => {
    if (!accountsConfigured() || !profile) return
    const competitionId =
      board === 'individual' ? PUBLIC_INDIVIDUAL_ID : board === 'team' ? PUBLIC_TEAM_ID : board
    loadBoard(competitionId)
      .then((loaded) =>
        setRows(
          topBoard(
            loaded.map((row) => ({
              ...row,
              netCents: row.net_cents,
              earningsPerHourCents: row.earnings_per_hour_cents,
            })),
          ),
        ),
      )
      .catch((caught) => setError(errorText(caught)))
  }, [board, profile])

  return (
    <Shell>
      <main className="flex flex-1 flex-col px-5 pt-8 pb-8">
        <button type="button" className="min-h-12 self-start font-semibold text-teal" onClick={onBack}>
          Back
        </button>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-4xl font-semibold outline-none">
          Leaderboard
        </h1>
        <p className="mt-2 font-display text-2xl font-semibold">Top 100</p>
        <p className="mt-1 text-ink-soft">
          Ranked by net profit. Earnings per hour only breaks a tie. Public and private boards both stop at 100. Names only — never
          emails.
        </p>
        {!accountsConfigured() && (
          <p className="mt-4 font-semibold">Accounts are not configured, so there is no shared board yet.</p>
        )}
        {accountsConfigured() && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <BoardTab active={board === 'individual'} onClick={() => setBoard('individual')}>
                Public Individual
              </BoardTab>
              <BoardTab active={board === 'team'} onClick={() => setBoard('team')}>
                Public Team
              </BoardTab>
              {privateBoards.map((item) => (
                <BoardTab key={item.id} active={board === item.id} onClick={() => setBoard(item.id)}>
                  {item.competition_name}
                </BoardTab>
              ))}
            </div>
            {error && <p className="mt-4 text-sm font-semibold text-coral">{error}</p>}
            <ol className="mt-4 space-y-2" data-testid="leaderboard-rows">
              {rows.length === 0 && <li className="text-ink-soft">No finished seasons on this board yet.</li>}
              {rows.map((row, index) => (
                <li key={row.id} className="rounded-2xl bg-card px-3 py-3 shadow-[0_0_0_1.5px_#eadcc6]">
                  <p className="font-semibold">
                    {index + 1}. {row.display_name}
                    {row.team_name ? ` · ${row.team_name}` : ''}
                  </p>
                  <p className="text-sm text-ink-soft">
                    Net profit {formatMoney(row.net_cents)} · {formatHourly(row.earnings_per_hour_cents)}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
        <div className="mt-6">
          <Button variant="ghost" onClick={onBack}>
            Back to the stand
          </Button>
        </div>
      </main>
    </Shell>
  )
}

function BoardTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'min-h-11 rounded-full bg-ink px-3 text-sm font-bold text-cream' : 'min-h-11 rounded-full bg-sand px-3 text-sm font-bold'}
    >
      {children}
    </button>
  )
}
