Title: Advanced Kanban with swimlanes + SLA
Labels: phase: phase-b, type: feature, area: tracking
Estimate: 3d
Dependencies: Data Model v1, Design System v1

Description
Enhance Kanban with swimlanes by priority and deadline SLA indicators. Ensure drag-drop persists.

Acceptance Criteria
- Columns: Research → To Apply → Applied → Interview → Offer/Reject.
- Swimlanes by priority bands; drag-drop persists across reloads.
- SLA icons: red overdue, yellow ≤3 days, green >3 days.

Tasks
- Kanban store updates; swimlane layout; performant drag-drop.
- SLA calculation utilities.
- Persistence and event logging for moves.

Test Plan
- Playwright: drag-drop persists; SLA icons correct for sample deadlines; mobile touch drag works.

