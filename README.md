# Ledgerly

Ledgerly is a small, local-first personal finance dashboard. It runs as a static web app with no backend or install step, making it easy to open locally or publish on GitHub Pages.

## Features

- Monthly income, spending, available cash, and savings-rate summary
- Add income and expenses with validation and keyword-based category suggestions
- Autosaves unfinished transaction and bill forms as browser drafts
- Separate input log showing each saved transaction and recurring bill
- Category budgets with progress meters and over-budget alerts
- Recurring bill list with due dates
- Seven-day cash-flow chart
- CSV import and export
- Responsive layout with useful empty states
- Persistent browser storage through `localStorage`

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static file server:

```bash
python -m http.server
```

The dashboard starts with an empty ledger. Use **Reset workspace** in the sidebar to clear your entries and budgets. Data stays in the current browser until the workspace is reset or browser storage is cleared.

## CSV format

Imports expect a header row followed by:

```text
Date,Description,Type,Category,Amount
2026-09-10,Coffee,expense,Food,4.50
```
