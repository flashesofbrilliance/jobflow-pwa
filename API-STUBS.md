# API STUBS (MVP Client-Only)

Until a FastAPI backend is available, the PWA runs locally on IndexedDB with shapes mirroring the future API.

## Contracts to Mirror Later
- `GET /profile` → local: `get('profile','profile')`
- `POST /profile` → local: `put('profile', payload)`
- `GET /opportunities` → local: `getAll('opportunities')`
- `POST /opportunities` → local: `bulkPut('opportunities', list)` or `put('opportunities', one)`
- `PATCH /opportunities/:id` → local: `put('opportunities', merged)`
- `POST /events` → local: `put('events', {name, ts, data})`
- `GET /analytics/snapshots` → local: `getAll('analytics_snapshots')`

## Shapes (see Database Schema doc)
- opportunities: identity, pipeline, scoring, planning, import, decision_context
- profile: stated, learned, gates, weights, tag_prefs, current_frame
- reflections: journaling items with sentiment/tags
- analytics_snapshots: weekly rollups

## Notes
- CSV import remains the ingest path (ATS → CSV via Node scripts); server-side import is optional future work.
- Keep shapes aligned so the client does not change when the API arrives.
