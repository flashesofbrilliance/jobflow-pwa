Title: Settings — Feature Flags UI
Labels: phase: phase-b, type: feature, area: settings
Estimate: 1.5d
Dependencies: Data Model v1

Description
Expose feature flags and scoring weights editor in a Settings view.

Acceptance Criteria
- Toggle Discovery, Dashboard, Planning, Tracking, Analytics.
- Edit scoring weights; persist to IDB; apply on reload.
- Backup/export from Settings.

Tasks
- Build Settings view; connect to flags store.
- Scoring editor UI; validation; persistence.
- Backup/export triggers.

Test Plan
- Playwright: toggles persist and take effect after reload; weights save and apply; backup downloads JSON.

