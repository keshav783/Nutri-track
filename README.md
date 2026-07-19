# NutriTrack — Phase 1 (MVP)

Personal nutrition and fitness tracker. This is **Phase 1**: auth, intake form,
manual + searched food logging, and the dashboard — as requested, built in that order.
Phase 2 (photo food scanning, AI chat assistant, workout tracking, suggestions engine)
is scoped below and not yet built.

## What's included

- **Auth** — email/password + Google sign-in via Supabase Auth
- **Intake form** — one-time setup (editable later), calculates BMR (Mifflin-St Jeor),
  TDEE, and daily targets for calories/protein/fiber/carbs/fats/water, showing the math
- **Food logging** — search via Open Food Facts (free, no API key) or manual entry
- **Dashboard** — daily totals vs. targets as progress bars, entry list with delete,
  weight logging, 30-day weight trend chart, 30-day calorie trend chart
- **Database schema** (`supabase/schema.sql`) — includes tables for the Phase 2 features
  (workouts, cardio, chat history) so nothing needs to be rebuilt later, with row-level
  security so each user only ever sees their own data

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a free project, and note your
Project URL and anon/public API key (Project Settings → API).

### 2. Run the schema
In the Supabase dashboard, open **SQL Editor**, paste the contents of
`supabase/schema.sql`, and run it. This creates all tables and security policies.

### 3. Enable Google sign-in (optional)
In **Authentication → Providers → Google**, enable it and add your OAuth client
ID/secret from Google Cloud Console. Skip this if you only want email/password.

### 4. Configure environment variables
```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.

### 5. Install and run
```bash
npm install
npm run dev
```
Open the printed local URL (default `http://localhost:5173`). On mobile, run
`npm run build` and deploy the `dist/` folder (e.g. to Vercel or Netlify) — it's
already responsive.

## How the numbers are calculated

- **BMR** — Mifflin-St Jeor equation
- **TDEE** — BMR × activity multiplier (1.2 sedentary → 1.9 very active)
- **Calorie target** — TDEE minus 20% (lose), TDEE plus 15% (gain), or TDEE (maintain)
- **Protein** — 1.8g/kg bodyweight (2.0g/kg if goal is gain)
- **Fat** — 25% of target calories
- **Fiber** — 14g per 1000 kcal (standard guideline ratio)
- **Carbs** — remaining calories after protein and fat

All formulas live in `src/lib/calculations.js`, isolated from the UI so they're easy
to audit or adjust.

## Phase 2 — not yet built

These need design decisions from you before building, since they involve either a
paid API or an architectural choice:

1. **Photo food scanner** — upload a meal photo, get an AI-estimated calorie/macro
   breakdown to confirm/edit. Needs a vision-capable model API call (e.g. the
   Anthropic API) from a small backend function (can't hold an API key safely in
   the browser). I'd add a Supabase Edge Function for this.
2. **AI chat assistant** — nutrition Q&A using your profile/logs as context. Same
   backend requirement as above (Edge Function calling an LLM API with your data
   injected into the prompt).
3. **Workout tracking** — strength sets/reps/weight with supersets, cardio with
   MET-based calorie burn (formula already in `calculations.js` as
   `estimateCaloriesBurned`), and progress charts (e.g. bench press over time).
   Schema is already in place (`workout_sessions`, `strength_exercises`,
   `cardio_activities`).
4. **Suggestions engine** — "you need 20g more protein, try X" and weekly
   over/under-target summaries, computed from existing log data.
5. **Exercise suggestions** — workout recommendations by goal/time/equipment/
   undertrained muscle groups.

Say the word and I'll build any of these next — the schema and calculation
utilities are already there to support them.
