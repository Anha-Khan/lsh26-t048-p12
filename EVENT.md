# EVENT — TakaFlow (P12 Personal Ledger Prototype)

## The Event

This repository is a prototype submission for the **P12 problem track** —
turning a personal ledger dataset into a usable financial tool. The public case
(`PUB-01`) provides two months of real-shaped Bangladesh household expenses,
a monthly income, savings pockets, and a DPS (deposit scheme) annual interest
rate. The ask is not a chart dump but a product: someone should be able to sit
down, understand their money in under a minute, and act on it.

## What was built

TakaFlow is that product: a single-page money manager with an editorial
dashboard instead of a grid of numbers.

**The five-minute tour:**

1. **Onboarding** — enter a name and monthly income. Everything else is prefilled
   from the case data and your browser's `localStorage`.
2. **Home** — your income is the headline on a dark green hero. Spent and Remaining
   sit beneath it, followed by a spending mix donut, category amounts, and plain-English
   insights ("Groceries is your largest category…").
3. **Spending** — a natural-language box ("Spent ৳450 at Madchef for lunch today")
   drafts an expense for review. Receipts/screenshots upload the same way.
   The list below is searchable and sortable.
4. **Goals** — butter-yellow sticky notes for each savings pocket (Bike, Laptop…).
   Tap a note to open the target, saved, monthly plan, forecast completion, and a
   DPS projection at the case's interest rate.
5. **Save this month** — in one box, pick a goal and an amount; the money moves out
   of Remaining into the goal's saved balance and the home numbers update at once.
6. **Your Month** — the month summary plus a calendar with per-day spending totals.

## The data

`public/data/P12_personal_ledger_public.json` (`schema_version 2.1`, case
`PUB-01`, `today 2026-04-17`) drives everything: expenses for the current and
previous months, salary, savings pockets with targets and monthly contributions,
and a `9% p.a.` DPS rate. The app never hardcodes numbers it can read from data.

## Decisions worth knowing

- **No red.** Negative states use the same deep-green accent as the rest of the UI.
- **Spent is capped at income.** A household can't out-spend its salary in the
  headline numbers; Remaining never goes negative.
- **Everything is local.** No backend, no accounts, no telemetry. The full ledger
  persists to `localStorage`.
- **Understanding is mock-rules.** Expense parsing and receipt extraction are
  deterministic heuristics so the prototype runs offline and predictably.

## Change log

- Visual pass to sage/forest-green palette with paper-grain background.
- Salary-first home, quick-entry spending, folder-style goals, month calendar.
- Onboarding + profile, logout, and localStorage persistence.
- Negative-amount guards, local-time "yesterday" date fix, income-capped spend.
- Whole-notepad goal folders; save-this-month allocation flow.
- Normalization so persisted goals always render.

## How to evaluate

```bash
npm install
npm run dev        # open the printed URL
npm run build      # must leave dist/client/index.html, dist/server/index.js, dist/.openai/hosting.json
npm run test:sites # 4 tests, all pass
```

Suggested script: onboard with a name and income, add an expense by chat, upload
a receipt, open a goal and set a monthly plan, use Save this month, then open
Your Month and check the calendar and the updated Spent/Remaining.

## Status

Passing build and handoff tests. References in `design-qa.md` and root
`design-qa-*.png` renders.