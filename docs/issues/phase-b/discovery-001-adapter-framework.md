Title: Discovery connectors framework (adapters)
Labels: phase: phase-b, type: feature, area: discovery
Estimate: 3d
Dependencies: Data Model v1 (entities, indices)

Description
Create an adapter interface and implement built-in connectors for RSS/API sources. Normalize fields, dedupe results, and surface per-source status.

Acceptance Criteria
- Adapter interface returns normalized items: id, title, company, url, location, posted_at, sector?, source, raw.
- Connectors implemented: WeWorkRemotely (RSS), Remotive (RSS), Jobicy (API), RemoteOK (RSS), Working Nomads (RSS), NoDesk (RSS), Himalayas (API), Arbeitnow (API).
- Dedupe by company+title within a 60-day window.
- Rate limiting per source; errors surfaced to telemetry.

Tasks
- Define TypeScript/JSDoc types for normalized item and adapter interface.
- Build RSS adapter utility and API adapter utility.
- Implement connectors listed above.
- Implement dedupe (company+title+window) and source run queue.
- Store per-source last run timestamp and counts in IDB.

Test Plan
- Unit test normalizer and dedupe logic.
- Playwright: run discovery; verify at least 2 sources populate; per-source status shows counts and timestamps; no console errors.

CSP/Privacy
- Add Arbeitnow and API domains to `connect-src` only when enabled; user-initiated fetches only.

Out of Scope
- Paid APIs; server-side proxies.

