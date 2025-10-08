# Kairos Prompt Catalog (MVP)

Purpose: surface low‑friction, high‑leverage prompts only at decision points where a small adjustment improves outcomes. Prompts are evidence‑bound, consentful, and reversible. They never flip gates automatically.

## Principles
- Evidence first: prompt only on consistent, strong signals; otherwise stay silent.
- Low friction: 1–3 choices max (“just this role”, “this segment for 2 weeks”, “keep current”).
- Guardrails: Base+Culture ≥60%; Timing+Alumni ≤20% total; neutral defaults if weak evidence.
- Consentful: learned updates apply only if user taps “adopt”; changes are small and reversible.
- Urgency taxonomy: Now (≤72h), Soon (≤14d), Later (>14d).
- Stretch rubric: Realistic • Healthy Stretch • Long Shot • Unrealistic (below).

## Stretch Rubric (v1)
- Realistic: gates pass; evidence strong (ATS, ≤60d, senior IC, non‑technical JD); honesty=Realistic Shot.
- Healthy Stretch: gates pass narrowly; 1–2 weak spots; honesty=Long Shot with actionable path (warm intro, one gap).
- Long Shot: gates fail on fit/energy or 2+ barriers; honesty=Long Shot; pursue only with strong leverage.
- Unrealistic: hard barriers (credentials/deep tech), stale >90d, talent bench; honesty=Brutal Reality.

## Prompt Structure
- When: trigger & context
- Objective: what good looks like now
- Copy: user‑facing text
- Options: choices and their effects
- Urgency: Now/Soon/Later
- Evidence: what backs this prompt
- Action effect: bounded updates (weights/tags), duration, and scope

---

## Catalog

### P1 — Plan‑time culture mismatch (polished‑chill vs detected formal or chaotic)
- When: planning a session for a role where detected culture diverges from stated vibe by ≥3 points over last 3 signals.
- Objective: avoid time sinks; align session to better‑fit targets or adjust just for this role.
- Copy: “This role reads more {formal/chaotic}. You thrive in polished‑chill. Adjust just for this role, for this segment (2 weeks), or keep current?”
- Options: Just this role • This segment (2 weeks) • Keep current
- Urgency: Soon
- Evidence: JD keywords (formality/process), culture dims, past triage chips.
- Action effect: nudge vibe axes ±1 within Culture ≤25%; segment‑scoped if chosen.

### P2 — Deadline proximity
- When: deadline ≤72h and not yet planned
- Objective: schedule an apply‑quality session or consciously skip.
- Copy: “Deadline soon. Book a 25‑min apply session or skip?”
- Options: Plan 25m today • Plan 15m tomorrow • Skip
- Urgency: Now
- Evidence: deadline, no planned session
- Action effect: create next_action; no weight change.

### P3 — Discovery gates failing (reasons visible)
- When: user toggles “Show all” and repeatedly opens gated items with reasons (≥3 in 7d)
- Objective: align gates with reality or focus elsewhere.
- Copy: “These roles miss gates: {reasons}. Raise bar or adjust for this segment?”
- Options: Keep gates • Segment‑only reduce fit min by 5% (2 weeks) • Focus elsewhere
- Urgency: Soon
- Evidence: fit/energy below thresholds, barriers
- Action effect: temporary segment override; revert automatically after 2 weeks.

### P4 — Post‑interview culture drift
- When: 3+ interviews flagged “too casual/formal” in 14d
- Objective: refine vibe axes
- Copy: “You flagged ‘too {casual/formal}’ 3×. Keep current or dial {axis} one notch?”
- Options: Keep current • Adjust globally • Adjust this segment
- Urgency: Soon
- Evidence: interview reflections/triage chips
- Action effect: adjust vibe axis ±1; segment/global per choice.

### P5 — Compensation/level mismatch
- When: 2+ processes stalled at comp/level in 21d
- Objective: recalibrate targets or ask better questions earlier
- Copy: “Comp/level mismatch is recurring. Add early screen questions or adjust targets?”
- Options: Add early questions • Adjust segment targets • Keep current
- Urgency: Soon
- Evidence: outcome notes with comp/level
- Action effect: add screening checklist; optional segment override.

### P6 — FPER trending worse
- When: 28‑day FPER > baseline by ≥10% and rising
- Objective: strengthen gates or shift focus to proven segments
- Copy: “False positives are up. Strengthen gates or double‑down on segments with 2× interview rate?”
- Options: Raise min fit by 5% • Focus on {top segment} • Keep current
- Urgency: Soon
- Evidence: analytics snapshot
- Action effect: gates +5% or segment filter for 2 weeks.

### P7 — Success archetype emerging
- When: interview rate ≥2× for segment/stage/company size
- Objective: prioritize best‑fit pattern
- Copy: “You’re winning with {pattern}. Prioritize it for 2 weeks?”
- Options: Prioritize pattern • Keep mix
- Urgency: Later
- Evidence: conversion by segment
- Action effect: boost segment in scoring; temporary priority rule.

### P8 — Force Accept audit
- When: a force‑accepted role ages out (no interview in 21d)
- Objective: reduce bias‑driven misfires
- Copy: “Force accept didn’t convert. Roll back similar overrides?”
- Options: Roll back segment‑only • Keep overrides
- Urgency: Soon
- Evidence: decision_context, outcome
- Action effect: reduce learned deltas for similar roles.

### P9 — Stale “To Apply” cards
- When: in To Apply >7 days without session
- Objective: plan or prune
- Copy: “Stuck for a week. Plan 15m now or move out?”
- Options: Plan 15m • Move to Research
- Urgency: Now
- Evidence: stage timestamps
- Action effect: create next_action or demote.

### P10 — WIP exceeded
- When: To Apply >7 cards
- Objective: reduce overwhelm; quality over quantity
- Copy: “Too many actives. Prune to your top 7 for focus?”
- Options: Prune list • Keep
- Urgency: Now
- Evidence: column count
- Action effect: soft highlight to prune.

### P11 — Location misfit
- When: role location misaligned without strong leverage
- Objective: avoid time sink
- Copy: “Location mismatch. Convert to research/network instead?”
- Options: Convert to Research • Keep
- Urgency: Later
- Evidence: location vs preference
- Action effect: move to Research; add network next_action.

### P12 — Credential barrier
- When: credential (FINRA/SEC/clinical) detected and unsupported
- Objective: avoid unrealistic stretch
- Copy: “Credential required. Pivot or pursue warm intro with clear waiver path?”
- Options: Pivot target • Warm intro plan • Skip
- Urgency: Now
- Evidence: JD text
- Action effect: move to Research with intro plan or skip.

### P13 — Market timing inflection
- When: funding/leadership/news implies window opening/closing; or deadline cluster
- Objective: act at the right time
- Copy: “Window may be opening/closing. Plan a 25m session or watchlist?”
- Options: Plan 25m • Watchlist
- Urgency: Soon
- Evidence: recency, cluster patterns
- Action effect: plan or add tag.

### P14 — Alumni/team archetype signal
- When: mild team‑fit signal without leverage
- Objective: convert to warm‑intro path or deprioritize
- Copy: “Light team archetype match. Try warm intro or deprioritize?”
- Options: Warm intro • Deprioritize
- Urgency: Later
- Evidence: archetype heuristics
- Action effect: add next_action or lower priority.

---

## Instrumentation & Reversibility
- Log: prompt_id, context, options shown, user choice, immediate action taken, and outcome window marker.
- Rollback: if adopted change worsens outcomes over 14–28 days, suggest revert and auto‑reduce learned weights toward neutral.
- Privacy: all data local in MVP.

