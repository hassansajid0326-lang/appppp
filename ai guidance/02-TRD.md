# FitPulse — Technical Requirements Document (MVP)

## 1. Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native via **Expo** (custom dev client, not Expo Go — needed for health API native modules) | Fastest path to a real iOS+Android build for a small team; EAS Build handles native binaries without owning Xcode/Android Studio config by hand |
| Navigation | React Navigation (native-stack + bottom-tabs) | Matches the 5-tab layout already in the mockups (Home / Workouts / Nutrition / AI Coach-tab-reserved / Profile) |
| State management | **Zustand** for client/UI state + **TanStack Query (React Query)** for server state/caching | Small team = avoid Redux boilerplate. React Query gives you caching, retries, and offline-friendly refetching against Supabase for free |
| Local persistence | AsyncStorage (via Expo) for auth session + lightweight cache; consider WatermelonDB later if true offline logging becomes a requirement (not MVP) | Keep it simple until proven necessary |
| Backend | **Supabase** (Postgres, Auth, Storage, Row-Level Security) + a thin **Node.js/Express** API layer for logic that shouldn't live in the client (calorie/macro calculation, aggregation, future AI orchestration) | Supabase gives you auth/DB/storage on day one; Express layer keeps business logic centralized and gives you a clean seam to add AI Coach later without refactoring the client |
| Health data | `react-native-health` (HealthKit, iOS) + `react-native-health-connect` (Health Connect, Android) | These are the OS-native, no-hardware sources for step count/distance/active time. No custom pedometer logic needed. |
| Charts | `react-native-gifted-charts` or `victory-native` | Needed for step ring, weekly trend, weight trend line |
| Push/local notifications | `expo-notifications` (local only for MVP) | Routine reminders; no server-triggered push required for MVP |
| On-device AI (Phase 2) | `llama.rn` (llama.cpp bindings) running **Qwen2.5-0.5B-Instruct** (GGUF, Q4_K_M, ~398MB) + `react-native-fs` for model download/storage | **Decision: no cloud LLM anywhere in the product.** AI Coach is 100% on-device. No API cost, no internet dependency, no third-party data exposure — tradeoff is a small model's weaker reasoning (see `08-ai-coach-ondevice.md`). |
| Styling | NativeWind (Tailwind for RN) | The Kinetic High-Performance design system (see Assets doc) is Tailwind-token-friendly — colors/spacing/typography map directly to a Tailwind config |
| CI/Build | EAS Build + EAS Submit | One small team, two app stores — automate this early, not at the end |

## 2. Architecture Overview

```
┌────────────────────────────────────┐
│         React Native (Expo)         │
│  Zustand (UI state)                 │
│  React Query (server)               │
│  HealthKit/HealthConnect ◄── reads step/distance/active-time on-device
│                                      │
│  ┌────────────────────────────┐    │
│  │  llama.rn + Qwen2.5-0.5B    │    │  ◄── AI Coach runs fully
│  │  (on-device, no network)    │    │      on-device. No LLM
│  └────────────────────────────┘    │      network call, ever.
└───────────────┬──────────────────────┘
                │ HTTPS (Supabase client + fetch to Express)
                ▼
┌─────────────────────────┐        ┌──────────────────────┐
│  Supabase                │        │  Node/Express API     │
│  - Auth                  │◄──────►│  - calorie/macro calc │
│  - Postgres (RLS)        │        │  - aggregation jobs   │
│  - Storage (avatars etc.)│        │  (no AI logic here —  │
└─────────────────────────┘        │   AI is on-device only)│
                                     └──────────────────────┘
```

**Important architecture note:** earlier drafts of this project considered a hybrid cloud+on-device AI Coach with network-based fallback. **That's been dropped.** AI Coach is on-device only — simpler to build (no dynamic model router, no NetInfo-based branching, no server AI endpoint to secure/monitor/pay for), at the cost of a smaller model's reasoning ceiling. See `08-ai-coach-ondevice.md` for the full implementation spec.

**Direct-to-Supabase vs. via-Express — the rule for MVP:**
- Simple CRUD (create a food log entry, tick a routine item, log a workout set) → **client talks to Supabase directly** using the Supabase JS client + RLS policies. Don't proxy everything through Express; that's wasted work for a 2-person team.
- Anything computed or that will need server-side secrets/logic later (calorie targets, weekly aggregates, and eventually AI Coach calls) → **goes through Express**, even in MVP, so you don't have to migrate client code later when AI Coach needs a real backend brain.

## 3. Health Data Integration — Read This Before Writing Any Screens

This is the single biggest technical-risk item in the whole app. Validate it in week 1, not week 6.

- **iOS:** requires HealthKit entitlement (Apple Developer account, capability added in Xcode/EAS config), `NSHealthShareUsageDescription` in Info.plist, and **cannot be tested in Expo Go** — you need a custom dev client build from day one.
- **Android:** Health Connect is a separate app (Google's), not built into every Android version/OEM out of the box on older devices — the app must gracefully handle "Health Connect not installed" and prompt the user to install it.
- **Background updates:** iOS background refresh for HealthKit is opportunistic, not real-time — "live" step tracking on the dashboard should poll on app-foreground and periodically in background, not promise a truly live socket-style feed. Set that expectation in the UI copy now (see PRD 4.3).
- **Simulators/emulators do not have real step data** — the team needs a physical device (at least one iOS, one Android) to validate this feature at all.

## 4. Data & Calculation Notes

- Calorie/macro targets: Mifflin-St Jeor equation × activity multiplier (standard, well-documented formula) — compute server-side (Express) so the logic lives in one place and can be improved later without an app update.
- Energy burned estimate on dashboard: steps × a rough kcal/step factor + sum of logged workout calories. Label as "estimate" in the UI — don't imply clinical accuracy.

## 5. Non-MVP Technical Bets to Validate Before Committing (Phase 2+)

- **AI Coach:** provider/cost question is resolved — on-device Qwen2.5:0.5b, no per-user API cost. What's still unvalidated: real device performance across low-end Android hardware, and whether a 0.5B model's output quality is good enough to ship without embarrassing the product. Prototype early, on real (not flagship) devices, before committing the UI around it. Health-advice liability/disclaimers still apply regardless of where the model runs — flagged again in `07-risks-and-decisions.md`.
- **Wearable/BLE:** if Phase 2 adds live heart rate, decide whether that's "read whatever HealthKit/Health Connect already has from a paired device" (easy) vs. "pair directly to a BLE heart-rate strap" (hard, new permission model, new failure modes) — these are very different scopes.
- **Trainer marketplace:** payments (Stripe Connect or similar) and two-sided account model — do not start building screens for this until the MVP's core loop is validated with real users.

## 6. Environments

- `dev` / `staging` / `production` Supabase projects (free tier is fine for dev+staging)
- EAS build profiles matching the same three environments
- Secrets (Express API keys, Supabase service role key) — never in the RN client bundle, only in Express server env vars
