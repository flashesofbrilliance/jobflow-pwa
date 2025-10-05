# 📋 TODO.md — JobFlow-PWA Sequenced Plan

Note: For the extensible roadmap with dependencies and phased plan, see `docs/roadmap.md`.

## 🎯 Goal
Data‑driven PM job search that discovers roles, qualifies in <2 minutes, prioritizes outreach, tracks pipeline, and learns from outcomes.

---

## Implementation Sequence (Do in this order)

### STEP 1: Fix Console & PWA
- [ ] Remove external trackers (Sentry, mailTo.js, callTo.js) and production console noise
- [ ] Manifest: `start_url: "./"`, theme `#218085`, icons up to date
- [ ] Service worker caches app shell only (index, JS, CSS, manifest)
- [ ] Add CSP: `script-src 'self'; connect-src 'self'`
- Test: Manifest loads (200), PWA installs, zero first‑party console errors

### STEP 2: Progressive Discovery
- [ ] Online sources: WeWorkRemotely PM RSS, Himalayas API, Remotive RSS, Jobicy API
- [ ] Auto‑scoring: 25 Role match + 25 Sector fit + 15 Remote + 15 Company health + 10 Referral + 10 Stage
- [ ] Deduplication: same company+role within 60 days
- [ ] Offline CSV import with header: `company,role,sector,job_url,deadline,salary_range,location,remote_policy,contact_name,contact_linkedin,notes,fit_score`
- Test: 20+ roles from 2+ sources in 60s OR imports CSV with custom weights

### STEP 3: Qualification Review
- [ ] Review modal: Accept/Reject + fit category (Strong/Good/Stretch/Poor) + reason + confidence (0–100) + notes
- [ ] Hotkeys: A=Accept, R=Reject, E=Edit notes, Esc=Close
- [ ] Flow: Accept → Kanban queue; Reject → Archive with reasoning
- Test: Qualify 10 roles in 15–20 minutes with full reasoning captured

### STEP 4: Priority Kanban
- [ ] Columns: Research → To Apply → Applied → Interview → Offer/Reject
- [ ] Priority badges: P0 (85–100) Red, P1 (70–84) Green, P2 (55–69) Yellow, P3 (<55) Gray
- [ ] Deadline alerts: 🔴 overdue, 🟡 ≤3 days, 🟢 >3 days
- [ ] Outreach queue: Sort by fit score → referral strength → deadline urgency
- Test: Drag‑drop persists, priorities color‑coded, deadlines sorted by urgency

### STEP 5: Interview Intelligence
- [ ] Stages: Phone Screen → Technical → Behavioral → Panel → Final Decision
- [ ] Research: Company news, interviewer backgrounds, talking points, prep notes
- [ ] Auto‑save notes ≤300ms after typing; offline safe
- Test: Interview prep usable offline; pipeline stage tracking works

### STEP 6: Learning Analytics
- [ ] Conversion funnel: Discovery → Qualified → Applied → Interview → Offer (7‑day and 30‑day)
- [ ] Pattern insights: common rejection reasons, best sources, success factors
- [ ] Weight suggestions: e.g., “Increase Remote to 20pts based on 80% acceptance”
- Test: Realistic conversion rates with actionable recommendations

---

## Files To Deliver
- `dist/` single‑page app build
- `docs/README.md` — feature flags, modes, CSV format
- `docs/TESTING_REPORT.md` — pass/fail for each acceptance test
- `csv_templates/discovery_import_template.csv` — exact import header

---

## Acceptance Tests (Must pass)
1. Console: Zero first‑party errors/warnings in Chrome DevTools
2. PWA: Installs from browser, works offline after first load
3. Discovery: Finds 20+ roles OR imports CSV successfully
4. Qualification: Accept/reject 10 roles in <20 minutes
5. Kanban: Drag‑drop persists after page refresh
6. Mobile: Touch interactions work on iPhone/Android
7. Export: CSV export → reimport preserves all data

---

## Feature Flags (toggle via console)
```javascript
window.JobFlowConfig = {
  enableDiscovery: false,
  enableQualification: false,
  enableKanban: false,
  enableAnalytics: false,
  enableImport: false,
  production: false
};
```

---

## Definition of DONE
- ✅ Console clean (no first‑party errors)
- ✅ PWA installs and works offline
- ✅ Can import existing PM opportunities
- ✅ Qualification review <2 minutes per role
- ✅ Outreach queue prioritizes by fit + deadlines
- ✅ All application data persists across sessions
- ✅ Analytics provide actionable insights
- ✅ Export preserves complete state

- [ ] Color contrast passes WCAG AA  
