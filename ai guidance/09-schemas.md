# FitPulse — Schemas (Database, Local Cache, API, Types)

Single source of truth for every data shape in the app: Postgres/Supabase tables, the on-device cache used by AI Coach, Express API request/response shapes, and the TypeScript types the frontend should use. `04-backend.md` references this file rather than duplicating it — update schemas here only.

---

## 1. Database Schema (Supabase / Postgres)

All tables use RLS (Row-Level Security) scoped to `auth.uid()`. Enable RLS on every table below — nothing is public by default.

```sql
-- ============================================
-- PROFILES (1:1 with auth.users)
-- ============================================
create table profiles (
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

alter table profiles enable row level security;
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);


-- ============================================
-- ROUTINE ITEMS (user-defined recurring checklist entries)
-- ============================================
create table routine_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  repeat_rule text not null default 'daily' check (repeat_rule in ('daily', 'weekly', 'custom')),
  repeat_days int[],              -- for 'custom': 0=Sun..6=Sat
  active      boolean default true,
  created_at  timestamptz default now()
);

create index idx_routine_items_user on routine_items(user_id);

alter table routine_items enable row level security;
create policy "Users manage own routine items" on routine_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- ROUTINE LOGS (daily completion state per item)
-- ============================================
create table routine_logs (
  id              uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references routine_items(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  completed       boolean default false,
  completed_at    timestamptz,
  unique (routine_item_id, date)
);

create index idx_routine_logs_user_date on routine_logs(user_id, date);

alter table routine_logs enable row level security;
create policy "Users manage own routine logs" on routine_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- EXERCISES (seeded library, not user-owned — read-only to clients)
-- ============================================
create table exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  muscle_group  text,             -- e.g. 'chest', 'back', 'legs', 'core', 'full_body'
  equipment     text,             -- e.g. 'barbell', 'dumbbell', 'bodyweight', 'machine', 'none'
  type          text not null check (type in ('strength', 'cardio', 'mobility')),
  created_at    timestamptz default now()
);

create index idx_exercises_muscle_group on exercises(muscle_group);
create index idx_exercises_type on exercises(type);

alter table exercises enable row level security;
create policy "All authenticated users can read exercises" on exercises
  for select using (auth.role() = 'authenticated');
-- No insert/update/delete policy for clients — seeded via migration/admin only.


-- ============================================
-- WORKOUT SESSIONS
-- ============================================
create table workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scheduled_for date,
  started_at    timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz default now()
);

create index idx_workout_sessions_user_date on workout_sessions(user_id, scheduled_for);

alter table workout_sessions enable row level security;
create policy "Users manage own workout sessions" on workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- WORKOUT SETS (individual logged sets within a session)
-- ============================================
create table workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_id   uuid not null references exercises(id),
  user_id       uuid not null references auth.users(id) on delete cascade,  -- denormalized for RLS simplicity
  set_number    int not null,
  reps          int,
  weight_kg     numeric,
  duration_sec  int,              -- for cardio-type exercises
  order_index   int not null default 0
);

create index idx_workout_sets_session on workout_sets(session_id);

alter table workout_sets enable row level security;
create policy "Users manage own workout sets" on workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- FOOD ENTRIES
-- ============================================
create table food_entries (
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

create index idx_food_entries_user_date on food_entries(user_id, date);

alter table food_entries enable row level security;
create policy "Users manage own food entries" on food_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- WEIGHT ENTRIES
-- ============================================
create table weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  weight_kg   numeric not null check (weight_kg > 0),
  logged_at   timestamptz default now()
);

create index idx_weight_entries_user_date on weight_entries(user_id, logged_at desc);

alter table weight_entries enable row level security;
create policy "Users manage own weight entries" on weight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================
-- SCHEDULE ENTRIES (places workouts/meals/routines on the calendar)
-- ============================================
create table schedule_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('workout', 'meal', 'routine')),
  ref_id      uuid,               -- points to workout_sessions.id, food_entries.id, or routine_items.id depending on type
  date        date not null,
  time        time,
  created_at  timestamptz default now()
);

create index idx_schedule_entries_user_date on schedule_entries(user_id, date);

alter table schedule_entries enable row level security;
create policy "Users manage own schedule entries" on schedule_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Entity Relationship Summary

```
auth.users (Supabase-managed)
  └── profiles (1:1)
  └── routine_items (1:many)
  │     └── routine_logs (1:many, unique per date)
  └── workout_sessions (1:many)
  │     └── workout_sets (1:many) ──► exercises (many:1, read-only seed table)
  └── food_entries (1:many)
  └── weight_entries (1:many)
  └── schedule_entries (1:many) ──► loosely references workout_sessions / food_entries / routine_items via ref_id + type
