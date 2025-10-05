Title: Dashboard cards UI
Labels: phase: phase-b, type: feature, area: dashboard
Estimate: 1.5d
Dependencies: dashboard-001-priority-compute-bands.md

Description
Render priority cards with key fields and open Job Detail on click.

Acceptance Criteria
- Card shows title, company, score badge, status, deadline SLA icon.
- Click opens Job Detail modal.
- Responsive for mobile.

Tasks
- Implement card component and styles.
- Wire click handler to Job Detail.
- Add SLA icon logic.

Test Plan
- Playwright: cards render with correct badges; modal opens on click.

