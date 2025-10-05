Title: Weekly progress tracker
Labels: phase: phase-b, type: feature, area: planning
Estimate: 1.5d
Dependencies: planning-001-model-persistence.md

Description
Track weekly progress vs cold/warm targets with bars and manual increment/decrement.

Acceptance Criteria
- Two bars reflect progress vs weekly targets; auto-reset each week.
- Manual adjust with undo; events logged.

Tasks
- Add counters and weekly rollover logic.
- Build progress bar component.
- Add increment/decrement + undo.

Test Plan
- Playwright: counters update and persist; rollover simulated via mocked date.

