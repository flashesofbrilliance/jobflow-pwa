// JobFlow PWA - App Core (ESM, no deps)
const APP_VERSION = '1.2.0';
const DB_NAME = 'jobflow';
const DB_VERSION = 7; // add profile/reflections/analytics/goals stores

const DEFAULT_STAGES = [
  { id: 'research', name: 'Research' },
  { id: 'to-apply', name: 'To Apply' },
  { id: 'applied', name: 'Applied' },
  { id: 'interview', name: 'Interview' },
  { id: 'offer', name: 'Offer/Reject' }
];
let STAGES = DEFAULT_STAGES.map(x=>({...x}));

const PRIORITY_COLORS = { P0: '#FF5459', P1: '#22C55E', P2: '#F59E0B', P3: '#6B7280' };
const OBJECTION_TAGS = ['RoleMismatch','Location','Compensation','Stage','Timing','Culture','Health'];
const EXCLUSION_FLAGS = ['RoleMismatch','Location','Compensation','Stage','Timing','Culture','Health'];

// CSV header synonyms for smarter auto-mapping
const HEADER_SYNONYMS = {
  company: ['company','employer','org','organization','company_name'],
  role: ['role','title','position','job_title','role title'],
  job_url: ['job_url','url','link','job_link','posting','posting_url','direct job link'],
  status: ['status','stage','pipeline','column','application stage'],
  priority_score: ['priority_score','priority','prio','score_priority'],
  fit_score: ['fit_score','fit','match','score_fit'],
  fit_flag: ['fit_flag','fit flag','fit rating'],
  deadline: ['deadline','due','due_date','apply_by','application_deadline'],
  posted_at: ['posted_at','posted','posted at','date posted','post_date'],
  applicant_volume: ['applicant_volume','applicants','apps','apps_count','applicant count','volume'],
  interest_score: ['interest','interest_score','interest score'],
  location: ['location','city','region'],
  segment: ['segment','industry','segment / industry','sector'],
  notes: ['notes','note','comments','comment','summary','desc','description']
};

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.substring(2), v);
    else n.setAttribute(k, v);
  });
  for (const c of children) n.append(c && c.nodeType ? c : document.createTextNode(c ?? ''));
  return n;
}

function daysUntil(dateStr) {
  if (!dateStr) return {label:'', cls:''};
  const now = new Date(); const d = new Date(dateStr);
  const diff = Math.ceil((d - now) / (1000*60*60*24));
  if (diff < 0) return {label:`🔴 ${Math.abs(diff)}d overdue`, cls:'bad'};
  if (diff <= 3) return {label:`🟡 ${diff}d`, cls:'mid'};
  return {label:`🟢 ${diff}d`, cls:'ok'};
}

function priorityChip(priorityScore=0) {
  let p = 'P3';
  if (priorityScore >= 90) p = 'P0';
  else if (priorityScore >= 75) p = 'P1';
  else if (priorityScore >= 60) p = 'P2';
  return {label:p, color:PRIORITY_COLORS[p]};
}

function hashKey(str) { // simple non-crypto hash
  let h = 2166136261 >>> 0;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0).toString(16);
}

// IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('opportunities')) {
        const os = db.createObjectStore('opportunities', { keyPath: 'id' });
        os.createIndex('status', 'status');
        os.createIndex('hash', 'hash');
        os.createIndex('deadline', 'deadline');
        os.createIndex('posted_at', 'posted_at');
        os.createIndex('location', 'location');
      }
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('reflections')) {
        const rf = db.createObjectStore('reflections', { keyPath: 'id' });
        rf.createIndex('by_ts', 'ts');
        rf.createIndex('by_type', 'type');
      }
      if (!db.objectStoreNames.contains('analytics_snapshots')) {
        const an = db.createObjectStore('analytics_snapshots', { keyPath: 'id' });
        an.createIndex('by_week', 'week');
      }
      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', { keyPath: 'key' });
      }
      // Ensure new indexes exist on upgrades
      try {
        const os = db.transaction('opportunities','versionchange')?.objectStore('opportunities')
          || db.objectStoreNames.contains('opportunities') && db.createObjectStore('opportunities', { keyPath: 'id' });
        if (os && !os.indexNames?.contains?.('deadline')) os.createIndex('deadline','deadline');
        if (os && !os.indexNames?.contains?.('posted_at')) os.createIndex('posted_at','posted_at');
        if (os && !os.indexNames?.contains?.('location')) os.createIndex('location','location');
      } catch {}
      if (!db.objectStoreNames.contains('qualification_reviews')) {
        db.createObjectStore('qualification_reviews', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kanban_state')) {
        db.createObjectStore('kanban_state', { keyPath: 'column_id' });
      }
      if (!db.objectStoreNames.contains('research_intel')) {
        db.createObjectStore('research_intel', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('user_preferences')) {
        db.createObjectStore('user_preferences', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode='readonly') { return db.transaction(store, mode).objectStore(store); }

async function getAll(db, store) {
  return new Promise((resolve, reject) => {
    const req = tx(db, store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function put(db, store, value) {
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

async function bulkPut(db, store, values) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    values.forEach(v => s.put(v));
    t.oncomplete = () => resolve(values);
    t.onerror = () => reject(t.error);
  });
}

async function get(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = tx(db, store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function indexGetAll(db, store, indexName, value) {
  return new Promise((resolve, reject) => {
    const s = tx(db, store);
    const idx = s.index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Seed sample data once
const SAMPLE = [
  {company: "Grammarly", role: "Sr PM, AI Writing", status: "to-apply", fit_score: 92, deadline: "2025-10-15"},
  {company: "Perplexity AI", role: "PM, Ecosystem Integrations", status: "applied", fit_score: 90, deadline: "2025-10-20"},
  {company: "Base (Coinbase)", role: "Sr Manager, Growth", status: "interview", fit_score: 78, deadline: "2025-10-01"},
  {company: "Transcarent", role: "PM, Care Navigation", status: "research", fit_score: 80, deadline: "2025-10-30"},
  {company: "Figma", role: "PM, AI Collaboration", status: "to-apply", fit_score: 82, deadline: "2025-10-25"}
];

async function ensureSeed(db) {
  const existing = await getAll(db,'opportunities');
  if (existing.length) return;
  const seeded = SAMPLE.map(s => {
    const id = crypto.randomUUID();
    const job_url = '';
    const hash = hashKey([s.company,s.role,job_url].join('|').toLowerCase());
    return { id, company: s.company, role: s.role, status: s.status, priority_score: s.fit_score, fit_score: s.fit_score, deadline: s.deadline || '', notes: '', job_url, hash, created_at: Date.now(), posted_at: '', location: '', segment: '', applicant_volume: 0, interest_score: 0 };
  });
  await bulkPut(db,'opportunities', seeded);
  for (const col of STAGES) {
    await put(db,'kanban_state',{ column_id: col.id, opportunity_ids: seeded.filter(x => x.status === col.id).map(x => x.id) });
  }
  await put(db,'meta',{ key:'schema_version', value:1 });
  await put(db,'meta',{ key:'appVersion', value: APP_VERSION });
}

function capabilityModel(hasData) {
  const hasIndexedDB = !!window.indexedDB;
  return {
    discoveryAvailable: navigator.onLine && false, // feeds disabled under strict CSP
    qualificationAvailable: hasIndexedDB && hasData,
    archiveAvailable: hasIndexedDB && hasData,
    analyticsAvailable: hasIndexedDB && hasData
  };
}

// Rendering
function renderKanban(opps, kstate) {
  const root = $('#kanban');
  if (!root) return;
  root.innerHTML = '';
  let filteredOpps = opps;
  try {
    const gatedPref = (window.__gatedCache !== undefined) ? window.__gatedCache : null;
  } catch {}
  // Pull gated preference and filter
  const gatedFilter = (async ()=>{ try { const db=await openDB(); const pref = await get(db,'user_preferences','gated'); return (pref?.value ?? true); } catch { return true; } })();
  window.__renderKanbanPromise = (async ()=>{
    const gated = await gatedFilter;
    if (gated) {
      const db = await openDB();
      const profile = await get(db,'profile','profile');
      const minFit = Number(profile?.gates?.min_fit||70);
      const minEnergy = Number(profile?.gates?.min_energy||7);
      filteredOpps = opps.filter(o => {
        const barriers = Array.isArray(o.barriers)? o.barriers:[];
        const fit = Number(o.total_fit||o.fit_score||0);
        const energy = Number(o.energy_score||0);
        return barriers.length===0 && fit>=minFit && energy>=minEnergy;
      });
    }
    for (const col of STAGES) {
      const ids = kstate[col.id]?.opportunity_ids || [];
      const items = ids.length ? ids.map(id => filteredOpps.find(o => o.id === id)).filter(Boolean)
                               : filteredOpps.filter(o => o.status === col.id);
      const h3 = el('h3',{}, el('span',{}, col.name), el('span',{class:'muted'}, `${items.length}`));
      const lane = el('div',{class:'lane', ondragover:(e)=>e.preventDefault(), ondrop:(e)=>onDrop(e,col.id)});
      const column = el('div',{class:'column', dataset:{col:col.id}});
      column.append(h3,lane);
      for (const o of items) lane.append(cardEl(o));
      root.append(column);
    }
  })();
  return;
}

function cardEl(o) {
  const pr = priorityChip(o.priority_score||0);
  const d = daysUntil(o.deadline);
  const k = el('div',{class:'cardk', draggable:true, dataset:{id:o.id}, ondragstart:onDragStart, onclick:()=>openQualModal(o.id)});
  const title = el('div',{class:'title'}, `${o.company} — ${o.role}`);
  const meta = el('div',{class:'meta'},
    el('span',{}, 'Fit ', o.fit_score??'-'),
    el('span',{}, '•', ' '),
    el('span',{}, 'Prio ', el('span',{class:'prio', style:`background:${pr.color}`},''), ` ${pr.label}`),
    el('span',{}, '•', ' '),
    el('span',{class:`deadline ${d.cls}`}, d.label||''),
    o.location ? el('span',{}, '• ', o.location) : document.createTextNode(''),
    (o.energy_score? el('span',{}, '• Energy ', String(o.energy_score), '/10') : document.createTextNode('')),
    (o.total_fit? el('span',{}, '• Fit ', String(o.total_fit), '%') : document.createTextNode('')),
    (o.honesty_label? el('span',{}, '• ', o.honesty_label) : document.createTextNode('')),
    el('button',{class:'btn', style:'margin-left:auto;', onclick:(e)=>{ e.stopPropagation(); openTriage(o.id); }}, 'Triage')
  );
  k.append(title,meta);
  return k;
}

let dragId = null;
function onDragStart(e){ dragId = e.currentTarget.dataset.id; e.dataTransfer.setData('text/plain', dragId); }
async function onDrop(e, newCol) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain') || dragId;
  if (!id) return;
  const db = await openDB();
  const o = await get(db,'opportunities', id);
  if (!o) return;
  const from = o.status;
  o.status = newCol;
  const hist = Array.isArray(o.stage_history)? o.stage_history : [];
  hist.push({ from, to:newCol, ts: Date.now() });
  o.stage_history = hist;
  await put(db,'opportunities', o);
  const kstate = await loadKanbanState(db);
  for (const col of STAGES) {
    if (!kstate[col.id]) kstate[col.id] = {column_id: col.id, opportunity_ids: []};
    kstate[col.id].opportunity_ids = kstate[col.id].opportunity_ids.filter(x=>x!==id);
  }
  if (!kstate[newCol]) kstate[newCol] = {column_id:newCol, opportunity_ids:[]};
  kstate[newCol].opportunity_ids = [id, ...kstate[newCol].opportunity_ids];
  await saveKanbanState(db, kstate);
  await refresh();
}

async function loadKanbanState(db) {
  const entries = await getAll(db, 'kanban_state');
  const map = {};
  for (const row of entries) map[row.column_id] = row;
  return map;
}
async function saveKanbanState(db, map) {
  const values = Object.values(map);
  await bulkPut(db,'kanban_state', values);
}

async function refresh() {
  const db = await openDB();
  const opps = await getAll(db,'opportunities');
  const kstate = await loadKanbanState(db);
  renderKanban(opps, kstate);
  renderDiscoveryQueue(opps);
  renderArchive(await getAll(db,'qualification_reviews'), opps);
  renderAnalytics(opps, await getAll(db,'qualification_reviews'));
  updateCaps(opps.length>0);
}

function updateCaps(hasData) {
  const caps = capabilityModel(hasData);
  // Compute simple weekly target and streak from sessions
  (async ()=>{
    try {
      const db = await openDB();
      const opps = await getAll(db,'opportunities');
      const sessions = [];
      opps.forEach(o=> (o.sessions||[]).forEach(s=>sessions.push(s)) );
      const now = new Date();
      const startOfWeek = (d)=>{ const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; };
      const sow = startOfWeek(now).getTime();
      const weekly = sessions.filter(s=> (s.ended_at||s.started_at) && new Date(s.ended_at||s.started_at).getTime()>=sow);
      const weeklyDone = weekly.filter(s=> (s.outcome||'')==='done').length;
      const target = 3;
      // streak days with >=1 done in last consecutive days
      let streak = 0; for (let i=0;i<30;i++){ const day = new Date(); day.setDate(day.getDate()-i); day.setHours(0,0,0,0); const dayMs=day.getTime(); const nextDay=dayMs+24*3600*1000; const any = sessions.some(s=>{ const t=new Date(s.ended_at||s.started_at||0).getTime(); return t>=dayMs && t<nextDay && (s.outcome||'')==='done'; }); if (any) streak++; else break; }
      $('#cap-status').textContent = [
        'Offline-first',
        caps.qualificationAvailable?'Qual: on':'Qual: off',
        `Streak ${streak}d`,
        `Weekly ${weeklyDone}/${target}`
      ].join(' • ');
    } catch {
      $('#cap-status').textContent = [
        'Offline-first',
        caps.qualificationAvailable?'Qual: on':'Qual: off'
      ].join(' • ');
    }
  })();
}

// Qualification modal
let currentQualId = null;
function openQualModal(id) {
  currentQualId = id;
  $('#qual-modal').classList.add('show');
  $('#qm-fit').value = 'Good';
  $('#qm-confidence').value = 70;
  $('#qm-brief').value = autoBriefing();
  const objs = $('#qm-objs'); objs.innerHTML='';
  OBJECTION_TAGS.forEach(t => objs.append(chip(t, 'obj')));
  const exs = $('#qm-excls'); exs.innerHTML='';
  EXCLUSION_FLAGS.forEach(t => exs.append(chip(t, 'ex')));
  $('#qm-deadline').value = '';
}
function chip(text, group) {
  const c = el('span',{class:'chip', onclick:()=>c.classList.toggle('on')}, text);
  c.dataset.group = group; return c;
}
function closeQual(){ $('#qual-modal').classList.remove('show'); currentQualId=null; }
function autoBriefing() {
  return 'Initial assessment: role alignment good; verify scope, team, and compensation. Risks: timeline and seniority match.';
}

// Save qualification
async function saveQualification(decision) {
  if (!currentQualId) return;
  const db = await openDB();
  const opp = await get(db,'opportunities', currentQualId);
  const fit_category = $('#qm-fit').value;
  const confidence = Math.max(0, Math.min(100, parseInt($('#qm-confidence').value||'0',10)));
  const briefing_text = $('#qm-brief').value || autoBriefing();
  const deadline = $('#qm-deadline').value || '';
  const objections = $$('#qm-objs .chip.on').map(c=>c.textContent);
  const exclusions = $$('#qm-excls .chip.on').map(c=>c.textContent);
  const review = {
    id: crypto.randomUUID(),
    opportunity_id: currentQualId,
    decision, fit_category, objections, exclusions,
    confidence, briefing_text, reviewed_at: Date.now()
  };
  await put(db,'qualification_reviews', review);
  if (deadline) { opp.deadline = deadline; }
  if (decision === 'Accept') {
    try {
      const profile = await get(db,'profile','profile');
      const minFit = Number(profile?.gates?.min_fit||70);
      const minEnergy = Number(profile?.gates?.min_energy||7);
      const fit = Number(opp.total_fit||opp.fit_score||0);
      const energy = Number(opp.energy_score||0);
      const barriers = Array.isArray(opp.barriers)? opp.barriers : [];
      if (barriers.length) { alert('Brutal Honesty: structural barriers detected. Resolve first.'); return; }
      if (fit < minFit || energy < minEnergy) { alert('Gate not met (fit/energy). Adjust in Profile or reconsider.'); return; }
    } catch {}
    opp.status = 'to-apply';
  }
  if (decision === 'Reject') { opp.status = 'offer'; }
  await put(db,'opportunities', opp);
  const kstate = await loadKanbanState(db);
  for (const col of STAGES) {
    if (!kstate[col.id]) kstate[col.id] = {column_id: col.id, opportunity_ids: []};
    kstate[col.id].opportunity_ids = kstate[col.id].opportunity_ids.filter(x=>x!==opp.id);
  }
  const target = opp.status;
  const hist2 = Array.isArray(opp.stage_history)? opp.stage_history : [];
  hist2.push({ from:'qualification', to:target, ts: Date.now() });
  opp.stage_history = hist2;
  kstate[target].opportunity_ids = [opp.id, ...kstate[target].opportunity_ids];
  await saveKanbanState(db, kstate);
  closeQual();
  await refresh();
}

// Archive
function renderArchive(reviews, opps) {
  const root = $('#archive-list'); if (!root) return;
  const byOpp = new Map(opps.map(o=>[o.id,o]));
  const items = reviews.filter(r => r.decision==='Reject').sort((a,b)=>b.reviewed_at - a.reviewed_at);
  root.innerHTML = '';
  for (const r of items) {
    const o = byOpp.get(r.opportunity_id);
    const row = el('div',{class:'cardk'},
      el('div',{class:'title'}, `${o?.company||'Unknown'} — ${o?.role||''}`),
      el('div',{class:'meta'}, `Fit ${r.fit_category} • Conf ${r.confidence} • ${new Date(r.reviewed_at).toLocaleDateString()}`),
      el('div',{class:'muted'}, `Objections: ${r.objections.join(', ') || '—'} | Exclusions: ${r.exclusions.join(', ') || '—'}`),
      el('div',{style:'margin-top:6px;'}, r.briefing_text || '—'),
      el('div',{class:'actions', style:'margin-top:8px; justify-content:flex-start;'},
        el('button',{class:'btn', onclick:()=>restoreFromArchive(o?.id)},'Restore to Pipeline')
      )
    );
    root.append(row);
  }
}
async function restoreFromArchive(id) {
  if (!id) return;
  const db = await openDB();
  const o = await get(db,'opportunities', id); if (!o) return;
  o.status = 'research';
  await put(db,'opportunities', o);
  const ks = await loadKanbanState(db);
  for (const col of STAGES) {
    if (!ks[col.id]) ks[col.id] = {column_id: col.id, opportunity_ids: []};
    ks[col.id].opportunity_ids = ks[col.id].opportunity_ids.filter(x=>x!==id);
  }
  ks['research'].opportunity_ids = [id, ...ks['research'].opportunity_ids];
  await saveKanbanState(db, ks);
  await refresh();
}

// Analytics
function renderAnalytics(opps, reviews) {
  const funnel = $('#funnel'), objections = $('#objections'), sources = $('#sources');
  if (!funnel) return;

  const counts = {
    discovery: opps.length,
    qualified: reviews.filter(r=>r.decision==='Accept').length,
    applied: opps.filter(o=>o.status==='applied').length,
    interview: opps.filter(o=>o.status==='interview').length,
    offer: opps.filter(o=>o.status==='offer').length,
  };
  funnel.innerHTML = '';
  for (const [k,v] of Object.entries(counts)) {
    const line = el('div',{}, el('div',{}, `${k} — ${v}`), el('div',{class:'bar'}, el('span',{style:`width:${counts.discovery? (v/counts.discovery*100):0}%`})));
    funnel.append(line);
  }

  const objCounts = {};
  reviews.filter(r=>r.decision==='Reject').forEach(r => r.objections.forEach(o => objCounts[o]=(objCounts[o]||0)+1));
  objections.innerHTML = '';
  Object.entries(objCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    objections.append(el('div',{}, `${k}: ${v}`));
  });

  // Source quality (basic: CSV considered one source)
  sources.innerHTML = '';
  const successByStatus = { 'to-apply':0, 'applied':0, 'interview':0, 'offer':0 };
  opps.forEach(o => { if (successByStatus[o.status]!=null) successByStatus[o.status]++; });
  Object.entries(successByStatus).forEach(([k,v])=> sources.append(el('div',{}, `${k}: ${v}`)));
}

// CSV Import
function parseCSV(text) {
  // Simple CSV parser that supports quotes and commas
  const rows = [];
  let i=0, cur='', inQ=false, row=[];
  while (i<text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i+1] === '"') { cur+='"'; i++; }
        else inQ=false;
      } else cur+=ch;
    } else {
      if (ch === '"') inQ=true;
      else if (ch === ',') { row.push(cur); cur=''; }
      else if (ch === '\n' || ch === '\r') {
        if (cur!=='' || row.length) { row.push(cur); rows.push(row); row=[]; cur=''; }
        if (ch === '\r' && text[i+1]=='\n') i++;
      } else cur+=ch;
    }
    i++;
  }
  if (cur!=='' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

async function importCSV(file) {
  const txt = await file.text();
  const rows = parseCSV(txt).filter(r => r.some(c => (c||'').trim()!==''));
  if (!rows.length) throw new Error('Empty CSV');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const required = ['company','role','job_url','status','priority_score','fit_score','deadline','notes'];
  const missing = required.filter(k => !header.includes(k));
  if (missing.length) throw new Error('Missing headers: '+missing.join(', '));
  const mapIdx = Object.fromEntries(header.map((h,i)=>[h,i]));
  const items = rows.slice(1).map(r => ({
    company: r[mapIdx.company]?.trim()||'',
    role: r[mapIdx.role]?.trim()||'',
    job_url: r[mapIdx.job_url]?.trim()||'',
    status: r[mapIdx.status]?.trim()||'research',
    priority_score: Number(r[mapIdx.priority_score]||0)||0,
    fit_score: Number(r[mapIdx.fit_score]||0)||0,
    deadline: r[mapIdx.deadline]?.trim()||'',
    notes: r[mapIdx.notes]?.trim()||'',
  })).filter(x=>x.company && x.role);

  const db = await openDB();
  const existing = await getAll(db,'opportunities');
  const existingHashes = new Set(existing.map(e => e.hash));
  const toAdd = [];
  for (const it of items) {
    const h = hashKey([it.company,it.role,it.job_url].join('|').toLowerCase());
    if (existingHashes.has(h)) continue;
    toAdd.push({ id: crypto.randomUUID(), ...it, hash:h, created_at: Date.now() });
  }
  if (!toAdd.length) return { added:0, skipped: items.length, total:rows.length-1 };
  await bulkPut(db,'opportunities', toAdd);
  const ks = await loadKanbanState(db);
  for (const col of STAGES) if (!ks[col.id]) ks[col.id] = {column_id:col.id, opportunity_ids:[]};
  for (const o of toAdd) {
    ks[o.status].opportunity_ids = [o.id, ...ks[o.status].opportunity_ids];
  }
  await saveKanbanState(db, ks);
  return { added:toAdd.length, skipped: items.length - toAdd.length, total:rows.length-1 };
}

// UI wiring
function switchView(name) {
  ['discovery','kanban','archive','analytics','about'].forEach(v => {
    $('#view-'+v).classList.toggle('hidden', v!==name);
    $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.view===name));
  });
}
$$('nav button').forEach(b => b.addEventListener('click', ()=>switchView(b.dataset.view)));

$('#qm-cancel')?.addEventListener('click', closeQual);
$('#qm-save')?.addEventListener('click', ()=>saveQualification('Accept'));
$('#qm-accept')?.addEventListener('click', ()=>saveQualification('Accept'));
$('#qm-reject')?.addEventListener('click', ()=>saveQualification('Reject'));
document.addEventListener('keydown', (e)=>{
  if ($('#qual-modal').classList.contains('show')) {
    if (e.key==='Escape') closeQual();
    if (e.key.toLowerCase()==='a') saveQualification('Accept');
    if (e.key.toLowerCase()==='r') saveQualification('Reject');
  }
});

const dz = $('#dropzone');
const csvInput = $('#csvFile');
dz?.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
dz?.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
dz?.addEventListener('drop', async e=>{
  e.preventDefault(); dz.classList.remove('drag');
  const f = e.dataTransfer.files?.[0]; if (f) await doImport(f);
});
csvInput?.addEventListener('change', async ()=>{
  const f = csvInput.files?.[0]; if (f) await doImport(f);
});
async function doImport(file) {
  openCsvWizard(file);
}

// Archive filters (V0 placeholder)
$('#apply-archive-filters')?.addEventListener('click', async ()=>{
  await refresh();
});

// SW registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => {
      const s = document.getElementById('sw-status');
      if (s) s.textContent = 'Offline ready';
    }).catch(console.error);
  });
}

