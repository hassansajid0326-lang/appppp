# FitPulse — Frontend Documentation (MVP)

Based on the existing Stitch design export (`kinetic_high_performance` design system + 9 generated screens). This doc scopes which of those screens/elements ship in MVP vs. get trimmed, and defines navigation + state.

## 1. Design System (already defined — see `DESIGN.md` / Assets doc)

- **Name:** Kinetic High-Performance
- **Feel:** Dark Mode Minimalism + Glassmorphism, "cockpit" data focus
- **Fonts:** Oswald (headings/buttons, uppercase for short fragments), Inter (body), JetBrains Mono (numeric metrics)
- **Primary accent:** Electric Lime (`#c3f400` / `#abd600` tint) on near-black surfaces (`#051424` background)
- **Shape:** soft rounding, 0.5rem buttons/inputs, 0.75rem cards
- **Depth:** translucent slate cards with 16px backdrop-blur + 1px border, not drop shadows
- This maps cleanly to a NativeWind (Tailwind) config — port the DESIGN.md color/typography/spacing tokens directly into `tailwind.config.js`.

## 2. Navigation Structure

Bottom tab bar (matches mockups): **Home · Workouts · Nutrition · Profile**

*(Mockups show a 5th "AI Coach" tab — for MVP, either drop it entirely or keep the tab slot showing a simple "Coming Soon" placeholder screen so the nav doesn't need restructuring when Phase 2 ships. Team decision — doesn't block MVP either way.)*

```
Root (auth-gated)
├── Auth Stack (pre-login)
│   ├── Sign In
│   ├── Sign Up
│   └── Onboarding (profile setup + health permissions)
└── Main Tabs (post-login)
    ├── Home (stack)
    │   ├── Dashboard
    │   └── Live Step Detail (from mockup: live_footstep_tracking)
    ├── Workouts (stack)
    │   ├── Workout List / Library
    │   ├── Exercise Detail
    │   └── Log Session
    ├── Schedule (accessible from Home or its own tab — team call)
    │   └── Calendar (week/day view)
    ├── Nutrition (stack)
    │   ├── Food Log (Today)
    │   ├── Add Food Entry
    │   └── Weight Log + Trend
    └── Profile (stack)
        ├── Profile Overview
        └── Settings
```

## 3. Screen-by-Screen (MVP scope only)

### Dashboard (`dashboard/` in export)
**Ship as-is, minus:** the Avg BPM tile (conditional — only render if health API returns HR data), and the "Today's Protocol" card should link to a *user-scheduled* workout, not an AI-suggested one.
- Step ring (steps/goal)
- Distance + active time
- Energy burned (labeled "estimate")
- Daily routine checklist (tap to complete)
- Today's scheduled workout card → "Start" → Log Session screen

### Live Step Detail (`live_footstep_tracking/` in export)
**Ship, minus:** the granular "Activity Log" list (Morning Commute, Active Burst, etc.) — that needs activity-segment recognition not available from a simple pedometer read. Replace with just the ring + stat tiles + weekly trend bar chart.

### Workouts (`workouts/` in export)
Exercise library browse + Log Session flow. Content-seeding approach in Assets doc.

### Schedule / Calendar (`schedule_calendar_1`, `schedule_calendar_2` in export)
Two variants exist in the export — pick one as primary (week-strip + day detail is the simpler build) and treat the other as a later polish pass, not two screens to maintain in parallel.

### Diet Planner (`diet_planner/` in export) → rebuilt as **Food Log**
**Trim significantly:** the mockup implies an AI-driven diet planner. MVP version is: today's calorie/macro target (computed, not AI-suggested) + manual food entries + remaining budget. No meal-plan generation UI in MVP.

### Progress Analytics (`progress_analytics/` in export) → rebuilt as **Weight Trend**
**Trim to:** weight entry list + trend line chart (7/30/90 day toggle). Defer broader "analytics" (correlations, multiple metrics dashboards) to Phase 2.

### Profile / Settings (`profile_settings/` in export)
Ship close to as-designed — units, goals, notifications, account/data management (required for store compliance).

### AI Coach (`ai_coach/` in export)
**Do not build for MVP.** Keep the visual design on file — it's good reference for Phase 2. When it does get built (Phase 2), note it's **on-device only, no cloud LLM call** — see `08-ai-coach-ondevice.md` for the implementation spec, download UX, and prompt design. Drop the "metabolic window" / HRV-driven copy from the mockup for v1 — that implies data (recovery/HRV) the app doesn't collect; keep Phase 2 copy grounded in what's actually logged (steps, workouts, food, weight).

## 4. State Management

- **Zustand store:** current user session, onboarding profile draft, UI-only state (active tab, modal visibility)
- **React Query:** every server-backed read/write — dashboard aggregates, routine items, workout sessions, food entries, weight entries. Query keys scoped by user + date where relevant (e.g. `['routine', userId, dateISO]`) so daily views invalidate cleanly at midnight.
- **Health data:** read via native module hooks (not stored in Supabase in real-time) — fetch on screen focus + app foreground, cache briefly in Zustand/React Query, don't over-engineer a sync layer for MVP.

## 5. Component Notes

- Glass card component (blur + border + rounded-xl) — build once, reuse everywhere; it's the dominant visual pattern across every screen in the export.
- Progress ring component — reused for steps (Dashboard, Live Step Detail) and could be reused for calorie-remaining (Food Log) if the team wants visual consistency.
- Data-metric text style (JetBrains Mono) — make this a typography variant/component from day one so numeric displays stay consistent without copy-pasting font styles.
