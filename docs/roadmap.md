# JobFlow PWA — Extensible Product Roadmap and Dependencies

This roadmap evolves JobFlow from a single‑user offline PWA into an extensible, integration‑rich experience while staying fast, local‑first, and privacy‑conscious.

## Vision (Experience Parity and Beyond)
- Unified workspace: dashboard, tabbed nav (Discovery, Dashboard, Planning, Tracking, Analytics), global search, saved views, and multi‑panel layout.
- Rich Kanban: swimlanes, batch actions, priority badges, deadline SLA signals.
- Qualification wizard: templates, keyboard‑first UX, AI‑suggested reasoning and tags.
- Discovery hub: connectors for RSS/APIs, dedupe, scoring, rule‑based enrichment.
- Calendar timeline: reminders, follow‑ups, ICS export/import.
- CRM light: contacts, companies, referral tracking, email touchpoints.
- Notes: rich text, attachments, quick snippets, offline autosave.
- Analytics: funnels, cohort trends, source ROI, personalized weight suggestions.
- Settings: theming, feature flags UI, import/export, backups, data ownership controls.
- Local‑first sync: background sync, conflict resolution, encryption options.
- V2 collaboration: comments, mentions, presence, shareable views (optional post‑MVP).
- Extensibility: plugin API for connectors, automations, custom views.

## Reference UI Alignment (from reference-ui.html)
- Discovery Engine
  - Sector filters; per‑source status (Remotive RSS, Jobicy API, Arbeitnow API); refresh action; discovered jobs grid; loading/empty states.
  - Plan: Discovery Connectors Framework + filters + source telemetry; add Arbeitnow adapter.
- Priority Dashboard
  - High/Medium/Low priority sections ranked by composite (Fit × Confidence × Financial Health × Growth × Referral Warmth).
  - Plan: Priority computation service; priority bands; cards list with sort and pagination.
- Backward Planning Calculator
  - Inputs: target offer date, target interviews; callback rates for cold/warm/strong referrals; outputs weekly targets and progress bars; timeline chart (Chart.js).
  - Plan: Planning model + persistence; weekly progress tracker; chart integration; export to calendar (Phase C).
- Workflow Tracker
  - Status management, job details modal with actions (update status, edit, research company, delete).
  - Plan: Advanced Kanban + Job Detail modal; company research action routes to Research modal.
- Analytics
  - Charts and KPIs for funnels and trends (using Chart.js CDN in the reference).
  - Plan: Analytics dashboards with lightweight chart library; bundle locally (no CDN) under CSP.
- Add Job Modal
  - Fields: role, company, location, links, source; sector; 1–5 sliders for scoring factors; notes.
  - Plan: Form component using design system; map to data model; normalize scoring from 1–5 into 0–100 weights.
- Company Research Modal
  - Loading state and research content.
  - Plan: research provider interface; user‑initiated fetches; CSP‑compliant; stub providers with pluggable adapters.

## Architecture Upgrades
- Modules: `core-domain` (opportunities, contacts, activities), `data` (IDB + sync), `ui` (design system), `features` (discovery, qualify, kanban, analytics), `integrations` (adapters), `automation` (rules), `telemetry` (events + QA).
- State: centralized store with event log (existing `event-schema.md`) and derived selectors; keep simple now, upgrade if needed.
- Routing: lightweight router + view composition (keeps bundle small and features decoupled).
- Data layer: local‑first IndexedDB with versioned schemas and migrations; optional CRDT later; background sync via SW; JSON backup/restore.
- Connectors: adapter interface for RSS/API sources; queue → normalizer → scorer → deduper.
- Feature Flags: structured config persisted in IDB, editable in Settings.
- Observability: in‑app QA panel (NSMs), log sampling in dev, crash capture in dev only.

## Epics, Scope, and Dependencies

1) Foundation Hardening [Must]
- Scope: CSP tighten, remove trackers, console clean, PWA installability, offline shell, JSON backup.
- Deps: None.

2) Design System v1 [Must]
- Scope: tokens, components (Button, Input, Select, Tabs, Modal, Card, Badge, Tooltip, Toast, KanbanCard), a11y baselines.
- Deps: 1.

3) Data Model v1 + Migration [Must]
- Scope: entities (Opportunity, Contact, Company, Activity, Note), IDB stores + indices, versioned migrations, quota tests, export/import parity.
- Deps: 1.

4) Global Search + Saved Views [Should]
- Scope: full‑text index (title, company, notes), filters (stage, priority, deadline, tags), saved views with shareable config.
- Deps: 3, 2.

5) Advanced Kanban [Must]
- Scope: swimlanes (by stage/priority), batch actions, drag‑drop perf, sticky headers, deadline signals.
- Deps: 2, 3.

6) Qualification Wizard + Templates [Must]
- Scope: modal/wizard with decision, fit, confidence, tags, notes; hotkeys; templates; autosave.
- Deps: 2, 3.

