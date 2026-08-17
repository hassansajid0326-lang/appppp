# FitPulse — Phased Roadmap

## Phase 0 (Week 1) — De-risk before building screens
- Stand up Supabase project + Express skeleton + EAS custom dev client
- Get HealthKit reading real step data on a physical iOS device
- Get Health Connect reading real step data on a physical Android device
- If either of these is harder than expected, that's the moment to descope further — not week 6

## Phase 1 (Month 1-3) — MVP
Everything specified in the PRD/TRD/Frontend/Backend docs in this folder:
Auth & onboarding → Dashboard → Live step tracking → Routine/Schedule → Workout logging → Food logging → Weight tracking → Profile/Settings.
**Goal:** a real person can open the app daily and get value without AI, a trainer, or a wearable.

## Phase 2 (post-launch, scope TBD based on real usage data) — Intelligence layer
- **AI Coach:** chat-based assistant + progress-check summaries, using logged data (routine/workout/food/weight history) as context. **Decided: fully on-device**, no cloud LLM — runs Qwen2.5:0.5b via `llama.rn`, so no per-user API cost and no internet dependency for this feature. Still needs: a local context-assembly layer (recent logs summarized into the prompt), disclaimer/liability review for health-adjacent advice, and honest scoping of what a 0.5B model can actually do well (short, specific, data-grounded answers — not deep multi-factor reasoning). Full spec: `08-ai-coach-ondevice.md`.
- **Auto-generated diet plans:** meal suggestions based on remaining macro budget — natural extension once manual food logging proves people will log at all.
- **Deeper analytics:** correlate sleep/weight/workout-volume trends (needs more data types than MVP captures) — don't build the dashboard for data you're not collecting yet.
- **Wearable heart-rate / recovery metrics:** read from HealthKit/Health Connect sources if a paired device exists (low-effort extension of existing health integration) before considering direct BLE pairing (high-effort, new scope).

## Phase 3 — Gym trainer integration
This is a second product: trainer accounts, availability/scheduling, in-app messaging, payments (Stripe Connect or similar), and almost certainly a lightweight web dashboard for trainers (a trainer isn't going to manage a client roster from a phone-only app). Do not start this until Phase 1 has real retention data — it's a large investment that only makes sense if the core habit loop is already working.

## What Triggers Moving to the Next Phase
- Phase 1 → 2: Day-7 retention and core-loop usage (PRD §5) hit a bar the team is happy with, *and* the team has bandwidth beyond maintaining Phase 1
- Phase 2 → 3: AI Coach is stable and used, *and* there's real user demand signal for trainer access (not just "it was in the original idea")

Resist building Phase 2/3 screens speculatively — every mockup in the Stitch export that isn't in Phase 1 scope should stay exactly as reference art until its phase actually starts.
