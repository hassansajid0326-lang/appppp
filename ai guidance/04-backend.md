# FitPulse — Backend Documentation (MVP)

Supabase (Postgres + Auth + Storage, Row-Level Security) + a thin Node.js/Express layer for computed logic. See TRD §2 for the direct-to-Supabase vs. via-Express rule.

## 1. Auth

- Supabase Auth: email/password + Apple Sign-In (required by App Store if you offer any social login) + Google Sign-In
- `auth.users` (Supabase-managed) is the source of truth for identity; app-specific profile data lives in `profiles`, keyed by `auth.users.id`
- RLS: every table below scoped so a user can only read/write their own rows (`user_id = auth.uid()`)

## 2. Core Data Models (Postgres)

Full DDL (with RLS policies, indexes, constraints) moved to **`09-schemas.md`** — that's now the single source of truth for the database schema, the local on-device cache schema, and the API/TypeScript type contracts. This doc references it rather than duplicating it, so the two don't drift out of sync.

Tables: `profiles`, `routine_items`, `routine_logs`, `exercises`, `workout_sessions`, `workout_sets`, `food_entries`, `weight_entries`, `schedule_entries` — all RLS-scoped to `auth.uid()` except `exercises`, which is shared read-only seed content.

## 3. Express API (computed / centralized logic only)

Base path suggestion: `/api/v1`

| Endpoint | Method | Purpose |
|---|---|---|
| `/targets/calorie` | GET | Computes daily calorie + macro targets from `profiles` (Mifflin-St Jeor + activity multiplier). Client calls this once/day and caches. |
| `/dashboard/summary` | GET | Aggregates today's steps (client sends the health-API read), routine completion %, calories remaining, energy-burned estimate — one call to populate the whole Dashboard instead of 4 client round-trips. |
| `/analytics/weight-trend` | GET | Returns weight entries bucketed for 7/30/90-day chart, so the client isn't doing date-bucketing logic itself. |
| `/health/webhook` *(optional, Phase 2 candidate)* | POST | Reserved seam if the team later wants server-side receipt of health data instead of purely on-device reads. Not needed for MVP — noted here so the route naming doesn't collide later. |

Request/response shapes for each endpoint above: `09-schemas.md` §3.

**No AI/LLM endpoint.** Earlier drafts had a `/api/v1/ai/chat` endpoint planned for a cloud-backed AI Coach — **removed.** AI Coach runs fully on-device (`llama.rn` + Qwen2.5:0.5b, see `08-ai-coach-ondevice.md`) and never calls this backend for inference. The only thing Express/Supabase needs to support for AI Coach is exposing the user's own logged data for the on-device context-assembly step — which existing endpoints/tables already cover, nothing new to build here.

Everything else (routine CRUD, workout logging, food entry CRUD) — **client talks directly to Supabase** via the JS client + RLS. Don't build Express CRUD wrappers for MVP; that's duplicate work with no benefit yet.

## 4. Storage

- Supabase Storage bucket for profile avatars only in MVP. No workout media, no food photos — those are real features but not MVP (adds moderation, storage-cost, and upload-UI scope for limited payoff at launch).

## 5. Seed Data

- `exercises` table needs to be seeded before Workouts is usable at all — see Assets doc for sourcing options (this is a launch blocker, not a nice-to-have).

## 6. Compliance Notes (don't skip)

- Both app stores require a clear privacy policy and in-app data deletion flow when you touch HealthKit/Health Connect data — build the "delete my account & data" flow in Settings now, not as a submission-rejection fire drill later.
- Apple App Review scrutinizes HealthKit usage strings — the `NSHealthShareUsageDescription` copy should plainly state what's read and why.
