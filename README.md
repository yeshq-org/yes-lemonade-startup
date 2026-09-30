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

The game is a client-side React app. Progress is saved in `localStorage` under `yes-lemonade-startup-v1`. There is no account and no server.

## How a season works

1. Choose a **7, 14, or 30** day season.
2. Each morning you get the weather and a short mentor note.
3. Buy cups, lemons, sugar, and ice in packs. Prices shift a little every day. Cups carry over. Lemons spoil after 3 nights, sugar after 10, and ice is gone every morning. The game does not warn about that until the stock is already gone.
4. Set the recipe, the price, and how many hours you stay open. Longer than 8 hours hires a helper.
5. Watch the street, then read the receipt.

The receipt is a real profit-and-loss:

```
REVENUE − COST OF GOODS = GROSS PROFIT − OTHER EXPENSES = NET PROFIT
TIME INVESTED
YOUR ENTREPRENEUR EARNINGS: $X.XX / HOUR
```

Cost of goods is the cost of supplies actually used in cups you sold (oldest purchases first). The stand fee and helper wage are other expenses. Buying inventory is not the same as an expense — until you sell it, ice melts, or lemons and sugar spoil. Melt and spoilage are lost value, not cost of goods.

The season report shows the same chain for the whole run, plus net worth, best and worst days, badges, and three reflection prompts. Startup tiers are Side Hustle, Growing, Scalable, and Boss. They follow earnings per hour and whether the stand is worth more than the $20 you started with.

## Design notes

- Mobile-first layout, also fine on a desktop browser.
- Original interface and illustrations. The official Y.E.S. logo is in `public/brand/logo.png` and appears on the title screen and in the header.
- Motion is decorative. `prefers-reduced-motion` skips the selling animation.
- Tap targets are large, and money text stays dark on the lemon and cream surfaces.
