-- ============================================================
-- NutriTrack database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor for a new project.
-- Auth is handled by Supabase's built-in `auth.users` table;
-- everything below links back to it via user_id.
-- ============================================================

-- ---------- 1. PROFILES (one-time intake form, editable) ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int not null check (age > 0 and age < 120),
  gender text not null check (gender in ('male', 'female', 'other')),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  activity_level text not null check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric,
  -- calculated + cached so the dashboard doesn't recompute every load
  bmr numeric,
  tdee numeric,
  target_calories numeric,
  target_protein_g numeric,
  target_fiber_g numeric,
  target_carbs_g numeric,
  target_fats_g numeric,
  target_water_ml numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = user_id);

-- ---------- 2. FOOD LOG ENTRIES ----------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  food_name text not null,
  source text not null default 'manual', -- 'manual' | 'usda' | 'off' | 'photo_scan'
  quantity numeric not null default 1,
  quantity_unit text default 'serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  fiber_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fats_g numeric not null default 0,
  meal_type text default 'other', -- breakfast | lunch | dinner | snack | other
  photo_url text,
  created_at timestamptz default now()
);

alter table public.food_logs enable row level security;

create policy "Users can manage own food logs"
  on public.food_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, logged_date);

-- ---------- 3. WEIGHT LOG ----------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique (user_id, logged_date)
);

alter table public.weight_logs enable row level security;

create policy "Users can manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- 4. STRENGTH WORKOUT SESSIONS ----------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  session_type text not null default 'strength', -- 'strength' | 'cardio'
  notes text,
  created_at timestamptz default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users can manage own workout sessions"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Individual strength exercises within a session (supports supersets: same session_id, different order_index)
create table if not exists public.strength_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  order_index int default 0,
  superset_group int, -- exercises sharing a group number are a superset
  sets int not null,
  reps int not null,
  weight_kg numeric,
  rest_seconds int,
  created_at timestamptz default now()
);

alter table public.strength_exercises enable row level security;

create policy "Users can manage own strength exercises"
  on public.strength_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cardio activities within a session
create table if not exists public.cardio_activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null, -- running | cycling | swimming | etc
  duration_minutes numeric not null,
  distance_km numeric,
  intensity text default 'moderate', -- light | moderate | vigorous
  met_value numeric, -- looked up from activity_type + intensity
  calories_burned numeric,
  created_at timestamptz default now()
);

alter table public.cardio_activities enable row level security;

create policy "Users can manage own cardio activities"
  on public.cardio_activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- 5. AI CHAT HISTORY (optional persistence for the assistant panel) ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can manage own chat messages"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- 6. updated_at trigger for profiles ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
