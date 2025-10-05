Title: Priority compute service & bands
Labels: phase: phase-b, type: feature, area: dashboard
Estimate: 2d
Dependencies: Data Model v1, Qualification Wizard

Description
Compute composite priority from factors and segment into High/Medium/Low bands.

Acceptance Criteria
- Composite score uses factors: fit, confidence, financial_health, growth_signals, referral_warmth.
- Bands: High (70–100), Medium (40–69), Low (<40).
- Sorted lists by score descending.

Tasks
- Implement compute function and selector.
- Add indexing for quick retrieval by band.
- Add pagination for large lists (>50).

Test Plan
- Unit tests for compute and banding.
- Playwright: dashboard renders three bands; order correct.