```

---

## 2. Local On-Device Cache Schema (AI Coach context, offline-read)

Not a database — a small cached JSON blob written to `AsyncStorage` (or `expo-sqlite` if the team prefers structured queries) on every app foreground while online. Read by the on-device AI Coach so it has context even with no connection. This is a **read cache**, not a sync engine — see `08-ai-coach-ondevice.md` §6 for why a full offline-write sync layer isn't needed for this.

```typescript
// AsyncStorage key: "fitpulse:ai_context_cache"
interface AIContextCache {
  generatedAt: string;          // ISO timestamp of last refresh, so the model can be told how stale this is
  avgStepsLast7Days: number;
  workoutCountLast7Days: number;
  currentWeightKg: number | null;
  weightTrendLabel: string;     // e.g. "-1.2kg over 2 weeks", pre-computed, not raw entries
  caloriesLoggedToday: number;
  calorieTargetToday: number;
  routineCompletionRateLast7Days: number; // 0-1
}
```

Keep this cache **small and pre-aggregated** — never dump raw table rows into it. The whole point is the AI Coach gets a few sentences of ready-to-use context, not a data-crunching job.

---

## 3. API Schemas (Express layer — computed endpoints only)

Base path: `/api/v1`. Everything else (CRUD on the tables above) goes directly client → Supabase and doesn't need a schema here — the Postgres schema above is the contract.

### `GET /targets/calorie`

Response:
```typescript
interface CalorieTargetResponse {
  calorieTarget: number;
  macroTargets: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  basedOn: {
    bmr: number;               // Mifflin-St Jeor base
    activityMultiplier: number;
  };
}
```

### `GET /dashboard/summary`

Query params: `date` (ISO date, defaults to today), plus the client sends its own health-API step read since Express has no direct access to on-device HealthKit/Health Connect data.

Request (query/body):
```typescript
interface DashboardSummaryRequest {
  date: string;                 // ISO date
  stepsFromHealthAPI: number;   // client-supplied, read from HealthKit/Health Connect
  distanceKmFromHealthAPI: number;
  activeMinutesFromHealthAPI: number;
}
```

Response:
```typescript
interface DashboardSummaryResponse {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeMinutes: number;
  estimatedCaloriesBurned: number;   // labeled as estimate in UI, per PRD 4.2
  routineCompletion: { completed: number; total: number };
  caloriesRemaining: number;
  todaysWorkout: { sessionId: string; title: string; scheduledTime: string | null } | null;
}
```

### `GET /analytics/weight-trend`

Query params: `range` (`'7d' | '30d' | '90d'`)

Response:
```typescript
interface WeightTrendResponse {
  range: '7d' | '30d' | '90d';
  points: Array<{ date: string; weightKg: number }>;
  changeKg: number;             // net change over the range
  trendDirection: 'up' | 'down' | 'flat';
}
```

---

## 4. TypeScript Types (frontend — mirrors DB schema)

Keep these in a shared `types/` folder so Supabase queries and API responses are typed consistently across the app.

```typescript
export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  sex: 'male' | 'female' | 'other' | null;
  heightCm: number | null;
  goalType: 'lose' | 'maintain' | 'gain' | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  units: 'metric' | 'imperial';
  dailyStepGoal: number;
}

export interface RoutineItem {
  id: string;
  userId: string;
  title: string;
  repeatRule: 'daily' | 'weekly' | 'custom';
  repeatDays: number[] | null;
  active: boolean;
}

export interface RoutineLog {
  id: string;
  routineItemId: string;
  date: string;
  completed: boolean;
  completedAt: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  type: 'strength' | 'cardio' | 'mobility';
}

export interface WorkoutSession {
  id: string;
  userId: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  orderIndex: number;
}

export interface FoodEntry {
  id: string;
  userId: string;
  date: string;
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  loggedAt: string;
}

export interface ScheduleEntry {
  id: string;
  userId: string;
  type: 'workout' | 'meal' | 'routine';
  refId: string | null;
  date: string;
  time: string | null;
}
```

---

## 5. Notes

- `workout_sets.user_id` is denormalized (also derivable via `session_id → workout_sessions.user_id`) purely so RLS policies stay simple (one `auth.uid()` check per table, no joins in the policy). Keep it in sync at write time — set it from the session's `user_id`, don't let the client supply it independently.
- `exercises` is the only table without a user-scoped RLS write policy — it's shared seed content. If the team later wants user-submitted custom exercises, that's a schema change (likely a separate `custom_exercises` table with `user_id`), not a modification to this shared table.
- All `date` fields are `date` (no time component) by design — daily-granularity features (routine, food, schedule) shouldn't accumulate timezone bugs from `timestamptz` comparisons. `logged_at`/`created_at` fields are `timestamptz` since they're event timestamps, not day buckets.
