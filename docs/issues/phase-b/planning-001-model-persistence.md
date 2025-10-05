Title: Backward Planning model + persistence
Labels: phase: phase-b, type: feature, area: planning
Estimate: 2d
Dependencies: Data Model v1

Description
Implement planning inputs (target offer date, target interviews, callback rates) with persisted config and computed targets.

Acceptance Criteria
- Inputs persisted in IDB; defaults provided.
- Outputs: weekly cold/warm targets, total applications needed.

Tasks
- Add planning store and schema fields.
- Compute weekly targets from inputs.
- Render UI fields and results.

Test Plan
- Playwright: inputs persist after reload; results update when inputs change.