7) Discovery Connectors Framework [Must]
- Scope: adapter interface, built‑in connectors (WwR, Remotive, Jobicy, RemoteOK, Working Nomads, NoDesk, Himalayas), dedupe, scoring, rate limiting.
- Deps: 3.

8) Backward Planning Calculator [Must]
- Scope: planning model, weekly targets, progress tracking, timeline chart; optional export to calendar.
- Deps: 2,3.

9) Import/Export 2.0 [Must]
- Scope: strict CSV header validation, preview errors, round‑trip fidelity, JSON backup/restore UI.
- Deps: 3.

10) Calendar + Reminders [Should]
- Scope: schedule follow‑ups, ICS export/import, local notifications, deadline SLA.
- Deps: 3, 5.

11) Notes + Attachments [Should]
- Scope: rich text notes, file attachments (IDB blobs), quick snippets.
- Deps: 3, 2.

12) Analytics Dashboards [Should]
- Scope: funnels (7/30d), cohorts, source ROI, suggestions that adjust scoring weights.
- Deps: 3, 6, 7, 5.

13) Settings + Feature Flags UI [Must]
- Scope: toggle features, scoring weights editor, backups, data reset.
- Deps: 1, 3.

14) Local‑First Sync + Conflict Resolution [Could]
- Scope: background sync queue, server sync adapter stub, per‑field last‑write wins or vector clocks later; encryption option.
- Deps: 3, 12.

15) Automation Rules (IFTTT) [Could]
- Scope: triggers (deadline, stage change), conditions (score, priority), actions (email draft, reminder, move card, tag).
- Deps: 3, 5, 9, 12.

16) Integrations Pack [Could]
- Scope: Gmail (draft via `mailto:`/Gmail compose link), Calendar (ICS / native hooks), LinkedIn shortcuts, Slack notifications (opt‑in), webhooks.
- Deps: 9, 12, 14.

17) AI Assistance [Could]
- Scope: qualify suggestions, email draft scaffolds, interview prep summaries; strictly user‑initiated; offline where possible.
- Deps: 6, 10, 11.

18) Collaboration v2 (Optional) [Won’t for MVP]
- Scope: comments, mentions, presence, shared views; requires accounts and server.
- Deps: 13.

19) Security & Privacy [Ongoing]
- Scope: content security policy, least‑privilege connectors, permission prompts, export deletion, privacy mode.
- Deps: 1; runs continuous.

20) Observability & QA [Ongoing]
- Scope: in‑app NSMs (already partially present), test harness, lighthouse budgets, Playwright flows.
- Deps: 1; runs continuous.

21) Packaging & Release [Final]
- Scope: Docker/Nginx prod, PWA checklist, versioning, change log, migration notes.
- Deps: 1–12 complete (MVP), later items gated.

## Dependency Map (Abbreviated)
- 1 → 2,3,13
- 2 → 4,5,6,11
- 3 → 4,5,6,7,8,9,10,11,12,14,15
- 5 → 10,12,15
- 6 → 12,17
- 7 → 12
- 8 → 10
- 9 → 16
- 13 → 14,15,16
- 14 → 18

## Phases (Execution Plan)
- Phase A — Foundation: 1,2,3,13 (design system, data model, flags UI).
- Phase B — UX Parity (Reference Tabs): 5,6,4,9,7,8 (kanban, qualify, search, import/export, discovery, planning).
- Phase C — Intelligence & Integrations: 10,11,12,16,17 (calendar, notes, analytics, integrations, AI assist).
- Phase D — Extensibility & Scale: 14,15,19,20,21 (sync, automation, security, QA, release). 18 optional thereafter.

Issue Tracking
- Phase B sprint tickets: see `docs/sprint-phase-b.md` and `docs/issues/phase-b/README.md`.

## Deliverables by Phase
- A: component library docs, schema/migration plan, feature flags UI, PWA hardening checklist.
- B: saved views, keyboard‑driven qualification, discovery hub, CSV 2.0 with validation.
- C: timeline view, rich notes + attachments, analytics dashboards v1, integration stubs.
- D: sync stub service (optional), automation rule engine v1, QA dashboards, release artifacts.

## Mapping: Current → New Plan
- Current TODO.md: Steps 1–6 map to Epics 1,7,6,5,11.
- Orchestration.yaml: Keep bootstrap/schema/csv_import/qualification/kanban/qa; add search, settings, analytics, calendar, notes, connectors framework, and extensibility phases.
- NSM Panel already present; expand with per‑feature success metrics (qual modal usage, Kanban moves, CSV round‑trip rate, search latency, offline coverage).

## Quality Gates
- Performance budgets: search <150ms for 2k items; drag‑drop 60fps; modal open <100ms.
- Accessibility: WCAG AA, keyboard coverage 100% on core flows, roles/labels on interactive components.
- Offline: all read flows work offline; writes queue for sync.
- Privacy: no third‑party trackers; all network calls user‑initiated and documented.

## Notes
- This plan is source‑agnostic and designed to be refined against the reference UI. Once we review that UI, we will tailor feature names, flows, and visuals to match it precisely.
