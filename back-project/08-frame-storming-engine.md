# Frame Storming Engine: Career Metacognition

## Overview
Systematic process to clarify, challenge, and reframe a user's job search criteria before discovery begins.

## Steps
1. **Elicit Current Frame**: Why do you want the role you say you want? Where did this belief originate?
2. **Detect Distortions**: Ego, fear, comparison, legacy programming, perfectionism
3. **Reframe**: Generate 3-5 new perspectives (e.g., impact, mastery, autonomy, meaning)
4. **Validate**: Cross-check with past fulfillment and values
5. **Commit**: Declare prioritized search parameters for discovery

## Integration
- Frame stored with user profile (`profile.current_frame`) plus a reflection entry.
- Discovery/search engine references `current_frame` to inform base skills and segment preferences.
- Frame evolution tracked over time; suggested pivots are surfaced at kairos moments (Plan time, post‑interview, weekly digest) with one‑tap adopt/ignore.

## MVP Flow & Data

- Flow: Elicit frames → detect distortions (ego/fear/comparison/etc.) → facilitate reframing → commit current_frame.
- Persist: profile.current_frame and a reflection with summary; event logged for session.
- Influence: current_frame can (optionally, with consent) slightly adjust gates for misaligned segments; no automatic gate flips.

## Inputs & Outputs

- Inputs: short guided questions; defaults available to minimize friction.
- Outputs: frame summary, tags, quality score, and suggested evidence tests.

## Key User Flows
- `FrameStormingWizard` guides user through questions
- Summary page shows current frame, distortions, suggested reframes
- Allows re-running before new search/career pivot
