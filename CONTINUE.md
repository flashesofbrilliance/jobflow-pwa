# CONTINUE

This document enables smooth handoff from Codex CLI to Hype IDE (or any Node 20 environment) with zero guesswork.

## Runbook
- Prereqs: Node 20 (see `.nvmrc`), npm 10
- Local dev: `cd jobflow-pwa && npm ci && npm run dev`
- Production preview: `npm run build && npm run preview`
- Deploy (CI auto): push to `main`/`master` — GH Actions publishes to `gh-pages`
- Manual deploy: `npm run deploy:gh`
 - PR preview: open/sync a PR touching `jobflow-pwa/**` — preview published to `gh-pages` under `pr/<number>/`
 - Auto-PR on push (Option B): Push any branch named `feat/**` and CI will automatically open/update a PR to `main` (workflow: `.github/workflows/auto-pr.yml`). This triggers PR Preview publishing to `gh-pages/pr/<PR_NUMBER>/`.
- Cross-repo QA deploy: Actions → “Cross-Repo Deploy to job-tracker-pro QA” (requires `GH_PAGES_TOKEN` secret with `repo` scope). Publishes to `flashesofbrilliance/job-tracker-pro` gh-pages at `env/qa/latest`.

## Secrets & Tokens (no obfuscation)
- We never commit tokens to the repo. Any token is stored in GitHub → Repo → Settings → Secrets and used by workflows only.
- `GH_PAGES_TOKEN` (only needed for cross-repo QA deploy):
  - Scope: `repo` (private) or `public_repo` (public repos)
  - Used by: `.github/workflows/deploy-to-jtp-qa.yml` as `personal_token` for publishing `dist` to `flashesofbrilliance/job-tracker-pro` `gh-pages/env/qa/latest`.
  - Not needed for PR Preview or Artifact builds.
- Submodules: all workflows use `actions/checkout@v4` with `submodules: true` — no extra secrets needed.

## Workflow Map (what uses what)
- `.github/workflows/pr-preview.yml`: builds and publishes preview to `gh-pages/pr/<number>/` in this repo (no secrets).
- `.github/workflows/build-artifact.yml`: builds and uploads `jobflow-pwa_dist.zip` as an artifact (no secrets).
- `.github/workflows/deploy.yml`: manual Pages deploy to this repo’s `gh-pages` (no extra secrets).
- `.github/workflows/deploy-to-jtp-qa.yml`: manual cross-repo deploy to job-tracker-pro `env/qa/latest` (requires `GH_PAGES_TOKEN`).

## Data Flow (MVP)
- Discovery: run delta-only fetcher to produce CSV, then import in app
  - `npm run detect:greenhouse && npm run detect:ats && npm run build:targets && npm run fetch:combined`
  - Outputs `output/target_sourced_YYYYMMDDTHH.csv` and updates `output/target_sourced.csv`
- Import: Discovery → Import CSV
- Everything persists to IndexedDB (offline-first)

## Feature Flags & Prefs
- `user_preferences.gated` (boolean): default true (gated Kanban view)
- `user_preferences.onboarding_pace` (relaxed|standard|focus|off): default standard
- `user_preferences.onboarding_countdown` (boolean): default true; respects prefers-reduced-motion
- `profile.gates`: `{ min_fit, min_energy }` used by triage accept gate

## Modules (where things live)
- PWA core: `jobflow-pwa/app.js`, `index.html`, `sw.js`, `manifest.json`
- Scoring: `src/scoring.js` (5-factor + honesty + barriers)
- Discovery fetchers (Node): `scripts/fetch-all.mjs` (+ detect/build scripts)
- Docs: `back-project/` (gold spec + MVP notes)
- UI Preview (WIP): `ui/preview/` (compare primitives visually)

## Phase 0 → Phase 1 (Implementation Plan)
- Phase 0 (ship in small slices):
  - Onboarding (chat + pacing): 90/60/120/Off modes with gentle countdown, pause/auto-extend, defaults + auto-fill, ICS/GCal planning
  - Frame Storming (minimal): elicit → distortions → reframe → commit `current_frame`
  - Kairos prompts P1–P3: plan-time culture mismatch; deadline proximity; discovery gates reasons
  - Today Queue & Timer polish: start/complete; two-line reflection
  - FPER baseline: `applied_at/interviewed_at/outcome` fields; 28-day rolling FPER card
- Phase 1 (guardrailed Haystack v2):
  - Scores with caps/neutral defaults; Timing/Alumni ≤10% each
  - Adaptive preferences (EWMA) for vibe axes & tags; triage chips; attribution & rollback

## Handoff to Hype IDE
- Node 20 baseline: see `.nvmrc`
- No runtime external fetches; CSP `'self'`; all assets local
- Vite `base:'./'` ensures Pages/static hosting works anywhere
- Tests not enforced yet; Playwright present if needed
- CI auto-deploy included (`.github/workflows/deploy.yml`)
 - PR previews included (`.github/workflows/pr-preview.yml`)

## Next To-Dos (High ROI)
- Implement Onboarding steps (UI + countdown + persistence)
- Minimal Frame Storming wizard + reflection/event logs
- Kairos prompts P1–P3 with consentful nudges
- FPER analytics card (28-day rolling), track gated vs force accept
- UI preview page (native vs shoelace vs pico/openprops) — local, CSP-safe
- Keyboard shortcuts global (T/A/R/S/C)
- Weekly digest scaffold & morning autoplan (deferred if compute-bound)

## API Stubs
- See `API-STUBS.md` for local ↔ FastAPI contract mapping.

## Notes
- SW cache bumped via `sw.js` version string
- If UI looks stale: hard-refresh or clear SW in DevTools
