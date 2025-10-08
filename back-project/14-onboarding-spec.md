# Onboarding Spec (MVP, chat + pacing)

Goal: 60–90s, ≤5 prompts, starts with the struggle and ends with a 25m planned session. Minimal input; system auto-fills defaults and learns from behavior.

## Pacing Modes
- Relaxed: 120s total (~24s/step)
- Standard (default): 90s total (~18s/step)
- Focus: 60s total (~12s/step)
- Off: no countdown (progress bar only)

Controls: Pause/Resume, Hide timer, auto-extend +10s if actively typing/focused. Respect prefers-reduced-motion → default to Off.

## Steps (P0–P4)
- P0 Struggle (chips + 1-line optional): spray-and-pray, no energy, no interviews, wrong roles, chaotic culture, overthinking.
- P1 Smallest win this week (chips): 1 screen, 1 apply-quality/day, clarify target, kill 3 low-fits.
- P2 Non-negotiables (pick 1–2): Remote/NYC, senior IC, non-technical PM, collaborative, mission-aligned.
- P3 Vibe (1 tap): Polished–Chill, Formal–Guardrails, Fast–Pragmatic, Kind–Direct, Low-ego/Ownership.
- P4 Plan 25m: plan now (next hour) or later; ICS download + Google Cal link; local reminder (T–5m) if allowed.

Auto-fill defaults on timeout (safe choices): P0 no interviews, P1 1 apply/day, P2 Remote/NYC, P3 Polished–Chill, P4 Plan 25m next hour.

## Outputs
- `profile.current_frame`: summary + tags + committed_at
- `profile.gates`: min_fit/min_energy
- `profile.stated.vibe_axes`: set from P3
- `opportunities.next_action`: first planned session
- Reflection entry: onboarding frame brief

## Events / KPIs
- onboarding_started, step_completed, auto_advanced, onboarding_completed, time_to_complete
- KPIs: completion rate, median time, % auto-fill, time-to-first session scheduled

## Copy Tone
- Encouraging: “90 seconds to get you unstuck.”
- Gentle: “We’ll auto-fill in 5s; you can edit later.”
- Outcome: “Done — this will evolve as you make progress.”
