Title: Job Detail modal + actions
Labels: phase: phase-b, type: feature, area: tracking
Estimate: 2d
Dependencies: tracking-001-kanban-swimlanes-sla.md

Description
Implement Job Detail modal with full field view and actions: update status, edit, research company, delete.

Acceptance Criteria
- Modal shows all job fields; actions available and functional.
- Emits audit events for each action.

Tasks
- Build modal UI; wire up actions to store.
- Add audit event schema for actions.
- Confirm mobile responsiveness and keyboard accessibility.

Test Plan
- Playwright: open from dashboard/kanban; perform each action; verify persisted changes and events.