(async function init(){
  const db = await openDB();
  await ensureSeed(db);
  await loadStagesPref();
  // Migrate legacy snooze to planned session (2d out)
  try {
    const opps = await getAll(db,'opportunities');
    let changed = 0;
    for (const o of opps) {
      if (o.snooze_until) {
        const when = new Date(Date.now()+2*24*3600*1000);
        o.next_action = o.next_action || { type:'review', durationMin:15, planned_at: when.toISOString(), planned_source:'migration' };
        delete o.snooze_until; await put(db,'opportunities', o); changed++;
      }
    }
  } catch {}
  await refresh();
  switchView('kanban');

  // Density preference (compact vs comfortable)
  try {
    const pref = await get(db, 'user_preferences', 'density');
    const mode = pref?.value || 'comfortable';
    document.body.classList.toggle('density-compact', mode === 'compact');
    const btn = document.getElementById('density-toggle');
    if (btn) btn.textContent = (mode === 'compact') ? 'Comfortable' : 'Compact';
    btn?.addEventListener('click', async ()=>{
      const isCompact = document.body.classList.toggle('density-compact');
      const next = isCompact ? 'compact' : 'comfortable';
      await put(db, 'user_preferences', { key:'density', value: next });
      const b = document.getElementById('density-toggle');
      if (b) b.textContent = isCompact ? 'Comfortable' : 'Compact';
    });
  } catch {}
})();

