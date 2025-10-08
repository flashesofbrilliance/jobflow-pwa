# Vendor: job-tracker-pro (reuse plan)

This folder is reserved for bringing in the upstream repo as a submodule so we can safely reuse utilities and UI primitives without replatforming.

## Add submodule (run in Hype IDE or your CI with network enabled)

```bash
cd jobflow-pwa
# Add the upstream repo as a submodule
git submodule add https://github.com/flashesofbrilliance/job-tracker-pro vendor/job-tracker-pro
cd vendor/job-tracker-pro

# Optional: sparse checkout only the parts we want
git sparse-checkout init --cone
# Adjust as needed
git sparse-checkout set \
  src/utils \
  src/components \
  src/features \
  src/lib
```

## Adopt via adapters (already scaffolded)
- Calendar helpers are centralized in `src/vendor-adapters/calendar.js`.
  - We can replace the internal implementations with imports from vendor utils without touching the rest of the app.
- UI primitives: create `src/vendor-adapters/ui.js` if needed to wrap dialog/progress/badges; or copy CSS only.

## Where to reuse first (low risk)
- ICS builder + Google Calendar deep link
- Date/time helpers (relative time, deadline badges)
- Chips/Badges/Progress CSS (triage/discovery)
- Triage/Discovery markup patterns (reason chips, list layout)
- Timer micro-interactions (if self-contained)

## Visual confirmation
- Use the local preview at `ui/preview/` to compare Native+Tokens vs vendor primitives before adopting anything.

## Notes
- All assets must be bundled locally (strict CSP, offline-first).
- Keep vendor code isolated under `vendor/` and referenced only via adapters to preserve portability.
