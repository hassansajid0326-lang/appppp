# FitPulse — Product Requirements Document (MVP)

**Status:** Draft for build kickoff
**Team:** 1-2 people
**Timeline:** 1-3 months to MVP launch
**Platforms:** iOS + Android (React Native / Expo)

---

## 1. Problem Statement

People trying to get fit juggle 3-4 disconnected apps: a step counter, a workout log, a food diary, a calendar. None of them talk to each other, so nobody actually looks at all of them daily.

**The job FitPulse does:** give someone one screen that answers "how am I doing today, and what's next" — steps, today's routine, today's workout, today's food/weight log — without needing a wearable, a trainer, or an AI subscription to get value on day one.

Everything in the original vision that isn't that (AI coaching, trainer marketplace, auto-generated diet plans, live biometrics) is real, but it's a *second product* layered on top. Building it simultaneously with a 1-2 person team in 3 months is the most common way solo fitness apps stall — scope creep, not lack of skill.

## 2. MVP Scope Decision

| Feature (original vision) | MVP? | Why |
|---|---|---|
| Dashboard / today's summary | **Yes** | This is the daily-open reason. Everything else feeds it. |
| Live footstep tracking | **Yes** | Phone/OS pedometer (HealthKit / Health Connect) — no hardware, no ML, high daily-use value. |
| Daily routine checklist | **Yes** | Cheap to build (local checklist tied to Supabase), high retention value. |
| Schedule / calendar | **Yes** | Needed to place workouts/meals in time; simple calendar UI, no scheduling engine. |
| Workout logging | **Yes** | Manual log against a seeded exercise library. No AI-generated programs. |
| Food logging (manual) + basic suggestions | **Yes, trimmed** | Manual entry + a simple rule-based calorie/macro target. Not an AI diet planner. |
| Weight tracking | **Yes, trimmed** | Manual entry + trend chart. "Live" weight monitoring isn't a real thing without a smart scale — reframed as periodic logging. |
| Profile & settings | **Yes** | Table stakes. |
| AI Coach / personal assistant (chat) | **No — Phase 2** | Decided: **on-device only, no cloud API** — runs Qwen2.5:0.5b-Instruct (GGUF, via `llama.rn`) locally on the phone. No server LLM cost, no internet dependency, but a small model — scope the feature to short, data-grounded answers, not deep reasoning. Full spec in `08-ai-coach-ondevice.md`. |
| Gym trainer integration | **No — Phase 3** | This is a second, two-sided product (trainer accounts, scheduling, payouts). Out of scope for a 1-2 person team's first release. |
| Auto-generated diet plans | **No — Phase 2** | Depends on the AI Coach infrastructure; manual logging validates whether people will log food at all first. |
| Wearable / live heart-rate | **No — Phase 2+** | Requires BLE device integration or deep HealthKit/Health Connect source handling; only build once step tracking is proven reliable. |

**Rule of thumb used above:** if a feature needs a second external integration (LLM, BLE, payments, a marketplace) beyond the phone's own step-tracking API, it's deferred. MVP only touches Supabase + the OS health APIs.

## 3. Primary Persona

**"Consistent Casey"** — has tried 2-3 fitness apps before, not training for a competition, wants a single daily habit loop: check steps, tick off routine, log a workout or a meal, see the trend line move. Not looking for AI advice yet — looking for **friction-free logging** and a reason to open the app every day.

*(If the team has a second persona in mind — e.g., someone training for a specific event — flag it now; it changes which screens get emphasis. Not assumed here.)*

## 4. MVP Feature Specs

### 4.1 Onboarding & Auth
- Email/password + Apple/Google sign-in (Supabase Auth)
- Minimal profile: name, age, sex (for calorie formula), height, current weight, goal type (lose / maintain / gain), activity level
- OS health-permission prompts (HealthKit / Health Connect) requested here, not buried later
- **Success signal:** >70% of installs complete onboarding

### 4.2 Dashboard (Home)
- Step ring: steps today / daily goal (editable goal, default 10,000)
- Distance + active time (derived from the same health-API read, not separately computed)
- Daily routine checklist (today's items, tap to complete)
- Today's planned workout card (from Schedule) with a "Start" action
- Energy burned: simple estimate (steps × factor + logged workout calories), labeled as an estimate, not clinical
- **Cut from mockup for MVP:** live "Avg BPM" tile — only show if the OS health API actually returns heart-rate data from a connected source (Apple Watch etc.); never build custom HR capture. If no data, hide the tile rather than show a fake number.

### 4.3 Live Step Tracking
- Pulls daily step count, distance, and active minutes from HealthKit (iOS) / Health Connect (Android)
- Weekly bar trend (Mon-Sun)
- Goal ring + "X steps from your target" message
- **Cut from mockup for MVP:** granular "Activity Log" (e.g. "Morning Commute — 22 min") — that requires activity-segment recognition, which the OS APIs don't hand you cleanly. Defer; show daily totals only.

### 4.4 Daily Routine + Schedule
- Calendar view (week strip + day detail), simple month view optional
- Routine items are user-created checklist entries (e.g. "Hydration 3L", "Protein 150g") that can repeat daily/weekly
- Workouts and meals get placed on the calendar as scheduled entries
- No scheduling engine, no reminders/notifications engine required for v1 (local notifications only, if time allows)

### 4.5 Workout Logging
- Seeded exercise library (name, muscle group, equipment) — see Assets doc for sourcing
- Log a session: pick exercises, log sets × reps × weight (or duration for cardio)
- View past sessions, basic PR tracking (heaviest weight per exercise) is a nice-to-have, not required

### 4.6 Food Logging (trimmed diet planner)
- Manual food entry: name, calories, protein/carbs/fat (user enters, or picks from a small seeded common-foods list)
- Daily calorie/macro target computed from onboarding profile via a standard formula (Mifflin-St Jeor + activity multiplier) — a formula, not AI
- Simple "remaining today" view
- **Cut from mockup for MVP:** "Metabolic Window" / AI meal timing recommendations — that's Phase 2 AI Coach territory

### 4.7 Weight Tracking
- Manual weight entry, timestamped
- Trend line chart (7/30/90 day)
- Reframe copy from "live weight loss/gain monitoring" to "weight trend" — sets accurate expectations

### 4.8 Profile & Settings
- Units (metric/imperial), goal editing, notification toggle, data export/delete (needed for App Store / Play Store health-data compliance), account deletion

## 5. Success Metrics (MVP)

- **Activation:** % of signups who complete onboarding + grant health permissions
- **Retention:** Day-7 return rate (opens the app and logs *something* — step check doesn't count, needs an active action)
- **Core loop usage:** average number of logged actions/day/user (routine tick, workout log, food log, weight log combined)
- **Not tracked yet, on purpose:** AI Coach engagement, trainer bookings — features don't exist in MVP

## 6. Explicit Non-Goals for MVP

- No AI-generated anything in MVP (workouts, meals, coaching messages) — AI Coach ships Phase 2, on-device only (see `08-ai-coach-ondevice.md`), no cloud LLM calls anywhere in the product
- No trainer accounts, booking, or payments
- No wearable/BLE device pairing
- No social features (feeds, friends, leaderboards)
- No push-notification engine beyond basic local reminders
