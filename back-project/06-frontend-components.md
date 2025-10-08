# Frontend Components: JobFlow/Satori React PWA

## Main App Structure
- `App.tsx` — Root, routes and layout

## Key UI Components

- **FrameStorming/**
  - `FrameStormingWizard`
  - `FrameQualityScore`
  - `ReframingModal`

- **Discovery/**
  - `DiscoveryFeed`
  - `OpportunityCard`
  - `BrutalHonestyTag`
  - `FitScoreBreakdown`
  - `EnergyPredictionMeter`

- **Kanban/**
  - `KanbanBoard`
  - `OpportunityColumn`
  - `DragDropProvider`

- **Reflection/**
  - `ReflectionPromptModal`
  - `JournalLogList`
  - `InsightTag`

- **Analytics/**
  - `PatternDashboard`
  - `FperTrendGraph`
  - `EnergyScoreTimeline`

## State Management
- Zustand store: user session, pipeline status, fit scores
- React Query: API data fetching/caching

## PWA Features
- `sw.js` for offline support
- `manifest.json` for installability
- IndexedDB (localStorage fallback) for persistence

## UI Patterns
- Progressive disclosure
- Accessible forms
- Responsive grid layouts

---

## MVP PWA (Vanilla ESM) Components (Current Build)

To satisfy strict CSP and offline constraints while delivering fast, the MVP implements a lightweight PWA with ESM modules and IndexedDB. These components map directly to the React plan above and can be migrated later without rethinking flows.

- ProfileModal — Work style sliders; gates (min fit/energy); learned vs stated deltas.
- TriagePanel — 5‑factor bars; culture dims; honesty/barriers; Plan & Timebox; Force Accept with reason.
- TodayModal — List of planned sessions; session timer; 2‑line reflection on complete.
- DiscoveryQueue — Gated by default; “Show all (with reasons)” toggle; quick Triage.
- KanbanBoard — Columns with drag/drop; card badges for Energy, Fit %, Honesty.
- AnalyticsCards — FPER, time‑to‑first‑interview, stage conversions; learned vs stated deltas.

UI Primitives: optionally use Shoelace Web Components (dialog, progress, badge, tabs) bundled locally for accessibility; keep CSS tokens as the visual system.
