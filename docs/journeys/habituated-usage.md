# Habituated Usage Journeys (PM Job Search)

This document lays out sequential user stories that reflect a healthy, repeatable routine using JobFlow. Each story is scoped to a short session and maps to screens and features in the app.

## Day 1 — Onboard and Plan First Session (10–15m)
- As a new user, I complete the 90-second onboarding to clarify blockers and desired small win.
- I set my pace (Relaxed/Standard/Focus/Off) and accept safe defaults if I run out of time.
- The app persists my `current_frame`, gates (min_fit/min_energy), and vibe axes to Profile.
- I accept the prompt to add a 25-minute Apply/Research session to my calendar and see an “Onboarding … session” in To Apply.

Acceptance:
- A reflection of type `onboarding` exists with my summary and note.
- A planned session appears in Today Queue and can be started.

## Daily — Today Queue and Triage (25–45m)
- As a user, I open Today and see planned sessions for the next few hours.
- I start a 25-minute Apply session, receive a gentle countdown, and write a 2-line reflection upon completion.
- I triage 3–5 roles: Accept (to-apply), Plan, or Reject with objections/exclusions; stage history updates and analytics reflect changes.

Acceptance:
- Sessions append to the role with `outcome: done` and weekly streak increments.
- Qual decisions persist and appear in Archive and Analytics.

## Twice Weekly — Discovery and Qualification (30–45m)
- As a user, I import a CSV of new roles or refresh feeds (when enabled by CSP).
- I map headers, preview, dedupe, and import selected rows.
- I open each role and use the Qualification modal to decide in <2 minutes with confidence and notes.

Acceptance:
- Imported roles appear in Research; deduped items are skipped.
- 10 roles can be qualified in ~20 minutes; decisions and reasons recorded.

## Weekly — Frame Storming and Review (30–45m)
- As a user, I revisit my current frame and lightly reframe based on learned patterns.
- I review funnel conversion and FPER, scanning common objections and sources.
- I adjust gates or vibe axes if needed and plan next week’s first 2 sessions.

Acceptance:
- Profile `current_frame` updates with a new reflection.
- Analytics snapshot stored; next sessions created and visible in Today.

## Nudges — Kairos Prompts (contextual, lightweight)
- When I force-accept roles outside my vibe repeatedly, a prompt helps me recalibrate preferences.
- When I habitually open gated items via “Show all”, a prompt surfaces reasons and a one-tap adjustment.

Acceptance:
- Prompts log as events; chosen adjustments persist to `user_preferences`.

## Artifacts by Flow
- Screens: Discovery → Qualification → Kanban → Archive → Analytics → Profile → Today.
- Data: opportunities, qualification_reviews, profile, user_preferences, reflections, analytics_snapshots, kanban_state.
- Exports: CSV export (round-trip), ICS download, Google Calendar link.

## Success Metrics (leading indicators)
- Streak days ≥ 3; weekly planned sessions ≥ 3 with ≥ 2 completed.
- Qualification throughput: 10 roles in <20 minutes.
- FPER (28d) trending downward; objections distribution stabilizing.

## How to Demo (scripted)
1) Open Onboarding, pick Standard, complete quickly; show a planned session and ICS.
2) Import CSV (template), preview, import 10 rows.
3) Qualify 5 roles with hotkeys; show Archive reasoning.
4) Drag a Kanban card; refresh; verify persistence.
5) Show Analytics (funnel + FPER) and Profile gates.
6) Start Today session for “apply”, show countdown and reflection.

