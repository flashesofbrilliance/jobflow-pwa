# Phase B — UX Parity Sprint Plan

Scope: Align core UX with the reference UI tabs (Discovery, Priority Dashboard, Backward Planning, Workflow Tracking, Analytics). Each ticket lists dependencies, estimate, and acceptance criteria.

## Discovery Engine

- Ticket: Discovery connectors framework (adapters)
  - Deps: Data Model v1 (entities, indices)
  - Est: 3d
  - AC:
    - Adapter interface with normalize(d) fields: id, title, company, url, location, posted_at, sector?, source, raw.
    - Built-ins: WeWorkRemotely (RSS), Remotive (RSS), Jobicy (API), RemoteOK (RSS), Working Nomads (RSS), NoDesk (RSS), Himalayas (API), Arbeitnow (API).
    - Dedupe on company+title+window(60d). Rate-limiting and error surfacing per source.

- Ticket: Sector filters + source telemetry UI
  - Deps: adapters
  - Est: 2d
  - AC:
    - Filter chips: All, AI/Generative, HealthTech, FinTech/Crypto, GTM SaaS, Other.
    - Per-source card shows last updated time and job count; updates after refresh.

- Ticket: Discovery refresh + states
  - Deps: adapters
  - Est: 1d
  - AC:
    - “Refresh Discovery” triggers queued fetches; shows loading and empty states; discovered grid renders cards with core fields.

## Priority Dashboard

- Ticket: Priority compute service & bands
  - Deps: Data Model v1, Qualification Wizard
  - Est: 2d
  - AC:
    - Composite score from factors: fit, confidence, financial_health, growth_signals, referral_warmth.
    - Bands: High (70–100), Medium (40–69), Low (<40); sections show sorted cards; pagination for >50 items.

- Ticket: Dashboard cards
  - Deps: compute service
  - Est: 1.5d
  - AC:
    - Card shows title, company, score badge, status, deadline SLA signal; click opens Job Detail modal.

## Backward Planning

- Ticket: Planning model + persistence
  - Deps: Data Model v1
  - Est: 2d
  - AC:
    - Inputs: target offer date, target interviews, callback rates (cold/warm/strong). Persisted in IDB.
    - Outputs: weekly cold/warm targets, total needed.

- Ticket: Weekly progress tracker
  - Deps: planning model
  - Est: 1.5d
  - AC:
    - Two bars track current week progress vs targets; values reset weekly; manual increment/decrement with undo.

- Ticket: Timeline chart (bundled chart lib)
  - Deps: planning model
  - Est: 1.5d
  - AC:
    - Chart renders application volume timeline; no CDN usage; passes CSP (script-src 'self').

## Workflow Tracking (Kanban + Job Detail)

- Ticket: Advanced Kanban with swimlanes
  - Deps: Data Model v1, Design System v1
  - Est: 3d
  - AC:
    - Columns: Research → To Apply → Applied → Interview → Offer/Reject; swimlane by priority; drag-drop persists.
    - Deadline SLA icons: red overdue, yellow ≤3 days, green >3 days.

- Ticket: Job Detail modal + actions
  - Deps: Kanban
  - Est: 2d
  - AC:
    - Modal shows all fields; actions: update status, edit, research company, delete; audit events emitted.

- Ticket: Company Research modal + provider interface (stub)
  - Deps: Job Detail modal, CSP
  - Est: 2d
  - AC:
    - User-initiated research with loading state; provider interface supports multiple sources; fetches scoped to allowlisted domains; no third-party trackers.

## Analytics

- Ticket: Funnels + KPIs (local charts)
  - Deps: Qualification, Kanban, Discovery
  - Est: 3d
  - AC:
    - 7/30-day funnel from Discovery → Qualified → Applied → Interview → Offer; success rates per source; charts bundled locally; zero console errors.

## Shared/Infra Tickets

- Ticket: Feature Flags UI (Settings)
  - Deps: Data Model v1
  - Est: 1.5d
  - AC:
    - Toggle Discovery, Dashboard, Planning, Tracking, Analytics; scoring weights editor; backup/export in Settings.

- Ticket: Security & CSP hardening (Phase B scope)
  - Deps: None
  - Est: 1d
  - AC:
    - No CDN scripts; allowlist only discovery domains in `connect-src` (add Arbeitnow); document research domains; confirm `object-src 'none'` and strict script-src.

- Ticket: CSV Import/Export 2.0
  - Deps: Data Model v1
  - Est: 2d
  - AC:
    - Strict header validation, preview errors, round-trip fidelity for new fields (scoring factors, notes, status, deadlines).

## Dependencies/Blockers
- Data Model v1 migration must include: scoring factors (fit, confidence, financial_health, growth_signals, referral_warmth), status, deadline, sector, planning config, progress counters.
- Charting library must be bundled locally (no CDN); pick a small ESM library or tree-shaken Chart.js.
- CSP allowlist for new discovery (Arbeitnow) and research domains; document exact endpoints.
- Rate limits/CORS for API sources; may require RSS-first strategy where APIs block cross-origin.
- Playwright environment: ensure preview server runs with service worker and IndexedDB available.

## Test Plan (Add/Expand)
- Playwright
  - Discovery refresh → discovered grid populated; source status cards update timestamps.
  - Dashboard shows items in correct bands; card click opens Job Detail.
  - Planning inputs persist; progress bars update; timeline chart renders without external requests.
  - Kanban drag-drop persists after reload; SLA icons reflect deadlines.
  - Research modal opens and shows loading state; performs scoped fetch to stub domain.
  - CSV round-trip preserves new fields.
- Lighthouse PWA: installable, offline works after first load, no external requests in core views.
- Console hygiene: zero first-party errors/warnings across tabs.

## Definition of Done (Phase B)
- All tickets above pass AC and tests; CSP remains strict; no CDN; documentation updated (README, SECURITY, docs/roadmap.md linkage) and source lists include Arbeitnow.

