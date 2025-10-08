# JobFlow PWA V0

Privacy-first, offline-capable PWA for job discovery, structured qualification, Kanban tracking, archive/learning, and analytics. 100% client-side; no external dependencies or trackers.

## Run locally
- Serve over HTTP (required for service worker):
  - Python: `python3 -m http.server 5173`
  - Node: `npx http-server -p 5173` (if available)
- Open: `http://localhost:5173/`
- First load seeds 5 sample opportunities and registers the service worker.

## Offline test
- After first load, go offline and reload. Kanban and all data remain available.
- “Add to Home Screen” should be offered; manifest and sw are present.

## Capability model
```
capabilities = {
  discoveryAvailable: navigator.onLine && sourcesConfigured, // feeds disabled in V0 due to strict CSP
  qualificationAvailable: hasIndexedDB && hasData,
  archiveAvailable: hasQualificationReviews,
  analyticsAvailable: hasArchiveData
}
```

## Privacy & CSP
- Strict CSP is enforced via `<meta http-equiv="Content-Security-Policy" ...>`:
  - `script-src 'self'; connect-src 'self'; img-src 'self' data:; worker-src 'self'`
- To test external feeds (WeWorkRemotely, Himalayas, Remotive), relax `connect-src` to include those origins. CSV import remains fully offline.

## Data model (stores)
- `opportunities`: `{id, company, role, status, priority_score, fit_score, deadline, notes, job_url, hash, created_at}`
- `qualification_reviews`: `{id, opportunity_id, decision, fit_category, objections[], exclusions[], confidence, briefing_text, reviewed_at}`
- `kanban_state`: `{column_id, opportunity_ids[]}`
- `research_intel`: `{id, opportunity_id, intel_type, source, data, confidence}`
- `user_preferences`: `{key, value}`
- `meta`: `{key, value}` (e.g., `appVersion`, `schema_version`)

## Quality gates (V0)
- Console: no errors on happy path
- Network: no external requests
- PWA: `manifest.json` and `sw.js` serve 200; installable
- Offline: reload shows Kanban
- Functionality: drag-drop persists; qualification modal works
- Mobile: responsive, touch-friendly cards/columns

## CSV template
See `csv_templates/discovery_import_template.csv`. Required headers:
`company,role,job_url,status,priority_score,fit_score,deadline,notes`

