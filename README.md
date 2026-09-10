# Ledgerly

Ledgerly is a small, local-first personal finance dashboard. It runs as a static web app with no backend or install step, making it easy to open locally or publish on GitHub Pages.

## Features

- Monthly income, spending, available cash, and savings-rate summary
- Add income and expenses with validation and keyword-based category suggestions
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

The starter workspace includes a few example transactions so the dashboard is immediately useful. Use **Reset workspace** in the sidebar to clear the examples and start from an empty ledger. Data stays in the current browser until the workspace is reset or browser storage is cleared.

## CSV format

Imports expect a header row followed by:

```text
Date,Description,Type,Category,Amount
2026-09-10,Coffee,expense,Food,4.50
```
