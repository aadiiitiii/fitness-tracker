# Fitness Tracker

A mobile-first personal fitness tracker built with React + Vite + Tailwind CSS. Works offline — all data is stored locally in your browser. Create an account to sync across devices.

**Live app:** deployed on Vercel. Install it on your phone via "Add to Home Screen" (PWA).

## Features

### Workout
- Log strength exercises (sets / reps / weight) and cardio (duration / distance)
- Paste workouts directly from Hevy's share format
- Import full Hevy or Strong workout history via CSV export
- Exercise history hint — shows your last session's weight when you type an exercise name
- Personal Record (PR) badges on all-time best sets
- Flexibility / yoga / stretching support

### Food

- Search a built-in database of 400+ foods — Indian (North, South, Gujarati, Maharashtrian, Punjabi), Korean, Thai, Chinese, Japanese, Italian, Mexican, Mediterranean, and Western staples
- Barcode scanner — point your camera at any packaged food to look it up automatically
- Open Food Facts + USDA FoodData Central API for extended global coverage
- Log by grams or servings; fruits and portioned foods default to natural units (e.g. "1 banana")
- Calorie and macro targets with progress bars
- Recent foods for quick re-logging
- Copy yesterday's meals with one tap
- Save custom foods to your personal database
- Water intake tracker (glasses or ml)

### Rating
- Rate your day across four categories: Workout Quality, Nutrition, Energy, Sleep (1–10)
- Log body weight for any date (past or present)
- Daily notes / reflections

### Progress

- 30 / 90 / 365-day period selector
- Charts: calories, workout frequency, rating trends, body weight
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
| Auth & Sync | Supabase (email, Google OAuth) |
| Storage | localStorage (offline-first) + Supabase |
| Food APIs | Open Food Facts, USDA FoodData Central |
| PWA | vite-plugin-pwa + Workbox |
| Tests | Vitest + jsdom (30 unit tests) |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables and fill in your Supabase credentials
cp .env.example .env

# Start dev server
npm run dev

# Expose on local network (access from phone on same WiFi)
npm run dev -- --host

# Run tests
npm test

# Production build
npm run build
```

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app works fully without Supabase — data stays in `localStorage`. Supabase is only needed for cross-device sync and auth.

## Architecture

- **Offline-first**: all reads/writes hit `localStorage` instantly; Supabase syncs in the background
- **Date-keyed storage**: all data organised by `YYYY-MM-DD` strings
- **First-login migration**: existing local data is automatically pushed to Supabase on first sign-in
- **PWA**: service worker caches the app shell and food API responses for offline use

## Notes

- Barcode scanning requires HTTPS — works on the deployed URL, not on a local HTTP dev server.
- Use the **Export** button (download icon in the header) to back up all data as JSON.
- Supabase Row Level Security ensures each user can only read and write their own data.
