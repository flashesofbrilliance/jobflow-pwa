import { ensureDb, addSample, clearAll, countAll, upsertOpportunity, getAll, addQualificationReview, logEvent, getEventsByName, getQualificationReviews, exportJSON, getPlanningConfig, setPlanningConfig, rolloverWeeklyIfNeeded, updateOpportunity, deleteOpportunity } from './store.js';
import { computePriority, priorityBand } from './priority.js';

async function init() {
  await ensureDb();
  const countEl = document.getElementById('count');
  const seedBtn = document.getElementById('seed');
  const clearBtn = document.getElementById('clear');
  const csvInput = document.getElementById('csvInput');
  const discoverBtn = document.getElementById('discover');
  const exportBtn = document.getElementById('export');
  const importSummary = document.getElementById('importSummary');
  const rolesTable = document.getElementById('roles');
  const lastDisc = document.getElementById('lastDisc');
  const backupJson = document.getElementById('backupJson');
  const nsmTtq = document.getElementById('nsm-ttq');
  const nsmCsv = document.getElementById('nsm-csv');
  const nsmQual = document.getElementById('nsm-qual');
  const nsmMoves = document.getElementById('nsm-moves');

  // Dashboard elements
  const dashSection = document.getElementById('dashboardSection');
  const dashHigh = document.getElementById('dashHigh');
  const dashMed = document.getElementById('dashMed');
  const dashLow = document.getElementById('dashLow');
  const jobDetailModal = document.getElementById('jobDetailModal');
  const jobDetailBody = document.getElementById('jobDetailBody');
  const jobDetailClose = document.getElementById('jobDetailClose');
  const jobDetailSave = document.getElementById('jobDetailSave');
  const jobDetailDelete = document.getElementById('jobDetailDelete');
  const jobDetailResearch = document.getElementById('jobDetailResearch');
  const jobDetailModal = document.getElementById('jobDetailModal');
  const jobDetailBody = document.getElementById('jobDetailBody');
  const jobDetailClose = document.getElementById('jobDetailClose');

  // Planning elements
  const planSection = document.getElementById('planningSection');
  const planTargetDate = document.getElementById('planTargetDate');
  const planTargetInterviews = document.getElementById('planTargetInterviews');
  const planCbCold = document.getElementById('planCbCold');
  const planCbWarm = document.getElementById('planCbWarm');
  const planCbStrong = document.getElementById('planCbStrong');
  const planSave = document.getElementById('planSave');
  const weeklyCold = document.getElementById('weeklyCold');
  const weeklyWarm = document.getElementById('weeklyWarm');
  const totalApps = document.getElementById('totalApps');
  const progCold = document.getElementById('progCold');
  const progColdVal = document.getElementById('progColdVal');
  const progWarm = document.getElementById('progWarm');
  const progWarmVal = document.getElementById('progWarmVal');
  const coldInc = document.getElementById('coldInc');
  const coldDec = document.getElementById('coldDec');
  const warmInc = document.getElementById('warmInc');
  const warmDec = document.getElementById('warmDec');
  const progUndo = document.getElementById('progUndo');

  async function updateCount() {
    const n = await countAll();
    countEl.textContent = `IndexedDB opportunities: ${n}`;
  }

  seedBtn.addEventListener('click', async () => {
    // Seed five specified opportunities
    const now = new Date().toISOString().slice(0,10);
    const demo = [
      {company:'Grammarly', role:'Senior PM, AI Writing', job_url:'https://www.grammarly.com/jobs', stage:'To Apply', deadline:'2025-10-15', priority:'P0', source:'Seed', posted_at:now},
      {company:'Perplexity AI', role:'PM, Ecosystem', job_url:'https://www.perplexity.ai/careers', stage:'Applied', deadline:'2025-10-20', priority:'P0', source:'Seed', posted_at:now},
      {company:'Coinbase', role:'Sr Manager, Growth', job_url:'https://www.coinbase.com/careers', stage:'Interview', deadline:'2025-10-01', priority:'P1', source:'Seed', posted_at:now},
      {company:'Transcarent', role:'PM, Care Navigation', job_url:'https://www.transcarent.com/careers', stage:'Research', deadline:'2025-10-30', priority:'P2', source:'Seed', posted_at:now},
      {company:'Figma', role:'PM, AI Collaboration', job_url:'https://www.figma.com/careers', stage:'To Apply', deadline:'2025-10-25', priority:'P1', source:'Seed', posted_at:now},
    ];
    for (const r of demo) await upsertOpportunity(r);
    await updateCount();
    importSummary.textContent = `Seeded ${demo.length} records.`;
  });

  clearBtn.addEventListener('click', async () => {
    await clearAll();
    await updateCount();
    rolesTable.innerHTML = '';
    importSummary.textContent = '';
  });

  await updateCount();

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const statusEl = document.getElementById('sw-status');
      statusEl.textContent = reg.active ? '• Offline ready' : '• Registering…';
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  }

  // ---------- Qualification Modal ----------
  const qualModal = document.getElementById('qualModal');
  const qualForm = document.getElementById('qualForm');
  let currentQualId = null;

  function openQualModalFor(op) {
    currentQualId = op.id;
    const title = document.getElementById('qualTitle');
    if (title) title.textContent = `Qualify — ${op.company||''} · ${op.role||''}`;
    qualModal?.showModal?.();
  }

  document.addEventListener('keydown', (e)=>{
    if (!qualModal?.open) return;
    if (e.key==='a'||e.key==='A') qualForm.querySelector('input[value="accept"]').checked = true;
    if (e.key==='r'||e.key==='R') qualForm.querySelector('input[value="reject"]').checked = true;
    if (e.key==='Escape') qualModal.close();
  });
  document.getElementById('qualCancel')?.addEventListener('click', ()=> qualModal.close());
  document.getElementById('qualSave')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    if (currentQualId==null) { qualModal.close(); return; }
    const decision = qualForm.querySelector('input[name="decision"]:checked').value;
    const fitCat = document.getElementById('fitCat').value;
    const confidence = +document.getElementById('confidence').value;
    const tags = document.getElementById('tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const notes = document.getElementById('notes').value.trim();
    await addQualificationReview(currentQualId, { decision, fitCat, confidence, tags, notes });
    await logEvent(decision==='accept'?'qualify_accept':'qualify_reject', { opportunityId: currentQualId, fitCat, confidence, tags });
    const list = await getAll();
    const op = list.find(o=>o.id===currentQualId);
    if (op) {
      op.stage = decision==='accept'?'To Apply':'Offer/Reject';
      await upsertOpportunity(op);
    }
    qualModal.close();
    await refreshRolesTable();
    await updateNSM();
  });

  // ---------- Discovery (RSS) ----------
  function cfg() { return window.JobFlowConfig || {}; }
  function scoreOpportunity(o){
    const cfg = (window.JobFlowConfig||{}).scoring || {};
    const W = Object.assign({ role:25, sector:25, remote:15, health:15, referral:10, stage:10 }, cfg.weights||{});
    const prefs = Object.assign({
      sectors: ['ai','ml','fintech','health','product','design'],
      companyHealth: {},
      referrals: {},
      companyStage: {}
    }, cfg.preferences||{});
    let score = 0;
    const title = (o.role||'').toLowerCase();
    const company = (o.company||'').trim();
    if (/\b(product|pm|product manager|product management)\b/.test(title)) score += W.role;
    const sectorHit = prefs.sectors.some(k => title.includes(k.toLowerCase()));
    if (sectorHit) score += W.sector;
    if (/remote/.test(title) || /weworkremotely|remotive|remoteok|workingnomads|nodesk/.test((o.source||'').toLowerCase())) score += W.remote;
    const health = prefs.companyHealth[company];
    if (typeof health === 'number') score += Math.round(W.health * Math.max(0, Math.min(1, health)));
    if (prefs.referrals[company]) score += W.referral;
    const stage = (prefs.companyStage[company]||'').toLowerCase();
    if (stage==='startup') score += W.stage;
    else if (stage==='scaleup') score += Math.round(W.stage*0.7);
    else if (stage==='public') score += Math.round(W.stage*0.5);
    return Math.max(0, Math.min(100, score));
  }
  function within60Days(iso){
    try { const d = new Date(iso); return (Date.now() - d.getTime()) <= 60*24*3600*1000; } catch { return true; }
  }
  async function fetchRSS(url){
    const res = await fetch(url, { cache:'no-cache' });
    const txt = await res.text();
    const doc = new DOMParser().parseFromString(txt, 'application/xml');
    const items = [...doc.querySelectorAll('item')];
    return items.map(it=>({
      company: (it.querySelector('source,author')?.textContent || '').trim(),
      role: (it.querySelector('title')?.textContent || '').trim(),
      job_url: (it.querySelector('link')?.textContent || '').trim(),
      source: new URL(url).hostname,
      posted_at: (it.querySelector('pubDate')?.textContent || '').trim()
    }));
  }
  async function discoverRoles(){
    const sources = [
      'https://weworkremotely.com/categories/remote-product-jobs.rss',
      'https://remotive.com/remote-jobs/rss?search=product%20manager',
      'https://jobicy.com/?feed=job_feed&search_keywords=product%20manager&remote=on',
      'https://remoteok.com/remote-product+manager-jobs.rss',
      'https://www.workingnomads.com/jobs.rss?category=product',
      'https://nodesk.co/remote-jobs/rss.xml',
      'https://remote.co/remote-jobs/product/feed/'
    ];
    const results = [];
    for (const s of sources) {
      try { results.push(...await fetchRSS(s)); }
      catch (e) { console.warn('Discovery source failed', s, e); }
    }
    const seen = new Set();
    const normalized = [];
    for (const r of results) {
      const key = (r.company||'')+'|'+(r.role||'');
      if (seen.has(key)) continue; seen.add(key);
      if (r.posted_at && !within60Days(r.posted_at)) continue;
      normalized.push({...r, fit_score: scoreOpportunity(r), stage:'Research'});
    }
    rolesTable.innerHTML = renderTableEnhanced(normalized);
    let added = 0, skipped = 0;
    for (const r of normalized) {
      try { await upsertOpportunity(r); added++; } catch { skipped++; }
    }
    importSummary.textContent = `Discovered ${added} new; skipped ${skipped} duplicates.`;
    await logEvent('discovery_run', { sources: sources.length, discovered: normalized.length, inserted: added, skipped });
    const runs = await getEventsByName('discovery_run');
    if (lastDisc) lastDisc.textContent = runs?.length ? new Date(runs[runs.length-1].ts).toLocaleString() : '–';
    await updateCount();
  }
  discoverBtn?.addEventListener('click', ()=>{
    if (!cfg().enableDiscovery) { importSummary.textContent = 'Discovery disabled (toggle window.JobFlowConfig.enableDiscovery = true)'; return; }
    discoverRoles();
  });

  // ---------- Import CSV (exact header) ----------
  const SPEC_HEADER = ['company','role','sector','job_url','deadline','salary_range','location','remote_policy','contact_name','contact_linkedin','notes','fit_score'];
  let previewRows = null;
  let previewErrors = null;
  csvInput?.addEventListener('change', async (e)=>{
    if (!cfg().enableImport) { importSummary.textContent = 'Import disabled (toggle window.JobFlowConfig.enableImport = true)'; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const txt = await f.text();
    const lines = txt.split(/\r?\n/);
    const header = lines.shift()?.split(',').map(s=>s.trim()) || [];
    if (header.length !== SPEC_HEADER.length || header.some((h,i)=>h!==SPEC_HEADER[i])) {
      importSummary.textContent = 'Header mismatch. Use docs/csv_templates/discovery_import_template.csv';
      return;
    }
    await logEvent('csv_import_start', { rowsAttempted: lines.length });
    previewErrors = []; previewRows = [];
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      let cols;
      try {
        cols = line.match(/\"([^\"]*(?:\"\"[^\"]*)*)\"(?=,|$)/g)?.map(s=>s.slice(1,-1).replace(/\"\"/g,'"')) || line.split(',');
      } catch { cols = line.split(','); }
      if (cols.length < SPEC_HEADER.length) {
        previewErrors.push({ line: idx+2, error: 'Too few columns' });
      }
      const o = Object.fromEntries(SPEC_HEADER.map((k,i)=>[k, (cols[i]||'').trim()]));
      const errs = [];
      if (!o.company) errs.push('company');
      if (!o.role) errs.push('role');
      if (!o.job_url) errs.push('job_url');
      previewRows.push({ ...o, __errors: errs });
    });
    rolesTable.innerHTML = renderPreviewTable(previewRows, previewErrors);
    importSummary.textContent = previewErrors.length ? `Preview: ${previewRows.length} rows, ${previewErrors.length} line errors. Press Enter to import or Esc to cancel.` : `Preview: ${previewRows.length} rows. Press Enter to import or Esc to cancel.`;
    function onKey(e){ if (e.key==='Enter') { e.preventDefault(); doImport(); } if (e.key==='Escape') { e.preventDefault(); cancelPreview(); } }
    document.addEventListener('keydown', onKey, { once: false });
    async function doImport(){
      document.removeEventListener('keydown', onKey, false);
      let added = 0, skipped = 0;
      for (const r of previewRows) { try { await upsertOpportunity(r); added++; } catch { skipped++; } }
      rolesTable.innerHTML = renderTableEnhanced(previewRows);
      await logEvent('csv_import_complete', { rowsAttempted: previewRows.length, rowsImported: added, skipped });
      importSummary.textContent = `Imported ${added}; skipped ${skipped} duplicates.`;
      previewRows = null; previewErrors = null;
      await updateCount();
      await updateNSM();
    }
    function cancelPreview(){
      document.removeEventListener('keydown', onKey, false);
      previewRows = null; previewErrors = null;
      rolesTable.innerHTML = '';
      importSummary.textContent = 'Import canceled.';
    }
  });

  // ---------- Export CSV ----------
  exportBtn?.addEventListener('click', async ()=>{
    const list = await getAll();
    const header = SPEC_HEADER;
    const lines = [header.join(',')];
    for (const o of list) {
      const row = header.map(k=>`"${String(o[k]||'').replace(/"/g,'""')}"`);
      lines.push(row.join(','));
    }
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jobflow_export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---------- Render table ----------
  function renderTable(list){
    const th = '<tr><th>Company</th><th>Role</th><th>URL</th><th>Fit</th></tr>';
    const rows = list.map(o=>`<tr><td>${o.company||''}</td><td>${o.role||''}</td><td>${o.job_url?`<a href="${o.job_url}" target="_blank">open</a>`:''}</td><td>${o.fit_score??''}</td></tr>`).join('');
    return `<tbody>${th}${rows}</tbody>`;
  }

  // Initial render from DB
  const existing = await getAll();
  if (existing.length) rolesTable.innerHTML = renderTable(existing);

  // Enhanced table renderer with Qualify action
  function renderTableEnhanced(list){
    const th = '<tr><th>Company</th><th>Role</th><th>URL</th><th>Fit</th><th></th></tr>';
    const rows = list.map(o=>`<tr><td>${o.company||''}</td><td>${o.role||''}</td><td>${o.job_url?`<a href=\"${o.job_url}\" target=\"_blank\">open</a>`:''}</td><td>${o.fit_score??''}</td><td>${o.id?`<button data-id=\"${o.id}\" class=\"qbtn\">Qualify</button>`:''}</td></tr>`).join('');
    return `<tbody>${th}${rows}</tbody>`;
  }

  // Preview table for CSV validation
  function renderPreviewTable(list, lineErrors){
    const th = '<tr><th>Line</th><th>Company</th><th>Role</th><th>URL</th><th>Errors</th></tr>';
    const rows = (list||[]).map((o,i)=>`<tr><td>${i+2}</td><td>${o.company||''}</td><td>${o.role||''}</td><td>${o.job_url||''}</td><td>${(o.__errors||[]).join(' ')}</td></tr>`).join('');
    const other = (lineErrors||[]).map(e=>`<tr><td>${e.line}</td><td colspan=\"4\" style=\"color:#f59e0b\">${e.error}</td></tr>`).join('');
    return `<tbody>${th}${rows}${other}</tbody>`;
  }

  // Qualify action handler
  rolesTable.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button.qbtn');
    if (!btn) return;
    const id = parseInt(btn.getAttribute('data-id'),10);
    const list = await getAll();
    const op = list.find(o=>o.id===id);
    if (op) openQualModalFor(op);
  });

  async function refreshRolesTable(){
    const list = await getAll();
    rolesTable.innerHTML = renderTableEnhanced(list);
  }

  async function updateNSM(){
    const imports = await getEventsByName('csv_import_complete');
    if (imports?.length) {
      const last = imports[imports.length-1];
      const { rowsAttempted=0, rowsImported=0 } = last.data||{};
      if (nsmCsv) nsmCsv.textContent = `CSV success rate (last): ${rowsAttempted?Math.round((rowsImported/rowsAttempted)*100):0}%`;
    } else {
      if (nsmCsv) nsmCsv.textContent = 'CSV success rate (last): –';
    }
    const reviews = await getQualificationReviews();
    if (reviews?.length) {
      if (nsmTtq) nsmTtq.textContent = `TtQ (count): ${reviews.length} reviewed`;
      if (nsmQual) nsmQual.textContent = `Qualification modal usage (session): ${reviews.length}`;
    } else {
      if (nsmTtq) nsmTtq.textContent = 'TtQ (7/30d): –';
      if (nsmQual) nsmQual.textContent = 'Qualification modal usage (session): –';
    }
    if (nsmMoves) nsmMoves.textContent = 'Kanban moves coverage: n/a (Phase 2)';
  }

  // JSON backup
  backupJson?.addEventListener('click', async ()=>{
    const data = await exportJSON();
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jobflow_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Replace simple table with enhanced one and update NSM
  await refreshRolesTable();
  const runs = await getEventsByName('discovery_run');
  if (lastDisc) lastDisc.textContent = runs?.length ? new Date(runs[runs.length-1].ts).toLocaleString() : '–';
  await updateNSM();

  // ----- Dashboard (Priority bands) -----
  if (window.JobFlowConfig?.enableDashboard) {
    dashSection.style.display = 'block';
    await renderDashboard();
    await enhanceDashboard();
  }

  // ----- Planning (Backward calculator) -----
  if (window.JobFlowConfig?.enablePlanning) {
    planSection.style.display = 'block';
    await initPlanning();
  }

  async function renderDashboard() {
    const list = await getAll();
    const scored = list.map(o=>({ ...o, __score: computePriority(o), __band: null })).map(o=>({ ...o, __band: priorityBand(o.__score) }));
    const byBand = { High: [], Medium: [], Low: [] };
    for (const o of scored) byBand[o.__band].push(o);
    const renderCard = (o)=>`<div class="card" style="margin:8px 0;padding:12px"><div style="font-weight:700">${o.company||''} — ${o.role||''}</div><div style="opacity:.85">Score: ${o.__score} · Stage: ${o.stage||''}${o.deadline?` · Due: ${o.deadline}`:''}</div></div>`;
    dashHigh.innerHTML = byBand.High.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style="opacity:.7">No high priority items</p>';
    dashMed.innerHTML = byBand.Medium.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style="opacity:.7">No medium priority items</p>';
    dashLow.innerHTML = byBand.Low.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style="opacity:.7">No low priority items</p>';
  }

  // Enhanced dashboard renderer: adds SLA icons and click → Job Detail
  async function enhanceDashboard() {
    const list = await getAll();
    const scored = list.map(o=>({ ...o, __score: computePriority(o), __band: null })).map(o=>({ ...o, __band: priorityBand(o.__score) }));
    const byBand = { High: [], Medium: [], Low: [] };
    for (const o of scored) byBand[o.__band].push(o);
    const daysUntil = (iso)=>{
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d)) return null;
      const ms = d.setHours(23,59,59,999) - Date.now();
      return Math.ceil(ms / (1000*60*60*24));
    };
    const slaIcon = (iso)=>{
      const days = daysUntil(iso);
      if (days == null) return '';
      if (days < 0) return '🔴';
      if (days <= 3) return '🟡';
      return '🟢';
    };
    const renderCard = (o)=>{
      const due = o.deadline ? `${slaIcon(o.deadline)} Due: ${o.deadline}` : '';
      return `<div class=\"card job-card\" data-id=\"${o.id}\" style=\"margin:8px 0;padding:12px;cursor:pointer\"><div style=\"font-weight:700\">${o.company||''} — ${o.role||''}</div><div style=\"opacity:.85\"><span style=\"background:#0ea5e9;color:#001018;padding:2px 6px;border-radius:6px;font-weight:700\">${o.__score}</span> · Stage: ${o.stage||''}${due?` · ${due}`:''}</div></div>`;
    };
    dashHigh.innerHTML = byBand.High.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style=\"opacity:.7\">No high priority items</p>';
    dashMed.innerHTML = byBand.Medium.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style=\"opacity:.7\">No medium priority items</p>';
    dashLow.innerHTML = byBand.Low.sort((a,b)=>b.__score-a.__score).map(renderCard).join('')||'<p style=\"opacity:.7\">No low priority items</p>';
  }

  function openJobDetail(op) {
    if (!jobDetailModal || !jobDetailBody) return;
    const stageOpts = ['Research','To Apply','Applied','Interview','Offer/Reject'];
    const form = `
      <div style=\"margin:4px 0\"><strong>Company:</strong> ${op.company||''}</div>
      <div style=\"margin:4px 0\"><strong>Role:</strong> ${op.role||''}</div>
      <div style=\"margin:6px 0\"><label>Stage <select id=\"jdStage\">${stageOpts.map(s=>`<option ${s===(op.stage||'')?'selected':''}>${s}</option>`).join('')}</select></label></div>
      <div style=\"margin:6px 0\"><label>Deadline <input id=\"jdDeadline\" type=\"date\" value=\"${op.deadline||''}\"></label></div>
      <div style=\"margin:6px 0\"><label>Notes <textarea id=\"jdNotes\" rows=\"3\">${op.notes||''}</textarea></label></div>
      <div style=\"margin:6px 0\"><strong>Priority:</strong> ${computePriority(op)}</div>
      <div style=\"margin:6px 0\">URL: ${op.job_url?`<a href=\"${op.job_url}\" target=\"_blank\">open</a>`:''}</div>
    `;
    jobDetailBody.innerHTML = form;
    jobDetailModal.dataset.id = String(op.id||'');
    jobDetailModal.showModal?.();
  }

  async function saveJobDetail() {
    const id = Number(jobDetailModal?.dataset?.id||'0');
    if (!id) return;
    const stage = document.getElementById('jdStage')?.value || '';
    const deadline = document.getElementById('jdDeadline')?.value || '';
    const notes = document.getElementById('jdNotes')?.value || '';
    await updateOpportunity(id, { stage, deadline, notes });
    await logEvent('job_update', { id, stage, deadline });
    await refreshRolesTable();
    await enhanceDashboard();
    jobDetailModal?.close?.();
  }

  async function deleteJobDetail() {
    const id = Number(jobDetailModal?.dataset?.id||'0');
    if (!id) return;
    await deleteOpportunity(id);
    await logEvent('job_delete', { id });
    await refreshRolesTable();
    await enhanceDashboard();
    jobDetailModal?.close?.();
  }

  async function researchJobDetail() {
    const id = Number(jobDetailModal?.dataset?.id||'0');
    await logEvent('job_research', { id });
    alert('Research placeholder: capture notes and insights.');
  }

  jobDetailSave?.addEventListener('click', (e)=>{ e.preventDefault(); saveJobDetail(); });
  jobDetailDelete?.addEventListener('click', (e)=>{ e.preventDefault(); deleteJobDetail(); });
  jobDetailResearch?.addEventListener('click', (e)=>{ e.preventDefault(); researchJobDetail(); });

  jobDetailClose?.addEventListener('click', ()=> jobDetailModal?.close?.());
  jobDetailModal?.addEventListener('click', (e)=>{
    const r = jobDetailModal.getBoundingClientRect();
    const clickedOutside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (clickedOutside) jobDetailModal?.close?.();
  });

  document.addEventListener('click', async (e)=>{
    const card = e.target.closest?.('.job-card');
    if (!card) return;
    const id = Number(card.getAttribute('data-id'));
    if (!id) return;
    const list = await getAll();
    const op = list.find(o=>o.id===id);
    if (op) openJobDetail(op);
  });

  async function initPlanning() {
    await rolloverWeeklyIfNeeded();
    const cfg = await getPlanningConfig();
    // populate inputs
    if (cfg.targetDate) planTargetDate.value = cfg.targetDate;
    planTargetInterviews.value = cfg.targetInterviews ?? 5;
    planCbCold.value = cfg.callbacks?.cold ?? 8;
    planCbWarm.value = cfg.callbacks?.warm ?? 40;
    planCbStrong.value = cfg.callbacks?.strong ?? 60;
    await renderPlanningOutputs();
    planSave.addEventListener('click', async ()=>{
      const next = {
        targetDate: planTargetDate.value || '',
        targetInterviews: Number(planTargetInterviews.value)||5,
        callbacks: { cold: Number(planCbCold.value)||8, warm: Number(planCbWarm.value)||40, strong: Number(planCbStrong.value)||60 }
      };
      await setPlanningConfig(next);
      await renderPlanningOutputs();
    });
    
    async function pushHistory(entry) {
      const cfg = await getPlanningConfig();
      cfg.weeklyHistory = [...(cfg.weeklyHistory||[]), { ...entry, ts: new Date().toISOString() }];
      await setPlanningConfig(cfg);
    }
    async function applyDelta(type, delta) {
      const cfg = await getPlanningConfig();
      const cur = cfg.weeklyProgress || { cold:0, warm:0 };
      const nextVal = Math.max(0, (cur[type]||0) + delta);
      cfg.weeklyProgress = { ...cur, [type]: nextVal };
      await setPlanningConfig(cfg);
      await renderPlanningOutputs();
    }
    async function undoLast() {
      const cfg = await getPlanningConfig();
      const hist = [...(cfg.weeklyHistory||[])];
      const last = hist.pop();
      if (!last) return;
      cfg.weeklyHistory = hist;
      const type = last.type;
      const delta = -last.delta; // inverse
      const cur = cfg.weeklyProgress || { cold:0, warm:0 };
      cfg.weeklyProgress = { ...cur, [type]: Math.max(0, (cur[type]||0) + delta) };
      await setPlanningConfig(cfg);
      await logEvent('planning_undo', { type, delta });
      await renderPlanningOutputs();
    }

    coldInc.addEventListener('click', async ()=>{
      await pushHistory({ type:'cold', delta:+1 });
      await logEvent('planning_adjust', { type:'cold', delta:+1 });
      await applyDelta('cold', +1);
    });
    coldDec.addEventListener('click', async ()=>{
      await pushHistory({ type:'cold', delta:-1 });
      await logEvent('planning_adjust', { type:'cold', delta:-1 });
      await applyDelta('cold', -1);
    });
    warmInc.addEventListener('click', async ()=>{
      await pushHistory({ type:'warm', delta:+1 });
      await logEvent('planning_adjust', { type:'warm', delta:+1 });
      await applyDelta('warm', +1);
    });
    warmDec.addEventListener('click', async ()=>{
      await pushHistory({ type:'warm', delta:-1 });
      await logEvent('planning_adjust', { type:'warm', delta:-1 });
      await applyDelta('warm', -1);
    });
    progUndo?.addEventListener('click', async ()=>{ await undoLast(); });
  }

  function weeksBetween(startISO, endISO) {
    if (!startISO || !endISO) return 12; // default horizon
    const start = new Date();
    const end = new Date(endISO);
    const diff = Math.max(0, end - start);
    return Math.max(1, Math.ceil(diff / (1000*60*60*24*7)));
  }

  async function renderPlanningOutputs() {
    const cfg = await getPlanningConfig();
    const weeks = weeksBetween(new Date().toISOString(), cfg.targetDate);
    // Simple model: assume interviews target split 50/50 warm:cold for planning
    const warmRate = (cfg.callbacks?.warm||40)/100;
    const coldRate = (cfg.callbacks?.cold||8)/100;
    const warmNeeded = Math.ceil((cfg.targetInterviews||5) * 0.5 / Math.max(0.01, warmRate));
    const coldNeeded = Math.ceil((cfg.targetInterviews||5) * 0.5 / Math.max(0.01, coldRate));
    const weeklyWarmTarget = Math.max(1, Math.ceil(warmNeeded / weeks));
    const weeklyColdTarget = Math.max(1, Math.ceil(coldNeeded / weeks));
    weeklyWarm.textContent = `${weeklyWarmTarget}`;
    weeklyCold.textContent = `${weeklyColdTarget}`;
    totalApps.textContent = `${warmNeeded + coldNeeded}`;
    // progress bars
    const p = cfg.weeklyProgress || { cold: 0, warm: 0 };
    progColdVal.textContent = String(p.cold);
    progWarmVal.textContent = String(p.warm);
    progCold.style.width = `${Math.min(100, Math.round((p.cold/weeklyColdTarget)*100))}%`;
    progWarm.style.width = `${Math.min(100, Math.round((p.warm/weeklyWarmTarget)*100))}%`;
  }
}

init();
