# Enhanced Haystack Algorithm v2.0

## Core Scoring Dimensions
- **Base Score (35%)**: Skills/experience match
- **Culture Score (25%)**: 4D work style compatibility
- **Timing Score (20%)**: Chronos/Kairos market/career timing
- **Alumni Score (15%)**: Team archetype similarity
- **Work Style Score (5%)**: Communication/personal preference fit

## Adaptive Learning Flow
1. Compute weighted composite score for each opportunity.
2. Track outcomes (applied, interview, offer, rejection, satisfaction).
3. Analyze scoring dimension accuracy (fit/prediction vs. result).
4. Adjust weights:
   - Personal: By user-specific success patterns
   - Cohort: By similar profile group trends
   - Global: By all user outcomes

## Bias Correction
- Detect bias influence (ego, hubris, fear, etc.) in applications.
- Apply bias corrections to candidate scores if detected.
- Surface “why not” in brutal honesty feedback.

## Output Example
## Guardrails & Weights (MVP)

- Core precedence: Base + Culture ≥ 60% combined.
- Supplementary: Timing + Alumni ≤ 20% combined, each ≤ 10%.
- Work Style sub‑factor ≤ 5% (inside Culture).
- Weak or missing evidence → neutral (0 contribution). These factors never flip gating outcomes alone.

## Adaptive Learning (Stated vs Learned)

- Store per‑user weights in profile.weights and flavor preferences in profile.tag_prefs.
- Update via bounded EWMA after solid outcomes (interview/offer or aged no‑interview):
  - w_next = clamp(w_current + α*(signal − expected), min, max), α≈0.03; renormalize; cap timing/alumni.
  - Tag prefs: preference_next = (1−β)*current + β*feedback, β≈0.1 from triage chips & reflections.
- Divergence metric Δ = |stated − learned|; prompt only at kairos moments with consistent evidence.

## Culture Flavor Axes & Tags

- Vibe axes (0–10): Professionalism, Chill, Follow‑Through, Ethics, GSD/process tilt.
- Tags (examples): casual_athleisure, casual_snuggie, casual_smart, formal_business; pace_steady, pace_fast; feedback_kind, feedback_blunt.
- Heuristics classify JDs into tags; contributions are small, bounded and only inside Culture (≤ 25%).

## Gating vs Ranking

- Gating uses total_fit + energy + no barriers. Learned prefs cannot change gates without consent.
- Timing/Alumni always supplementary; if noisy, auto‑reduce their weights toward neutral for that user.

## Attribution & Metrics

- Track when Timing/Alumni changed ordering vs base model and whether outcomes improved; downgrade if not.
- Track FPER for “gated accepts” vs “force accepts” to validate honesty & gates.
