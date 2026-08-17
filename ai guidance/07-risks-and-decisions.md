# FitPulse — Risks & Open Decisions

## Decide Before/During Week 1

1. **Physical test devices.** The team needs at least one real iOS device and one real Android device — HealthKit/Health Connect cannot be validated on simulators/emulators. If the team doesn't have both, this is a blocker to sort out immediately, not mid-build.
2. **Apple Developer account status.** HealthKit requires a paid Apple Developer account and an explicit entitlement. Confirm this is active before Phase 0 starts.
3. **Primary calendar screen.** Two schedule/calendar variants exist in the design export — pick one now so design time isn't split (Frontend doc §3).
4. **AI Coach tab slot.** Decide whether the 5th tab shows a "Coming Soon" placeholder or is removed entirely until Phase 2 — small decision, but affects the nav component built in week 1.
5. **AI Coach is decided as on-device only (no cloud).** This removes some risks (no API cost, no third-party data exposure, works with no internet) but doesn't remove the liability/disclaimer risk below — flag this explicitly to any stakeholder who assumed "AI Coach" meant GPT/Claude-level quality.

## Technical Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Health Connect not installed on older/some Android devices | App can't read step data at all for those users | Detect and prompt install gracefully; don't assume it's always present |
| "Live" step tracking isn't actually real-time in the background on iOS | Sets wrong user expectations if copy promises real-time | Set copy expectations now (poll on foreground, not a live feed) — already reflected in TRD |
| Exercise/food seed data doesn't exist yet | Workouts/Food Log are unusable without it | Treat as a launch blocker task, not a content afterthought (Backend doc §5, Assets doc §5-6) |
| Team capacity vs. scope | 1-2 people, 1-3 months, 8 MVP feature areas | The MVP list in the PRD is already the trimmed version — if timeline slips, trim further (e.g. ship Workouts + Dashboard + Steps first, Food/Weight logging as a fast-follow) rather than shipping all 8 areas half-finished |
| On-device AI quality ceiling | Qwen2.5:0.5b is small — since there's no cloud fallback anymore, this *is* the AI Coach's permanent quality level, not a temporary offline degradation. If output quality disappoints in testing, there's no larger model to fall back to without revisiting the no-cloud decision | Prototype the actual prompts/outputs early (Phase 0-equivalent for this feature) on a real low-end Android device before building UI around it. Keep the feature scope narrow — short, specific, data-grounded answers — matched to what a 0.5B model can actually do |
| Model download UX | ~398MB download is a real barrier — slow/expensive on cellular, and a failed/corrupted download will crash `llama.rn` if not handled | Wi-Fi-gated, user-initiated download (not automatic on install); verify download completed correctly before first use — see `08-ai-coach-ondevice.md` |
| Low-end device performance/battery | On-device inference is CPU/battery-intensive; a 3-year-old budget Android phone will feel this more than a flagship | Test on real low-end hardware, not just the team's own dev phones, before shipping |

## Product Risks

- **"Live weight loss/gain monitoring"** as originally scoped isn't a real feature without a smart scale — the PRD reframes this to periodic manual logging + trend chart. Worth confirming the team is fine with that reframing, since it changes the pitch.
- **Gym trainer integration** was in the original vision list — worth being explicit with any stakeholders/investors that this is Phase 3, not part of the initial launch, so expectations are set correctly from the start.
- **AI Coach liability** — once built (Phase 2), any suggestion that touches nutrition/training carries some liability surface. Flagging now so it's on the roadmap for a legal/disclaimer pass before Phase 2 ships, not discovered at App Review.

## Store Compliance (don't discover this at submission time)

- Privacy policy required, specifically covering health data usage (HealthKit/Health Connect)
- In-app account + data deletion flow required (Backend doc §6)
- Apple App Review reads `NSHealthShareUsageDescription` copy closely — keep it accurate and specific
