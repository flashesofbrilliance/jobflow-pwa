Title: Analytics — funnels & KPIs (local charts)
Labels: phase: phase-b, type: feature, area: analytics
Estimate: 3d
Dependencies: Qualification Wizard, Kanban, Discovery

Description
Add 7/30-day funnel and KPI charts using a locally bundled chart library.

Acceptance Criteria
- Funnel: Discovery → Qualified → Applied → Interview → Offer with conversion rates.
- KPIs per source; charts render without external requests; zero console errors.

Tasks
- Compute metrics from event log/state.
- Build charts (bundled lib) and lightweight dashboard view.
- Dark theme and responsive layout.

Test Plan
- Playwright: charts render; conversions computed; no external network calls.