// Stage editor (simple prompt)
document.getElementById('stages-edit')?.addEventListener('click', async ()=>{
  const current = STAGES.map(s=>s.name).join(', ');
  const next = prompt('Edit stages (comma-separated, left→right):', current);
  if (next == null) return; // canceled
  const names = next.split(',').map(s=>s.trim()).filter(Boolean);
  if (!names.length) return;
  await saveStagesPref(names);
  await refresh();
  alert('Stages updated.');
});

// Profile modal wiring
document.getElementById('profile-open')?.addEventListener('click', async ()=>{
  const db = await openDB();
  const p = await get(db,'profile','profile');
  const modal = document.getElementById('profile-modal');
  document.getElementById('p-comm').value = String(p?.work_style?.comm ?? 6);
  document.getElementById('p-pace').value = String(p?.work_style?.pace ?? 7);
  document.getElementById('p-feedback').value = String(p?.work_style?.feedback ?? 6);
  document.getElementById('p-collab').value = String(p?.work_style?.collab ?? 6);
  document.getElementById('p-minfit').value = String(p?.gates?.min_fit ?? 70);
  document.getElementById('p-minenergy').value = String(p?.gates?.min_energy ?? 7);
  modal.classList.add('show');
});
document.getElementById('profile-cancel')?.addEventListener('click', ()=>{
  document.getElementById('profile-modal')?.classList.remove('show');
});
document.getElementById('profile-save')?.addEventListener('click', async ()=>{
  const db = await openDB();
  const p = await get(db,'profile','profile') || { key:'profile' };
  p.work_style = {
    comm: Number(document.getElementById('p-comm').value)||6,
    pace: Number(document.getElementById('p-pace').value)||7,
    feedback: Number(document.getElementById('p-feedback').value)||6,
    collab: Number(document.getElementById('p-collab').value)||6
  };
  p.gates = {
    min_fit: Number(document.getElementById('p-minfit').value)||70,
    min_energy: Number(document.getElementById('p-minenergy').value)||7
  };
  p.key = 'profile';
  await put(db,'profile', p);
  document.getElementById('profile-modal')?.classList.remove('show');
});

