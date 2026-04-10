# Fitness Tracker

A mobile-first personal fitness tracker built with React + Vite + Tailwind CSS. All data is stored locally in your browser — no account or backend required.

## Features

### Workout
- Log strength exercises (sets / reps / weight) and cardio (duration / distance)
- Paste workouts directly from Hevy's share format
- Import full Hevy workout history via CSV export
- Exercise history hint — shows your last session's weight when you type an exercise name
- Personal Record (PR) badges on all-time best sets

### Food
- Search a built-in database of 100+ Indian and common Western foods (instant, offline)
- Barcode scanner — point your camera at any packaged food to look it up automatically
- Open Food Facts + USDA FoodData Central API for extended global coverage
- Log by grams or servings; fruits and portioned foods default to natural units (e.g. "1 banana")
- Calorie and macro targets with progress bars
- Recent foods for quick re-logging
- Copy yesterday's meals with one tap
- Save custom foods to your personal database
- Water intake tracker

### Rating
- Rate your day across four categories: Workout Quality, Nutrition, Energy, Sleep (1–10)
- Log body weight for any date (past or present)
- Daily notes / reflections

### Progress
- 30-day charts: calories, workout frequency, rating trends
- Body weight trend graph with 30-day delta
- Per-exercise weight progression chart (last 20 sessions)
- Streak counter, average calories, average rating, best day
- Export all data as JSON

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React 18 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| Storage | localStorage |
| Food APIs | Open Food Facts, USDA FoodData Central |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (localhost)
npm run dev

# Expose on local network (access from iPhone on same WiFi)
npm run dev -- --host

# Production build
npm run build
```

## Notes

- Barcode scanning requires HTTPS — works on the deployed URL, not on the local network dev server over HTTP.
- All data lives in the browser's `localStorage`. Use the **Export** button (download icon in the header) to back up your data as JSON.
- Data is per-device and not synced across browsers.
