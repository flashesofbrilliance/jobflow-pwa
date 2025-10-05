# Stale Artifacts / Tech & Infra Updates

Use this checklist to keep the code and docs aligned with the new plan.

## CDN / External Scripts
- Do not include CDN libraries (e.g., `cdn.jsdelivr.net/npm/chart.js`). Bundle charting locally. Reference: `docs/reference-ui.html` includes a CDN link for illustration only.

## CSP
- Verify `index.html` meta CSP remains: `script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' <allowlisted sources>;`.
- Add Arbeitnow API domain when enabling that connector.
- Document research provider domains prior to enabling research modal network calls.

## CI
- README mentions GitHub Actions workflow at `.github/workflows/ci.yml`. Ensure it exists and runs: lint, build, Playwright smoke, Lighthouse budget. If missing, add it or update README.

## Discovery Sources
- Keep `docs/README.md` Discovery Sources list in sync with adapters implemented. Current list includes Arbeitnow.

## Testing
- Expand Playwright tests to cover new tabs (Dashboard, Planning, Research modal). See `docs/sprint-phase-b.md` for specifics.

## Data Model
- Migrate schema to include scoring factors, planning config, and weekly progress counters. Ensure CSV 2.0 round-trip fidelity.

## Nginx / Docker
- Confirm `nginx.conf` disallows caching for HTML, sets correct content types for `.webmanifest`, and serves service worker with no-transform. Update if needed after Phase B features land.

