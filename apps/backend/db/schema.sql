-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (1:1 with auth.users)
-- ============================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  age             int check (age > 0 and age < 120),
  sex             text check (sex in ('male', 'female', 'other')),
  height_cm       numeric check (height_cm > 0),
  goal_type       text check (goal_type in ('lose', 'maintain', 'gain')),
  activity_level  text check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  units           text default 'metric' check (units in ('metric', 'imperial')),
  daily_step_goal int default 10000,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);


-- ============================================
-- ROUTINE ITEMS (user-defined recurring checklist entries)
-- ============================================
create table public.routine_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  repeat_rule text not null default 'daily' check (repeat_rule in ('daily', 'weekly', 'custom')),
  repeat_days int[],              -- for 'custom': 0=Sun..6=Sat
  active      boolean default true,
  created_at  timestamptz default now()
);

create index idx_routine_items_user on public.routine_items(user_id);

alter table public.routine_items enable row level security;
create policy "Users manage own routine items" on public.routine_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- ROUTINE LOGS (daily completion state per item)
-- ============================================
create table public.routine_logs (
  id              uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references public.routine_items(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  completed       boolean default false,
  completed_at    timestamptz,
  unique (routine_item_id, date)
);

create index idx_routine_logs_user_date on public.routine_logs(user_id, date);

alter table public.routine_logs enable row level security;
create policy "Users manage own routine logs" on public.routine_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- EXERCISES (seeded library, not user-owned — read-only to clients)
-- ============================================
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  muscle_group  text,             -- e.g. 'chest', 'back', 'legs', 'core', 'full_body'
  equipment     text,             -- e.g. 'barbell', 'dumbbell', 'bodyweight', 'machine', 'none'
  type          text not null check (type in ('strength', 'cardio', 'mobility')),
  created_at    timestamptz default now()
);

create index idx_exercises_muscle_group on public.exercises(muscle_group);
create index idx_exercises_type on public.exercises(type);

alter table public.exercises enable row level security;
create policy "All authenticated users can read exercises" on public.exercises
  for select using (auth.role() = 'authenticated');


-- ============================================
-- WORKOUT SESSIONS
-- ============================================
create table public.workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scheduled_for date,
  started_at    timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz default now()
);

create index idx_workout_sessions_user_date on public.workout_sessions(user_id, scheduled_for);

alter table public.workout_sessions enable row level security;
create policy "Users manage own workout sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- WORKOUT SETS (individual logged sets within a session)
-- ============================================
create table public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id),
  user_id       uuid not null references auth.users(id) on delete cascade,  -- denormalized for RLS simplicity
  set_number    int not null,
  reps          int,
  weight_kg     numeric,
  duration_sec  int,              -- for cardio-type exercises
  order_index   int not null default 0
);

create index idx_workout_sets_session on public.workout_sets(session_id);

alter table public.workout_sets enable row level security;
create policy "Users manage own workout sets" on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- FOOD ENTRIES
-- ============================================
create table public.food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  name        text not null,
  calories    numeric check (calories >= 0),
  protein_g   numeric check (protein_g >= 0),
  carbs_g     numeric check (carbs_g >= 0),
  fat_g       numeric check (fat_g >= 0),
  logged_at   timestamptz default now()
);

create index idx_food_entries_user_date on public.food_entries(user_id, date);

alter table public.food_entries enable row level security;
create policy "Users manage own food entries" on public.food_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- WEIGHT ENTRIES
-- ============================================
create table public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  weight_kg   numeric not null check (weight_kg > 0),
  logged_at   timestamptz default now()
);

create index idx_weight_entries_user_date on public.weight_entries(user_id, logged_at desc);

alter table public.weight_entries enable row level security;
create policy "Users manage own weight entries" on public.weight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- SCHEDULE ENTRIES (places workouts/meals/routines on the calendar)
-- ============================================
create table public.schedule_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('workout', 'meal', 'routine')),
  ref_id      uuid,               -- points to workout_sessions.id, food_entries.id, or routine_items.id depending on type
  date        date not null,
  time        time,
  created_at  timestamptz default now()
);

create index idx_schedule_entries_user_date on public.schedule_entries(user_id, date);

alter table public.schedule_entries enable row level security;
create policy "Users manage own schedule entries" on public.schedule_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- OTP VERIFICATIONS (Used for signup & forgot-password verification)
-- ============================================
create table public.otp_verifications (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  otp         text not null,
  purpose     text not null check (purpose in ('signup', 'forgot_password')),
  verified    boolean default false,
  created_at  timestamptz default now(),
  expires_at  timestamptz not null
);

-- Enable RLS (Service role will bypass automatically)
alter table public.otp_verifications enable row level security;

