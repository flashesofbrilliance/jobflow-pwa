import { ensureDb, addSample, clearAll, countAll, upsertOpportunity, getAll } from './store.js';

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
    rolesTable.innerHTML = renderTable(normalized);
    let added = 0, skipped = 0;
    for (const r of normalized) {
      try { await upsertOpportunity(r); added++; } catch { skipped++; }
    }
    importSummary.textContent = `Discovered ${added} new; skipped ${skipped} duplicates.`;
    await updateCount();
  }
  discoverBtn?.addEventListener('click', ()=>{
    if (!cfg().enableDiscovery) { importSummary.textContent = 'Discovery disabled (toggle window.JobFlowConfig.enableDiscovery = true)'; return; }
    discoverRoles();
  });

  // ---------- Import CSV (exact header) ----------
  const SPEC_HEADER = ['company','role','sector','job_url','deadline','salary_range','location','remote_policy','contact_name','contact_linkedin','notes','fit_score'];
  csvInput?.addEventListener('change', async (e)=>{
    if (!cfg().enableImport) { importSummary.textContent = 'Import disabled (toggle window.JobFlowConfig.enableImport = true)'; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const txt = await f.text();
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(',').map(s=>s.trim()) || [];
    if (header.length !== SPEC_HEADER.length || header.some((h,i)=>h!==SPEC_HEADER[i])) {
      importSummary.textContent = 'Header mismatch. Use docs/csv_templates/discovery_import_template.csv';
      return;
    }
    let added = 0, skipped = 0; const parsed = [];
    for (const line of lines) {
      const cols = line.match(/\"([^\"]*(?:\"\"[^\"]*)*)\"(?=,|$)/g)?.map(s=>s.slice(1,-1).replace(/\"\"/g,'"'))
        || line.split(',');
      const o = Object.fromEntries(SPEC_HEADER.map((k,i)=>[k, cols[i]||'']));
      parsed.push(o);
      try { await upsertOpportunity(o); added++; } catch { skipped++; }
    }
    rolesTable.innerHTML = renderTable(parsed);
    importSummary.textContent = `Imported ${added}; skipped ${skipped} duplicates.`;
    await updateCount();
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
}

init();
