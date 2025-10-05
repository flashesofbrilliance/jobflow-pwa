# JobFlow PWA — Docs

This app optimizes a senior PM job search with an offline‑first PWA and a clear, single‑user workflow: Discovery → Qualification → Priority Kanban → Interview Intelligence → Learning Analytics. See `docs/roadmap.md` for the extensible plan and `docs/sprint-phase-b.md` for the sprint tickets.

## Feature Flags

Configure in the browser console before reload:

```javascript
window.JobFlowConfig = {
  enableDiscovery: false,    // RSS/API discovery
  enableQualification: false, // Review modal
  enableKanban: false,       // Enhanced Kanban
  enableAnalytics: false,    // Pattern insights
  enableImport: false,       // CSV import/export
  production: false          // Disable debug logging
};
```

All flags default to false; set to true and reload to enable.

## Online/Offline Modes

- Offline‑first: Installs as a PWA and caches the app shell (index, JS, CSS, manifest, SW). Works without internet after first load.
- Offline CSV import: Import roles when disconnected; data persists locally via IndexedDB.
- Online discovery (when enabled): Aggregates from free sources (RSS/API) with deduplication and auto‑scoring.

## CSV Import/Export

- Import template header (exact order):
```
company,role,sector,job_url,deadline,salary_range,location,remote_policy,contact_name,contact_linkedin,notes,fit_score
```
- Export: All application data (including stage, notes, and research) exports to CSV and can be re‑imported without data loss (same header).

## Stages

- Kanban columns: Research → To Apply → Applied → Interview → Offer/Reject
- Interview pipeline: Phone Screen → Technical → Behavioral → Panel → Final Decision

## Scoring and Priority

- Auto‑scoring (0–100): Role match 25 + Sector fit 25 + Remote 15 + Company health 15 + Referral potential 10 + Growth stage 10
- Priority badges: P0 (85–100) Red, P1 (70–84) Green, P2 (55–69) Yellow, P3 (<55) Gray
- Outreach queue: Sort by fit score → referral strength → deadline urgency

## Security & Console Hygiene

- CSP: `script-src 'self'; connect-src 'self'` to block external calls
- No external trackers (Sentry, mailTo.js, callTo.js) or noisy console logs in production

## PWA

- Manifest: `public/manifest.webmanifest` (start_url `./`, theme `#218085`)
- Service Worker: `public/sw.js` (cache app shell only)
- Installable on desktop and mobile; mobile UI is touch‑friendly

## Seed Data (Optional)

Pre‑populate the following opportunities for quick validation:

- Grammarly (Sr PM AI Writing) → To Apply, P0, deadline 10/15
- Perplexity AI (PM Ecosystem) → Applied, P0, deadline 10/20
- Base/Coinbase (Sr Manager Growth) → Interview, P1, deadline 10/01
- Transcarent (PM Care Navigation) → Research, P2, deadline 10/30
- Figma (PM AI Collaboration) → To Apply, P1, deadline 10/25

## Acceptance Tests

1. Console: Zero first‑party errors/warnings
2. PWA: Installs from browser, works offline after first load
3. Discovery: Finds 20+ roles OR imports CSV successfully
4. Qualification: Accept/reject 10 roles in <20 minutes
5. Kanban: Drag‑drop persists after refresh
6. Mobile: Touch interactions work on iPhone/Android
7. Export: CSV export → reimport preserves all data

## Discovery Sources
- WeWorkRemotely Product RSS
- Remotive search RSS (product manager)
- Jobicy jobs feed (filtered for product manager, remote)
- Remote OK Product Manager RSS
- Working Nomads Product RSS
- NoDesk remote jobs RSS (broad; filtered by title keywords)
 - Arbeitnow API (product manager; filtered by remote)

If you want to add more sources (e.g., Himalayas), add their domain to the CSP `connect-src` and include the RSS URL in the discovery list.

## Security Notes
- No CDN libraries. Bundle charting and other libraries locally to satisfy `script-src 'self'`.

## Scoring Configuration (Optional)
Customize via `window.JobFlowConfig.scoring` before reload:

```javascript
window.JobFlowConfig = {
  scoring: {
    weights: { role:25, sector:25, remote:15, health:15, referral:10, stage:10 },
    preferences: {
      sectors: ['ai','fintech','health','product','design'],
      companyHealth: { 'Grammarly': 0.9, 'Figma': 0.95 }, // 0..1 multiplier
      referrals: { 'Perplexity AI': true },
      companyStage: { 'Coinbase': 'public', 'Transcarent': 'scaleup' }
    }
  }
};
```
