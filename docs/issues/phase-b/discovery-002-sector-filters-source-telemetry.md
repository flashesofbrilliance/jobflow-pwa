Title: Sector filters + source telemetry UI
Labels: phase: phase-b, type: feature, area: discovery
Estimate: 2d
Dependencies: discovery-001-adapter-framework.md

Description
Add sector filter chips and a per-source status panel showing last updated and job counts.

Acceptance Criteria
- Filter chips: All, AI/Generative, HealthTech, FinTech/Crypto, GTM SaaS, Other.
- Per-source card shows last-updated and job count; updates after refresh.
- Filters apply across discovery list and persist across reload.

Tasks
- Build filter chip component and persistence in IDB.
- Render source cards with live counts from adapter run telemetry.
- Wire filter to normalized items.

Test Plan
- Playwright: toggle filters and verify list; refresh updates source timestamps and counts; state persists after reload.

CSP/Privacy
- None beyond discovery sources.

