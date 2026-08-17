# FitPulse — Assets Documentation (MVP)

## 1. Design System — already have it

The Stitch export includes `kinetic_high_performance/DESIGN.md` with full color tokens, typography scale, spacing, and component notes. **Use this as the single source of truth** — port it directly into `tailwind.config.js` (NativeWind) rather than re-deriving values from the screenshots. Don't let visual drift creep in screen by screen.

## 2. Screen References

The 9 exported screens (`dashboard`, `workouts`, `diet_planner`, `ai_coach`, `progress_analytics`, `profile_settings`, `schedule_calendar_1`, `schedule_calendar_2`, `live_footstep_tracking`) each include a `code.html` and `screen.png`. Treat these as **visual reference and starting HTML/CSS structure**, not drop-in React Native code — they're web markup and need translation into RN components (see Frontend doc for which screens/elements are in vs. out of MVP scope).

## 3. Icons

- **Recommended:** `lucide-react-native` — matches the clean, geometric line-icon style already visible in the mockups (home, dumbbell, fork/knife, person icons in the bottom tab bar). Free, tree-shakeable, no licensing friction.
- Alternative: Phosphor Icons (`phosphor-react-native`) if the team wants a slightly different weight/style — also free.

## 4. Fonts

- **Oswald, Inter, JetBrains Mono** — all three are open-source (Google Fonts / open licenses). Bundle via `expo-font` + `@expo-google-fonts/oswald`, `@expo-google-fonts/inter`, `@expo-google-fonts/jetbrains-mono` packages rather than hand-loading font files — keeps versioning and licensing clean.

## 5. Exercise Library Seed Data (launch blocker — see Backend doc §5)

Options, cheapest first:
- **wger exercise database** (open source, has a public API and a downloadable dataset, CC-BY-SA licensed) — fastest way to seed `exercises` with real names/muscle groups/equipment without writing content by hand.
- **Free Exercise DB** (public GitHub JSON dataset, unlicensed/public-domain-style) — simpler structure, good fallback if wger's licensing terms don't fit the team's plans.
- **Manual seed (50-100 common exercises)** — if the team wants full control over naming/categorization and doesn't want any attribution obligations, this is a few hours of data entry, not a technical task. Realistic for a small team's first pass.

**Recommendation for MVP:** start with a manual seed of the ~50 most common strength + cardio exercises (covers 90% of real usage) rather than importing a large external dataset day one — smaller surface area to get wrong, and avoids licensing questions before the team has decided on their own content strategy.

## 6. Common Foods Seed Data (optional, nice-to-have for MVP)

- **USDA FoodData Central** (free, public API, no key required for basic use) — real nutrition data if the team wants a "search common foods" autocomplete instead of fully manual entry. This is a nice-to-have, not required — pure manual entry (name + calories + macros typed by the user) is a valid MVP fallback and is zero integration risk.

## 7. Illustration / Placeholder Imagery

- The mockups use photographic imagery (e.g. the "Upper Body Power" workout card background). For MVP, avoid licensing individual stock photos per exercise/workout — use a small set of category-level background images (e.g. one per workout type: strength / cardio / mobility) rather than per-exercise photography. Sources: Unsplash or Pexels (both free for commercial use, no attribution required, but confirm current license terms at time of use since policies do shift).

## 8. AI Coach Model Asset (Phase 2 — on-device, no cloud)

- **Model:** Qwen2.5-0.5B-Instruct, GGUF format, Q4_K_M quantization, ~398MB
- **Source:** Hugging Face (`Qwen/Qwen2.5-0.5B-Instruct-GGUF`) — pull the raw GGUF file from there for the app's download step. (Ollama's library page is a good reference for confirming model details/size, but Ollama itself isn't used in the app — it's a desktop tool, not something that runs inside React Native. The app downloads the same underlying GGUF file directly.)
- **License:** Apache 2.0 — safe for commercial use, no attribution UI required, but check current Hugging Face model card for any updates before shipping
- **Not bundled in the app binary** — downloaded on first use of AI Coach (user-initiated, Wi-Fi-gated), not on install, to keep initial app size reasonable
- Full download/init/storage implementation: `08-ai-coach-ondevice.md`

## 9. What Not to Source Yet

- No trainer-profile or marketplace imagery — Phase 3 scope.
