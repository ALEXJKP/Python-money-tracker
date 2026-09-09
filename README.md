# Python-money-tracker
poker tracking for revenue
# 🃏 Poker Income Tracker

A simple calendar-based web app for tracking daily poker dealing income — click a day, log your entries, and automatically calculate your cut vs. the house's cut.

## 📖 Overview

This tracker helps you log and visualize earnings from dealing poker. Every day on the calendar can hold one or more entries. Each entry is split into two types:

- **Original Entries** — the initial buy-in a player makes
- **Re-Entries** — any additional buy-in after busting out

Each type has a different revenue split with **Python Poker**:

| Entry Type | Python Poker Gets | You Keep |
|---|---|---|
| Original Entry | 50% | 50% |
| Re-Entry | 70% | 30% |

The app automatically calculates these splits for every day, week, month, and running total.

## ✨ Features

- 📅 **Interactive Calendar** — click any day to open an entry form for that date
- ➕ **Log Entries** — record the number of original entries and re-entries, plus the dollar amount per entry (or a total, depending on how you want to log it)
- 💰 **Automatic Split Calculation** — instantly computes:
  - Total original entry income
  - Total re-entry income
  - Python Poker's cut (50% of originals + 70% of re-entries)
  - Your net take-home
- 📊 **Summaries** — daily, weekly, monthly, and all-time totals
- 🖊️ **Edit/Delete Entries** — update a day's numbers if something changes
- 💾 **Persistent Storage** — saved locally (or to a backend/database, depending on setup) so your history isn't lost
- 📤 **Export** — optional CSV/JSON export for taxes or bookkeeping

## 🧮 How the Math Works

For any given day:

```
Original Income     = (# of Original Entries) × (Entry Amount)
Re-Entry Income      = (# of Re-Entries) × (Entry Amount)

Python Poker Cut     = (Original Income × 0.50) + (Re-Entry Income × 0.70)
Your Net Income      = (Original Income × 0.50) + (Re-Entry Income × 0.30)

Total Day Income     = Original Income + Re-Entry Income
```

**Example:**
- 10 Original Entries @ $50 = $500
- 4 Re-Entries @ $50 = $200

```
Python Poker Cut = ($500 × 0.50) + ($200 × 0.70) = $250 + $140 = $390
Your Net Income  = ($500 × 0.50) + ($200 × 0.30) = $250 + $60  = $310
```

## 🛠️ Tech Stack

> Suggested stack — adjust to your preference.

- **Frontend:** HTML, CSS, JavaScript (or React)
- **Calendar UI:** [FullCalendar.js](https://fullcalendar.io/) or a custom-built grid
- **Data Storage:** Browser `localStorage` for a simple single-user version, or a lightweight backend (Node/Express + SQLite, or Firebase) if you want access from multiple devices
- **Hosting:** GitHub Pages (static version) or a small host like Render/Vercel (if using a backend)

## 📂 Project Structure

```
poker-income-tracker/
├── index.html          # Main calendar page
├── style.css           # Styling
├── script.js           # Calendar logic, entry form, calculations
├── data/
│   └── entries.json    # (if using local JSON storage)
├── assets/             # Icons/images
└── README.md
```

## 🚀 Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/poker-income-tracker.git
   cd poker-income-tracker
   ```
2. Open `index.html` in your browser (or run a local server).
3. Click on a calendar day to add your entries for that date.
4. View your running totals and Python Poker split in the summary panel.

## 🗺️ Roadmap / Ideas

- [ ] Monthly bar chart of net income vs. house cut
- [ ] Multiple game/venue tracking (if you deal at more than one spot)
- [ ] Adjustable split percentages (in case terms change)
- [ ] Mobile-friendly layout
- [ ] Login system for multi-device sync

## 📄 License

MIT — free to use and modify.
