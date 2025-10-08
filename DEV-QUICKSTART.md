# DEV QUICKSTART

- Node: use 20.x (see `.nvmrc`)
- Install: `npm ci`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Deploy (CI auto): push to `main` / `master`

## Data (CSV import)
- Fetch ATS roles (delta-only):
  - `npm run detect:greenhouse`
  - `npm run detect:ats`
  - `npm run build:targets`
  - `npm run fetch:combined`
- Then import `output/target_sourced.csv` via Discovery → Import CSV

## PWA notes
- Offline-first; strict CSP; no external runtime fetches in the app
- If UI looks stale: bump `sw.js` version or clear SW in DevTools

## Feature flags
- Gated view: header → Gated (default ON)
- Profile gates: header → Profile
- Today queue: header → Today

## Where to look
- Scoring: `src/scoring.js`
- PWA logic: `app.js`
- Fetchers: `scripts/*.mjs`
- Docs: `back-project/`