// Triage modal wiring
let triageCurrentId = null;
async function openTriage(id){
  triageCurrentId = id;
  const db = await openDB();
  const opp = await get(db,'opportunities', id);
  const body = document.getElementById('triage-body');
  if (!opp || !body) return;
  const row = (k,v)=>`<div class="row" style="justify-content:space-between;"><span class="muted">${k}</span><span>${v}</span></div>`;
  const parts = [];
  parts.push(row('Company', opp.company||''));
  parts.push(row('Role', opp.role||''));
  parts.push(row('Honesty', opp.honesty_label||'-'));
  parts.push(row('Energy', (opp.energy_score? `${opp.energy_score}/10`:'-')));
  parts.push(row('Fit', (opp.total_fit? `${opp.total_fit}%`:(opp.fit_score??'-'))));
  if (opp.base_score!=null) parts.push(row('Base', `${opp.base_score}%`));
  if (opp.culture_score!=null) parts.push(row('Culture', `${opp.culture_score}%`));
  if (opp.timing_score!=null) parts.push(row('Timing', `${opp.timing_score}%`));
  if (opp.alumni_score!=null) parts.push(row('Alumni', `${opp.alumni_score}%`));
  if (opp.work_style_score!=null) parts.push(row('Work Style', `${opp.work_style_score}%`));
  if (opp.culture_dims) {
    const dims = opp.culture_dims;
    const bar = (label,val)=>`<div><div class=\"muted\">${label}</div><div class=\"bar\"><span style=\"width:${Math.min(100,Math.max(0, (val||0)/10*100))}%\"></span></div></div>`;
    parts.push(`<div class=\"rowgrid\">${bar('Comm', dims.comm)}${bar('Pace', dims.pace)}${bar('Feedback', dims.feedback)}${bar('Collab', dims.collab)}</div>`);
  }
  const barriers = (opp.barriers||[]).join(', ');
  if (barriers) parts.push(row('Barriers', barriers));
  const evid = (opp.honesty_evidence||[]).join(' • ');
  if (evid) parts.push(row('Evidence', evid));
  body.innerHTML = parts.join('');
  document.getElementById('triage-modal')?.classList.add('show');
}
function closeTriage(){ document.getElementById('triage-modal')?.classList.remove('show'); triageCurrentId=null; }
document.getElementById('triage-close')?.addEventListener('click', closeTriage);
document.getElementById('triage-reject')?.addEventListener('click', async ()=>{
  if (!triageCurrentId) return; const db = await openDB(); const opp = await get(db,'opportunities', triageCurrentId); if (!opp) return;
  const from = opp.status || 'research'; opp.status = 'offer';
  const hist = Array.isArray(opp.stage_history)? opp.stage_history:[]; hist.push({ from, to: 'offer', ts: Date.now() }); opp.stage_history = hist;
  await put(db,'opportunities', opp); closeTriage(); await refresh();
});
document.getElementById('triage-accept')?.addEventListener('click', async ()=>{
  if (!triageCurrentId) return; const db = await openDB(); const opp = await get(db,'opportunities', triageCurrentId); if (!opp) return;
  // Force Accept with justification
  const why = prompt('Force Accept justification (1 line)');
  if (!why) return;
  const from = opp.status || 'research'; opp.status = 'to-apply';
  const hist = Array.isArray(opp.stage_history)? opp.stage_history:[]; hist.push({ from, to:'to-apply', ts: Date.now(), note:`force:${why}` }); opp.stage_history = hist; await put(db,'opportunities', opp); closeTriage(); await refresh();
});

