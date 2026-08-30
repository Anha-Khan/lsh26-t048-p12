# TakaFlow — Personal Expense Prototype

A small, friendly money manager prototype built from the **P12 personal ledger**
public case data. It turns a real monthly ledger into a readable spending
dashboard: a salary-first home, a natural-language quick entry, receipt review,
folder-style savings goals, and a Your Month calendar view — all without leaving
a single screen feeling like a spreadsheet.

Built with React 19 + Vite. Runs locally, and ships to Openai Sites as a
static client with a Workers-style SPA fallback.

## Features

- **First-run onboarding** — tells us your name and monthly income. Saved on-device.
- **Salary-first home** — the headline number is your income; Spent and Remaining sit under it on a dark money-green hero. Spent never shows more than your income.
- **Natural-language entry** — "Spent ৳450 at Madchef for lunch today" parses shop, amount, category, and date (including *yesterday*) into a reviewable draft.
- **Receipt / screenshot review** — upload an image, check the suggested fields, confirm, save.
- **Savings goals as sticky-note folders** — tap a note to open target, saved, monthly plan, forecast, and a DPS projection at the case interest rate.
- **Save this month** — allocate money from Remaining into a goal in one box; the ledger, Spent, and Remaining update immediately.
- **Your Month** — month summary and a calendar with spending totals per day.
- **Always local** — the ledger persists to `localStorage` (salary, expenses, goals). No account, no server.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Open the printed URL. The app seeds itself with the public P12 case data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build `dist/client` and prepare the Sites bundle |
| `npm run preview` | Preview the built client |
| `npm run test:sites` | Run the 4 Sites handoff tests |

The Sites handoff contract: after `npm run build`, these must exist —
`dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`.

## Project structure

```
index.html                 Vite entry
src/
  main.jsx                 React root
  App.jsx                  all app logic + screens
  styles.css               full stylesheet (palette, layout, responsive)
  lib/extractExpense.js    (optional) AI extraction endpoint client
public/
  data/P12_personal_ledger_public.json   problem case data (PUB-01)
worker/index.js            SPA-fallback worker for static hosting
scripts/prepare-sites-build.mjs          packs dist for Sites
tests/sites-worker.test.mjs              verifies the build contract
```

## Case data

`public/data/P12_personal_ledger_public.json` follows the P12 schema
(`schema_version 2.1`) with a public case (`PUB-01`): 2 months of expenses, a
salary, savings pockets, and a DPS annual rate. The app reads expenses dated in
`months.this` for the current month and uses `months.last` for comparison and
projection.

## Design notes

- Palette: sage page background, deep forest-green accent, butter-yellow goals, lavender tertiary.
- Paper-noise grain overlays the whole page for warmth; dark green surfaces use off-white type.
- All spending colors are the dark-green accent; there is no red.
- `design-qa.md` records the visual/flow QA pass; rendered references are in the repository root (`design-qa-*.png`).

## Hosting

The app is static and hostable anywhere. To hand to Sites, keep
`worker/index.js`, `scripts/prepare-sites-build.mjs`, `tests/sites-worker.test.mjs`,
and `.openai/hosting.json` intact, then `npm run build`.

## Environment

Optional `.env` (git-ignored): `GEMINI_API_KEY` is only used if you wire
`src/lib/extractExpense.js` to a real backend. The prototype runs fully offline
with built-in mock understanding of expenses and receipts.