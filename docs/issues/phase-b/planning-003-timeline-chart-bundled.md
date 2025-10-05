Title: Timeline chart (bundled chart lib)
Labels: phase: phase-b, type: feature, area: planning
Estimate: 1.5d
Dependencies: planning-001-model-persistence.md

Description
Render applications timeline chart using a locally bundled chart library (no CDN) compliant with CSP.

Acceptance Criteria
- Timeline chart renders historical/forecast volume; no external network requests.
- Chart library is bundled locally; passes `script-src 'self'`.

Tasks
- Pick lightweight chart lib (or tree-shaken Chart.js) and bundle.
- Build chart component tied to planning data.
- Add resize handling and dark theme styles.

Test Plan
- Playwright: chart renders; verify no network calls to external origins.
- Lighthouse: zero third-party scripts.