function pad2(n){ return String(n).padStart(2,'0'); }
function toICSDate(d){
  const y=d.getUTCFullYear(), m=pad2(d.getUTCMonth()+1), da=pad2(d.getUTCDate());
  const h=pad2(d.getUTCHours()), mi=pad2(d.getUTCMinutes()), s=pad2(d.getUTCSeconds());
  return `${y}${m}${da}T${h}${mi}${s}Z`;
}
function mkICS(opp, type, start, durationMin){
  const end = new Date(start.getTime() + durationMin*60000);
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JobFlow//EN','BEGIN:VEVENT',
    'DTSTAMP:'+toICSDate(new Date()),
    'DTSTART:'+toICSDate(start),
    'DTEND:'+toICSDate(end),
    'SUMMARY:'+`JobFlow ${type} — ${opp.company} — ${opp.role}`,
    'DESCRIPTION:'+`Planned via JobFlow triage. Link: ${opp.job_url||''}`,
    'END:VEVENT','END:VCALENDAR'
  ];
  return new Blob([lines.join('\r\n')], { type:'text/calendar' });
}
function mkGCalUrl(opp, type, start, durationMin){
  const end = new Date(start.getTime()+durationMin*60000);
  const fmt = (d)=> encodeURIComponent(d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'));
  const dates = fmt(start)+'/'+fmt(end);
  const text = encodeURIComponent(`JobFlow ${type} — ${opp.company} — ${opp.role}`);
  const details = encodeURIComponent(`Planned via JobFlow triage. ${opp.job_url||''}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

document.getElementById('triage-duration')?.addEventListener('change', ()=>{
  const sel = document.getElementById('triage-duration');
  const custom = document.getElementById('triage-duration-custom');
  if (sel.value==='custom') custom.style.display='block'; else custom.style.display='none';
});

document.getElementById('triage-plan')?.addEventListener('click', async ()=>{
  if (!triageCurrentId) return; const db = await openDB(); const opp = await get(db,'opportunities', triageCurrentId); if (!opp) return;
  const type = document.getElementById('triage-type').value || 'apply';
  const durSel = document.getElementById('triage-duration').value;
  const dur = durSel==='custom' ? (Number(document.getElementById('triage-duration-custom').value)||25) : Number(durSel);
  const whenStr = document.getElementById('triage-when').value;
  const start = whenStr ? new Date(whenStr) : new Date(Date.now()+60*60000);
  opp.next_action = { type, durationMin: dur, planned_at: start.toISOString(), planned_source:'triage' };
  await put(db,'opportunities', opp);
  // Offer calendar add: download ICS and open Google Cal link
  try {
    const ics = mkICS(opp, type, start, dur);
    const url = URL.createObjectURL(ics);
    const a = document.createElement('a'); a.href = url; a.download = `JobFlow-${type}-${opp.company}.ics`; a.click(); URL.revokeObjectURL(url);
    window.open(mkGCalUrl(opp, type, start, dur), '_blank');
    if ('Notification' in window && Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm==='granted') {
        const fireAt = start.getTime() - 5*60000; // 5 min before
        const delta = fireAt - Date.now();
        if (delta > 0 && delta < 6*3600*1000) setTimeout(()=>{ try{ new Notification(`Start ${type}: ${opp.company} — ${opp.role}`, { body: 'Timebox is about to start' }); }catch{} }, delta);
      }
    }
  } catch {}
  closeTriage();
});

// Keyboard shortcuts in triage
document.addEventListener('keydown', (e)=>{
  const modal = document.getElementById('triage-modal');
  if (!modal || !modal.classList.contains('show')) return;
  if (e.key==='Escape') { e.preventDefault(); closeTriage(); }
  if (e.key.toLowerCase()==='r') { e.preventDefault(); document.getElementById('triage-reject')?.click(); }
  if (e.key.toLowerCase()==='a') { e.preventDefault(); document.getElementById('triage-accept')?.click(); }
  if (e.key.toLowerCase()==='p' || e.key.toLowerCase()==='s') { e.preventDefault(); document.getElementById('triage-plan')?.click(); }
});

// Discovery Queue (gated with reasons)
function reasonChips(opp, profile){
  const chips = [];
  const minFit = Number(profile?.gates?.min_fit||70);
  const minEnergy = Number(profile?.gates?.min_energy||7);
  const fit = Number(opp.total_fit||opp.fit_score||0);
  const energy = Number(opp.energy_score||0);
  if ((opp.barriers||[]).length) chips.push('barrier');
  if (fit < minFit) chips.push(`fit ${fit}% < ${minFit}%`);
  if (energy < minEnergy) chips.push(`energy ${energy} < ${minEnergy}`);
  return chips;
}

async function renderDiscoveryQueue(opps){
  const root = document.getElementById('discovery-list');
  if (!root) return;
  const db = await openDB();
  const profile = await get(db,'profile','profile');
  const showAll = document.getElementById('discovery-show-all')?.checked;
  const minFit = Number(profile?.gates?.min_fit||70);
  const minEnergy = Number(profile?.gates?.min_energy||7);
  const list = (opps||[]).slice().sort((a,b)=> (Number(b.total_fit||b.fit_score||0) - Number(a.total_fit||a.fit_score||0)));
  const rows = [];
  for (const o of list) {
    const fit = Number(o.total_fit||o.fit_score||0);
    const energy = Number(o.energy_score||0);
    const bars = reasonChips(o, profile);
    const passes = !bars.length;
    if (!showAll && !passes) continue;
    rows.push(
      `<div class="row" style="justify-content:space-between; align-items:center; gap:8px;">
        <div><strong>${o.company||''}</strong> — ${o.role||''}</div>
        <div class="muted">Fit ${fit||'-'}% • Energy ${energy||'-'}/10${o.honesty_label? ' • '+o.honesty_label : ''}</div>
        ${passes? '' : `<div class="row" style="gap:6px;">${bars.map(b=>`<span class="badge" style="color:#f59e0b;">${b}</span>`).join('')}</div>`}
        <div><button class="btn" data-id="${o.id}" data-act="triage">Triage</button></div>
      </div>`
    );
  }
  root.innerHTML = rows.join('') || '<div class="muted">No roles match your gates. Toggle Show all.</div>';
}

document.getElementById('discovery-refresh')?.addEventListener('click', async ()=>{
  const db = await openDB(); const opps = await getAll(db,'opportunities'); await renderDiscoveryQueue(opps);
});
document.getElementById('discovery-show-all')?.addEventListener('change', async ()=>{
  const db = await openDB(); const opps = await getAll(db,'opportunities'); await renderDiscoveryQueue(opps);
});
document.getElementById('discovery-list')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-act="triage"]'); if (!btn) return; const id = Number(btn.getAttribute('data-id')); if (id) openTriage(id);
});

// Culture bars in triage (rendered inline within openTriage)

// Today Queue modal
document.getElementById('today-open')?.addEventListener('click', async ()=>{
  const db = await openDB();
  const opps = await getAll(db,'opportunities');
  const today = new Date(); today.setHours(0,0,0,0);
  const next = today.getTime()+24*3600*1000;
  const planned = opps.filter(o=>{ const a=o.next_action; if (!a?.planned_at) return false; const t=new Date(a.planned_at).getTime(); return t>=today.getTime() && t<next; });
  const body = document.getElementById('today-body');
  body.innerHTML = planned.length? planned.map(o=>`<div class="row" style="justify-content:space-between;"><span>${o.company} — ${o.role}</span><span class="muted">${o.next_action.type}, ${o.next_action.durationMin}m @ ${new Date(o.next_action.planned_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>`).join('') : '<div class="muted">No sessions planned for today</div>';
  document.getElementById('today-timer').style.display='none';
  document.getElementById('today-reflect').style.display='none';
  document.getElementById('today-start').style.display='';
  document.getElementById('today-complete').style.display='none';
  document.getElementById('today-modal')?.classList.add('show');
});
document.getElementById('today-close')?.addEventListener('click', ()=>{ document.getElementById('today-modal')?.classList.remove('show'); });

let currentTimer = null; let currentTimerEnd = 0; let currentTimerOppId = null;
document.getElementById('today-start')?.addEventListener('click', async ()=>{
  const db = await openDB(); const opps = await getAll(db,'opportunities'); const next = opps.find(o=>o.next_action?.planned_at);
  if (!next) return;
  const dur = Number(next.next_action.durationMin)||25;
  currentTimerOppId = next.id;
  currentTimerEnd = Date.now() + dur*60000;
  const timerEl = document.getElementById('today-timer'); timerEl.style.display='';
  document.getElementById('today-reflect').style.display='none';
  document.getElementById('today-start').style.display='none';
  document.getElementById('today-complete').style.display='';
  if (currentTimer) clearInterval(currentTimer);
  currentTimer = setInterval(()=>{
    const left = Math.max(0, currentTimerEnd - Date.now());
    const m = Math.floor(left/60000), s=Math.floor((left%60000)/1000);
    timerEl.textContent = `Session running — ${m}:${String(s).padStart(2,'0')}`;
    if (left<=0) { clearInterval(currentTimer); currentTimer=null; timerEl.textContent='Session complete — jot 2 lines'; document.getElementById('today-reflect').style.display=''; }
  }, 250);
});

document.getElementById('today-complete')?.addEventListener('click', async ()=>{
  const db = await openDB(); const opp = await get(db,'opportunities', currentTimerOppId); if (!opp) return;
  const note = document.getElementById('today-reflect').value || '';
  const sessions = Array.isArray(opp.sessions)? opp.sessions:[];
  sessions.push({ planned_at: opp.next_action?.planned_at, started_at: new Date(currentTimerEnd - (Number(opp.next_action?.durationMin)||25)*60000).toISOString(), ended_at: new Date().toISOString(), type: opp.next_action?.type||'apply', durationMin: Number(opp.next_action?.durationMin)||25, outcome:'done', note });
  opp.sessions = sessions; delete opp.next_action; await put(db,'opportunities', opp);
  document.getElementById('today-modal')?.classList.remove('show');
  await refresh();
});

// Gated toggle affecting Kanban filter
document.getElementById('gated-toggle')?.addEventListener('click', async ()=>{
  const db = await openDB(); const pref = await get(db,'user_preferences','gated'); const next = !(pref?.value ?? true); await put(db,'user_preferences', { key:'gated', value: next }); await refresh();
});

// === CSV Import Wizard ===
let csvWizard = { step: 1, rows: [], header: [], fileName: '', mapping: {}, items: [], duplicates: [], newbies: [], selectedIds: new Set(), invalids: [] };

// --- Profile defaults (work style + gating) ---
const DEFAULT_PROFILE = {
  key: 'profile',
  work_style: { comm: 6, pace: 7, feedback: 6, collab: 6 },
  gates: { min_fit: 70, min_energy: 7 },
  skills: ['product','strategy','go-to-market','growth','ecosystem']
};

async function getProfile() {
  const db = await openDB();
  const p = await get(db,'profile','profile');
  if (p) return p;
  await put(db,'profile', { ...DEFAULT_PROFILE });
  return { ...DEFAULT_PROFILE };
}

function openCsvWizard(file) {
  const modal = document.getElementById('csv-modal');
  const stepLbl = document.getElementById('csvm-step');
  const body = document.getElementById('csvm-body');
  const err = document.getElementById('csvm-error');
  const btnBack = document.getElementById('csvm-back');
  const btnNext = document.getElementById('csvm-next');
  const btnImport = document.getElementById('csvm-import');

  Object.assign(csvWizard, { step:1, rows:[], header:[], fileName:file.name, mapping:{}, items:[], duplicates:[], newbies:[], selectedIds:new Set() });
  err.textContent = '';

  file.text().then(text => {
    const rows = parseCSV(text).filter(r => r.some(c => (c||'').trim()!==''));
    if (!rows.length) { err.textContent = 'Empty CSV'; return; }
    csvWizard.rows = rows;
    csvWizard.header = rows[0].map(h => String(h||'').trim());
    csvWizard.mapping = autoMapHeaders(csvWizard.header);
    renderCsvStep1();
    stepLbl.textContent = 'Step 1 of 3 — Map headers';
    btnBack.disabled = true; btnNext.style.display=''; btnImport.style.display='none';
    modal.classList.add('show');
  }).catch(e => { err.textContent = 'Failed to read file: '+(e?.message||e); });

  document.getElementById('csvm-cancel').onclick = closeCsvWizard;
  btnBack.onclick = () => { if (csvWizard.step>1){ csvWizard.step--; if (csvWizard.step===1) renderCsvStep1(); if (csvWizard.step===2) renderCsvStep2(); updateCsvButtons(); } };
  btnNext.onclick = async () => {
    if (csvWizard.step === 1) {
      const valid = validateCsvMapping();
      if (!valid.ok) { err.textContent = valid.msg; return; }
      err.textContent = '';
      await buildItemsFromMapping();
      csvWizard.step = 2; renderCsvStep2(); updateCsvButtons();
    } else if (csvWizard.step === 2) {
      csvWizard.step = 3; renderCsvStep3(); updateCsvButtons();
    }
  };
  btnImport.onclick = () => importSelectedRows();
}

function closeCsvWizard(){ document.getElementById('csv-modal').classList.remove('show'); }

function updateCsvButtons(){
  const stepLbl = document.getElementById('csvm-step');
  const btnBack = document.getElementById('csvm-back');
  const btnNext = document.getElementById('csvm-next');
  const btnImport = document.getElementById('csvm-import');
  const err = document.getElementById('csvm-error');
  err.textContent = '';
  if (csvWizard.step === 1) {
    stepLbl.textContent = 'Step 1 of 3 — Map headers';
    btnBack.disabled = true; btnNext.style.display=''; btnImport.style.display='none';
  } else if (csvWizard.step === 2) {
    stepLbl.textContent = 'Step 2 of 3 — Preview & dedupe';
    btnBack.disabled = false; btnNext.style.display=''; btnImport.style.display='none';
  } else {
    stepLbl.textContent = 'Step 3 of 3 — Confirm import';
    btnBack.disabled = false; btnNext.style.display='none'; btnImport.style.display='';
  }
}

function autoMapHeaders(srcHeaders){
  const lower = srcHeaders.map(h=>h.toLowerCase());
  const mapping = {};
  for (const [target, syns] of Object.entries(HEADER_SYNONYMS)) {
    let foundIndex = -1;
    for (const s of syns) {
      const idx = lower.indexOf(s.toLowerCase());
      if (idx !== -1) { foundIndex = idx; break; }
    }
    if (foundIndex !== -1) mapping[target] = srcHeaders[foundIndex];
  }
  return mapping;
}

function validateCsvMapping(){
  // Minimal required; all others are optional/derived
  const required = ['company','role','job_url'];
  const chosen = csvWizard.mapping;
  const missing = required.filter(k => !chosen[k]);
  if (missing.length) return { ok:false, msg: 'Missing mappings: '+missing.join(', ') };
  // no duplicate selections
  const picks = Object.values(chosen);
  const dup = picks.find((v,i)=> picks.indexOf(v)!==i);
  if (dup) return { ok:false, msg: 'Duplicate column selected: '+dup };
  return { ok:true };
}

function renderCsvStep1(){
  const body = document.getElementById('csvm-body');
  const header = csvWizard.header;
  const required = ['company','role','job_url'];
  const optional = ['status','priority_score','fit_score','fit_flag','deadline','posted_at','location','segment','applicant_volume','interest_score','notes'];
  const table = el('div',{},
    el('div',{class:'muted', style:'margin-bottom:8px;'}, `File: ${csvWizard.fileName}`),
    el('div',{class:'muted', style:'margin-bottom:8px;'}, 'Map your CSV columns. Required first; optional help scoring and analytics.'),
    ...required.map(key => {
      const row = el('div',{class:'row', style:'gap:8px; margin-bottom:6px; align-items:center;'},
        el('div',{style:'width:180px;'}, key),
        (()=>{
          const sel = el('select', { id:`map-${key}` });
          sel.append(el('option',{value:''}, '-- Select column --'));
          header.forEach(h => sel.append(el('option',{value:h, selected: csvWizard.mapping[key]===h}, h)));
          sel.addEventListener('change', ()=>{ csvWizard.mapping[key] = sel.value || undefined; });
          return sel;
        })()
      );
      return row;
    }),
    el('div',{class:'muted', style:'margin:8px 0 4px 0;'}, 'Optional'),
    ...optional.map(key => {
      const row = el('div',{class:'row', style:'gap:8px; margin-bottom:6px; align-items:center;'},
        el('div',{style:'width:180px;'}, key),
        (()=>{
          const sel = el('select', { id:`map-${key}` });
          sel.append(el('option',{value:''}, '-- None --'));
          header.forEach(h => sel.append(el('option',{value:h, selected: csvWizard.mapping[key]===h}, h)));
          sel.addEventListener('change', ()=>{ if (sel.value) csvWizard.mapping[key] = sel.value; else delete csvWizard.mapping[key]; });
          return sel;
        })()
      );
      return row;
    })
  );
  body.innerHTML = ''; body.append(table);
}

async function buildItemsFromMapping(){
  const header = csvWizard.header;
  const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
  const map = csvWizard.mapping;
  const rows = csvWizard.rows.slice(1);
  const items = rows.map(r => {
    const raw_fit_flag = map.fit_flag ? (r[idx[map.fit_flag]]||'').trim() : '';
    const raw_fit_score = map.fit_score ? Number(r[idx[map.fit_score]]||0)||0 : undefined;
    const fit_score = Number.isFinite(raw_fit_score) && raw_fit_score>0 ? raw_fit_score : fitFromFlag(raw_fit_flag);
    const raw_prio = map.priority_score ? Number(r[idx[map.priority_score]]||0)||0 : 0;
    const location = normalizeLocation(map.location ? (r[idx[map.location]]||'').trim() : '');
    const segment = normalizeSegment(map.segment ? (r[idx[map.segment]]||'').trim() : '');
    const posted_at = (map.posted_at ? (r[idx[map.posted_at]]||'').trim() : '');
    const applicant_volume = map.applicant_volume ? Number(r[idx[map.applicant_volume]]||0)||0 : 0;
    const interest_score = map.interest_score ? (Number(r[idx[map.interest_score]]||0)||0) : inferInterest(applicant_volume);
    const deadline = (map.deadline ? (r[idx[map.deadline]]||'').trim() : '');
    const o = {
      company: (r[idx[map.company]]||'').trim(),
      role: (r[idx[map.role]]||'').trim(),
      job_url: (r[idx[map.job_url]]||'').trim(),
      status: (map.status ? (r[idx[map.status]]||'').trim() : 'research') || 'research',
      priority_score: raw_prio || fit_score || 0,
      fit_score: fit_score || 0,
      deadline,
      posted_at,
      location,
      segment,
      applicant_volume,
      interest_score,
      notes: (map.notes ? (r[idx[map.notes]]||'').trim() : ''),
    };
    return o;
  }).filter(x=>x.company && x.role);

  const db = await openDB();
  const existing = await getAll(db,'opportunities');
  const existingHashes = new Set(existing.map(e => e.hash));
  const withHash = items.map(it => ({...it, _hash: hashKey([it.company,it.role,it.job_url].join('|').toLowerCase()) }));
  // Validate ATS/static links
  const invalids = withHash.filter(x => !isAllowedJobUrl(x.job_url));
  const newbies = withHash.filter(x => !existingHashes.has(x._hash));
  const duplicates = withHash.filter(x => existingHashes.has(x._hash));
  csvWizard.items = withHash;
  csvWizard.newbies = newbies;
  csvWizard.duplicates = duplicates;
  csvWizard.invalids = invalids;
  csvWizard.selectedIds = new Set(newbies.map((_,i)=>String(i))); // select all by default (index as id in preview list)
}

function renderCsvStep2(){
  const body = document.getElementById('csvm-body');
  const preview = el('div',{},
    el('div',{class:'muted', style:'margin-bottom:8px;'}, `${csvWizard.newbies.length} new • ${csvWizard.duplicates.length} duplicates (skipped) • ${csvWizard.invalids.length} invalid links`)
  );
  const list = el('div',{});
  const show = csvWizard.items.slice(0, Math.max(10, csvWizard.items.length)); // show all if small; else first 10
  show.forEach((it, i) => {
    const isDup = csvWizard.duplicates.includes(it);
    const isBad = csvWizard.invalids.includes(it);
    const idx = csvWizard.items.indexOf(it);
    const id = String(idx);
    const checked = !isDup && !isBad && csvWizard.selectedIds.has(id);
    const row = el('div',{class:'cardk', style:'display:flex; align-items:center; gap:8px;'},
      el('input',{type:'checkbox', disabled:(isDup||isBad), checked, onchange:(e)=>{ if(e.target.checked) csvWizard.selectedIds.add(id); else csvWizard.selectedIds.delete(id);} }),
      el('div',{class:'title'}, `${it.company} — ${it.role}`),
      el('div',{class:'muted', style:'margin-left:auto;'}, isBad? 'Invalid link' : (isDup? 'Duplicate' : 'New'))
    );
    list.append(row);
  });
  preview.append(list);
  body.innerHTML = ''; body.append(preview);
}

function renderCsvStep3(){
  const body = document.getElementById('csvm-body');
  const count = Array.from(csvWizard.selectedIds).length;
  body.innerHTML = '';
  body.append(
    el('div',{class:'muted', style:'margin-bottom:8px;'}, `${count} rows ready to import. Duplicates will be skipped automatically.`),
  );
}

async function importSelectedRows(){
  const out = document.getElementById('import-result');
  const selected = Array.from(csvWizard.selectedIds).map(id => csvWizard.items[Number(id)]).filter(Boolean);
  const profile = await getProfile();
  // dynamic import of scoring
  let scorer; try { scorer = await import('./src/scoring.js'); } catch {}
  const toAdd = selected.map(it => {
    const id = crypto.randomUUID();
    const base = { id, company: it.company, role: it.role, job_url: it.job_url, status: it.status||'research', deadline: it.deadline||'', posted_at: it.posted_at||'', location: it.location||'', segment: it.segment||'', applicant_volume: it.applicant_volume||0, interest_score: it.interest_score||0, notes: it.notes||'', hash: it._hash, created_at: Date.now() };
    let enrich = {};
    try {
      const barriers = scorer?.detectBarriers ? scorer.detectBarriers(base) : [];
      const scores = scorer?.computeScores ? scorer.computeScores(base, profile) : { total: 70, energy: 7, cultureDims:{ comm:6, pace:6, feedback:6, collab:6 } };
      const honesty = scorer?.honestyLabel ? scorer.honestyLabel(scores, barriers) : { label:'Long Shot', why:[] };
      enrich = {
        base_score: scores.base||0, culture_score: scores.culture||0, timing_score: scores.timing||0, alumni_score: scores.alumni||0, work_style_score: scores.workstyle||0, total_fit: scores.total||0, energy_score: scores.energy||0, culture_dims: scores.cultureDims||{}, honesty_label: honesty.label, honesty_evidence: honesty.why||[], barriers
      };
    } catch {}
    return { ...base, ...enrich };
  });
  const db = await openDB();
  if (toAdd.length) {
    await bulkPut(db,'opportunities', toAdd);
    const ks = await loadKanbanState(db);
    for (const col of STAGES) if (!ks[col.id]) ks[col.id] = {column_id:col.id, opportunity_ids:[]};
    for (const o of toAdd) ks[o.status].opportunity_ids = [o.id, ...ks[o.status].opportunity_ids];
    await saveKanbanState(db, ks);
  }
  closeCsvWizard();
  if (out) out.textContent = `Imported ${toAdd.length} new, skipped ${csvWizard.items.length - toAdd.length}.`;
  await refresh();
  switchView('kanban');
}

// --- Helpers: ATS link validation, normalization, scoring ---
const ATS_ALLOW_HOSTS = [
  'boards.greenhouse.io', 'greenhouse.io', 'jobs.ashbyhq.com', 'ashbyhq.com',
  'jobs.lever.co', 'lever.co',
  'myworkdayjobs.com', 'workday.com',
  'smartrecruiters.com', 'careers.smartrecruiters.com',
  'jobvite.com', 'icims.com'
];
const AGGREGATOR_BLOCK_PARTS = [
  'linkedin.com/jobs', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
  'levels.fyi', 'wellfound.com', 'angel.co', 'himalayas.app', 'remotive.com',
  'weworkremotely.com', 'remoteok.com', 'workingnomads.com', 'jobicy.com'
];
function isAllowedJobUrl(url) {
  try {
    const u = new URL(url);
    if (AGGREGATOR_BLOCK_PARTS.some(p=>u.host.includes(p) || u.href.includes(p))) return false;
    if (ATS_ALLOW_HOSTS.some(h=>u.host.endsWith(h))) return true;
    // allow company domains that include careers or jobs path
    return /\/careers|\/jobs|\/careers\//i.test(u.pathname);
  } catch { return false; }
}
function normalizeLocation(val) {
  const s = (val||'').toLowerCase();
  if (!s) return '';
  if (s.includes('remote')) return 'Remote';
  if (s.includes('new york') || s.includes('nyc')) return 'NYC';
  if (s.includes('hybrid')) return 'Hybrid';
  return val;
}
function normalizeSegment(val) {
  const s = (val||'').toLowerCase();
  if (s.includes('ai')) return 'Applied AI';
  if (s.includes('health')) return 'HealthTech';
  if (s.includes('ecosystem') || s.includes('partner')) return 'Ecosystem/Partnerships';
  if (s.includes('innovation') || s.includes('new venture')) return 'Corporate Innovation';
  if (s.includes('saas') || s.includes('productivity') || s.includes('plg')) return 'SaaS Productivity';
  return val;
}
function fitFromFlag(flag) {
  const s = (flag||'').toLowerCase();
  if (!s) return 0;
  if (s.includes('strong')) return 90;
  if (s.includes('good') || s.includes('solid')) return 80;
  if (s.includes('stretch') || s.includes('maybe')) return 65;
  if (s.includes('poor') || s.includes('low')) return 40;
  return 0;
}
function inferInterest(vol) {
  const n = Number(vol)||0;
  if (n <= 0) return 0;
  if (n < 20) return 30;
  if (n < 100) return 55;
  if (n < 300) return 70;
  return 85;
}

// --- Stage preferences ---
async function loadStagesPref() {
  try {
    const db = await openDB();
    const pref = await get(db, 'user_preferences', 'stages');
    const arr = Array.isArray(pref?.value) ? pref.value : null;
    if (arr && arr.length) {
      STAGES = arr.map(x=>({ id: slugify(x.id||x.name), name: x.name||x.id }));
    }
  } catch {}
}
async function saveStagesPref(names) {
  const db = await openDB();
  const arr = names.map(n=>({ id: slugify(n), name: n }));
  await put(db, 'user_preferences', { key:'stages', value: arr });
  STAGES = arr;
  // normalize all opportunities to first column if unknown
  const opps = await getAll(db,'opportunities');
  const ids = new Set(STAGES.map(s=>s.id));
  for (const o of opps) { if (!ids.has(o.status)) { o.status = STAGES[0]?.id || 'research'; await put(db,'opportunities', o); } }
  // reset kanban lanes
  const ks = {};
  for (const s of STAGES) ks[s.id] = { column_id: s.id, opportunity_ids: [] };
  const all = await getAll(db,'opportunities');
  for (const o of all) {
    if (!ks[o.status]) ks[o.status] = { column_id:o.status, opportunity_ids: [] };
    ks[o.status].opportunity_ids.push(o.id);
  }
  await bulkPut(db,'kanban_state', Object.values(ks));
}
function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'stage'; }
