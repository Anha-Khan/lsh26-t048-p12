# P12 requirement audit

Checked against `idea.md` on 30 August 2026.

## Required items

| Requirement | Status | Repository evidence |
| --- | --- | --- |
| Salary and expense entry | Pass | First-run salary, inline salary editing, quick text entry, editable review, expense edit/delete, and salary-bound validation are implemented in `src/App.jsx`. |
| Receipt or screenshot workflow | Partial | Image upload, preview, editable shop/date/category/amount, and an explicitly blank uncertain amount work. The current extraction is a mock and does not yet read the uploaded image through a real vision service. |
| Monthly dashboard | Pass | Salary, spent, remaining, category chart, largest transactions, sortable/searchable spending, calendar, and same-period month comparison are derived from the ledger. |
| Forecast and written insights | Pass | Historical-remainder or daily-rate fallback forecasts expected remaining spend and signed month-end balance. Three category-and-amount observations are generated whenever spending exists. |
| Savings pockets and DPS | Pass | Goal name, item, target, editable repeated contribution, saved total, forecast-affordable amount, forecast completion, stated annual DPS rate, monthly interest rule, deposits, interest, and projected value are present. |

## Important remaining scoring risk

The only required-item gap is real receipt OCR. `src/lib/extractExpense.js` expects `/api/extract-expense`, but the current worker does not provide that endpoint and `src/App.jsx` uses a deterministic mock receipt result. A deployed vision endpoint and API secret are needed before claiming full compliance.

## Optional bonuses

- Immediate pocket-date updates after contribution changes: implemented.
- Recurring-expense detection across two months: not implemented.
- Category-cut what-if control affecting every goal date: not implemented.

## Verification

- `npm run build`: pass.
- `npm run test:sites`: 4/4 pass.
- `git diff --check`: pass.

