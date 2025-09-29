# JobFlow PWA

A minimal, fast, offline‑capable app scaffold to manage a job search pipeline (Discovery → Qualification → Kanban). Uses Vite, a simple service worker, and IndexedDB via `idb`.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — build to `dist`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint
- `npm test` — run Playwright smoke test (starts preview server)

## PWA

- Manifest: `public/manifest.webmanifest`
- Service Worker: `public/sw.js` (cache‑first for same‑origin GETs)

## IndexedDB

See `src/store.js` for a tiny `idb` wrapper. On the homepage you can seed and clear sample opportunities.

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs lint, build, and Playwright smoke tests.

## Docker

Multi‑stage Dockerfile builds static assets and serves with Nginx. Config in `nginx.conf` with safe caching defaults for HTML and SW.

## Roadmap

Backlog lives in `TODO.md`.

