# Y.E.S. Lemonade Startup

A browser game for teens 13–18. You start with **$20** and a lemonade stand. The question at the end of every day is not “how many cups did I sell?” It is **“Did I actually build a good business?”**

Customers → Sales → Revenue → Costs → Profit → Time → **Earnings per hour**

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

```bash
npm test       # economy and bookkeeping checks
npm run build  # static site in dist/
npm run preview
```

The stand still runs in the browser. Accounts, competitions, and leaderboards use Supabase. Copy `.env.example` to `.env` and set:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Apply `supabase/migrations/20261002120000_accounts_and_leaderboards.sql` in the Supabase SQL editor (or `supabase db push`). In Authentication, allow email/password sign-up. For a local try without confirmation mail, turn off “Confirm email”.

If those env vars are missing, the app shows **Accounts are not configured** and does not crash. A season already stored in `localStorage` (`yes-lemonade-startup-v1`) can be finished on this device. It is not posted to a board.

Local `npm run dev` and `npm run build` use site base `/`. The Pages build sets `VITE_BASE=/yes-lemonade-startup/`.

## Play it from a phone

The project site is [https://yeshq-org.github.io/yes-lemonade-startup/](https://yeshq-org.github.io/yes-lemonade-startup/). That path matches a GitHub project page for this repo, not a user site at the domain root.

The workflow is `.github/workflows/pages.yml`. It runs on a push to `cursor/yes-lemonade-startup-ab25` or `main`, and it can be started by hand. It builds with Vite and deploys with GitHub Actions. The game on this branch can go live **before the pull request is merged**, because the workflow listens to this branch.

GitHub only accepts a Pages deploy from a workflow that exists on the repository’s **default branch**. `main` is still that default, and this workflow is not on `main` yet. To publish without merging:

1. Settings → General → Default branch → `cursor/yes-lemonade-startup-ab25`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**. The site is currently set to deploy the old `gh-pages` branch. Switch that source, or the new workflow will not replace it.
3. Settings → Secrets and variables → Actions → Repository secrets:
   - `VITE_SUPABASE_URL` — the Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the anon public key
   Leave them unset if you only want the accounts-off screen. Do not add the service-role key.
4. Push this branch again, or run the “Deploy GitHub Pages” workflow from the Actions tab.

After the pull request is merged, set the default branch back to `main` if you moved it. Pushes to `main` then publish the same URL.

This agent cannot turn on Pages or write secrets. Those two settings stay with Allan.

## How a season works

1. Sign in with email and a display name. The name is the only public identity. Email is never shown on a board.
2. Choose **Individual** (7 days) or **Team** (30 days), then **Public** or **Private**. A private competition gets a name and a code like `YES-4827`.
3. Each morning you get the weather and a short mentor note.
4. Buy cups, lemons, sugar, and ice in packs. Prices shift a little every day. Cups carry over. Lemons spoil after 3 nights, sugar after 10, and ice is gone every morning.
5. Set the recipe and the price. Every sales day is 8 hours (9:00am to 5:00pm on the sidewalk). That is not a separate choice.
6. Watch the street, then read the receipt. A finished season is posted to that competition’s board.

Leaderboards are separate: Public Individual, Public Team, and each private competition. Rank is **net profit**, highest first. Earnings per hour only breaks a tie. Every board, including a private one, loads at most the **Top 100** (`BOARD_LIMIT` on the query, not only on the screen).

On a team, one person runs the current day. After that day is reported, any teammate can take the next morning. Two people do not edit the same day at once.

The receipt is a real profit-and-loss:

```
REVENUE − COST OF GOODS = GROSS PROFIT − OTHER EXPENSES = NET PROFIT
TIME INVESTED
YOUR ENTREPRENEUR EARNINGS: $X.XX / HOUR
```

Cost of goods is the cost of supplies actually used in cups you sold (oldest purchases first). The stand fee and helper wage are other expenses. Buying inventory is not the same as an expense — until you sell it, ice melts, or lemons and sugar spoil. Melt and spoilage are lost value, not cost of goods.

The season report shows the same chain for the whole run, plus net worth, best and worst days, badges, and three reflection prompts. Startup tiers are Side Hustle, Growing, Scalable, and Boss. They follow earnings per hour and whether the stand is worth more than the $20 you started with. The leaderboard does not use that hourly figure as the rank.

## Design notes

- Phone layout stays inside the screen in portrait (about 375–430px wide): no sideways scroll, 44px-or-taller controls, a shorter sticky header, and price buttons that wrap instead of sliding off the sidewalk. The scene uses the full column width. Desktop still uses the same centered column.
- Career questions can use Talk where the browser has the Web Speech API. iPhone Safari usually has no recognizer, so those players type. If Talk does appear on an iPhone, the mic can stop after one phrase.
- Mobile-first layout, also fine on a desktop browser.
- Original interface and illustrations. The official Y.E.S. logo is in `public/brand/logo.png` and appears on the title screen and in the header.
- Motion is decorative. `prefers-reduced-motion` skips the selling animation.
- Tap targets are large, and money text stays dark on the lemon and cream surfaces.
