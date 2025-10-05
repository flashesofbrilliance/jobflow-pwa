Title: CSV Import/Export 2.0
Labels: phase: phase-b, type: feature, area: csv
Estimate: 2d
Dependencies: Data Model v1

Description
Strict header validation, preview errors, and round-trip fidelity for new fields (scoring factors, notes, status, deadlines).

Acceptance Criteria
- Import validates exact header; shows preview with errors/warnings.
- Export includes new fields; re-import preserves full fidelity.

Tasks
- Update parser and schema mapping for new fields.
- Build preview UI with error highlighting.
- Expand export to include all fields; add tests.

Test Plan
- Playwright: import preview shows errors for malformed CSV; export → reimport preserves fields.

