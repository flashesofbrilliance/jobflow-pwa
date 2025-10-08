# API Specifications: JobFlow/Satori

## Overview
Comprehensive FastAPI endpoint specifications for all core system services.

---

### Authentication
- `POST /auth/register`
  - Request: `{ email, password }`
  - Response: `{ user_id, token }`
- `POST /auth/login`
- `POST /auth/refresh`
- `DELETE /auth/logout`

---

### Frame Storming API
- `GET /frames/current` — Get user’s current search frame.
- `POST /frames/storm-session` — Create or update frame session.
  - Body: `{ frames, quality_score, detected_distortions }`
- `PUT /frames/commitment` — Finalize a clarified career frame.
- `GET /frames/evolution` — Review historical frame shifts.

---

### Discovery Engine API
- `GET /opportunities/discover?fit_min=70&energy_min=6`
- `POST /opportunities/score-batch`
  - Request: Array of opportunity objects and user profile.
  - Response: Array of scored opportunities.

---

### Haystack Scoring API
- `POST /haystack/score`
  - Request: `{ opportunity, user_profile, weights (optional) }`
  - Response: `{ composite_score, dimension_scores, bias_adjust
`

## MVP Note: Client-Only Operation

For the MVP PWA, all operations run locally with IndexedDB; API contracts remain the same so a FastAPI backend can be wired later without changing client logic. The following endpoints should be mirrored server-side:

- `GET/POST /profile` — gets/sets stated/learned preferences, gates, weights, current_frame.
- `GET/POST /opportunities` — list/create/update opportunities with scoring fields, planning, sessions, decision_context.
- `POST /events` — logs user actions (triage chips, accept/reject, session completion, reflections).
- `GET /analytics/snapshots` — returns weekly rollups; client computes snapshots locally until server is available.

Delta-only discovery is handled via Node scripts that resolve ATS links to CSV, which the PWA imports offline. Server-side import endpoints are optional future work.
