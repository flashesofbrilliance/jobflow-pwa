// JobFlow PWA - App Core (ESM, no deps)
const APP_VERSION = '1.0.0';
const DB_NAME = 'jobflow';
const DB_VERSION = 5; // align with any prior higher-version DB to avoid VersionError

const STAGES = [
  { id: 'research', name: 'Research' },
  { id: 'to-apply', name: 'To Apply' },
  { id: 'applied', name: 'Applied' },
  { id: 'interview', name: 'Interview' },
  { id: 'offer', name: 'Offer/Reject' }
];

const PRIORITY_COLORS = { P0: '#FF5459', P1: '#22C55E', P2: '#F59E0B', P3: '#6B7280' };
const OBJECTION_TAGS = ['RoleMismatch','Location','Compensation','Stage','Timing','Culture','Health'];
const EXCLUSION_FLAGS = ['RoleMismatch','Location','Compensation','Stage','Timing','Culture','Health'];

// CSV header synonyms for smarter auto-mapping
const HEADER_SYNONYMS = {
  company: ['company','employer','org','organization','company_name'],
  role: ['role','title','position','job_title'],
  job_url: ['job_url','url','link','job_link','posting','posting_url'],
  status: ['status','stage','pipeline','column'],
  priority_score: ['priority_score','priority','prio','score_priority'],
  fit_score: ['fit_score','fit','match','score_fit'],
  deadline: ['deadline','due','due_date','apply_by','application_deadline'],
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
      }
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
    return { id, company: s.company, role: s.role, status: s.status, priority_score: s.fit_score, fit_score: s.fit_score, deadline: s.deadline || '', notes: '', job_url, hash, created_at: Date.now() };
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
  for (const col of STAGES) {
    const ids = kstate[col.id]?.opportunity_ids || [];
    const items = ids.length ? ids.map(id => opps.find(o => o.id === id)).filter(Boolean)
                             : opps.filter(o => o.status === col.id);
    const h3 = el('h3',{}, el('span',{}, col.name), el('span',{class:'muted'}, `${items.length}`));
    const lane = el('div',{class:'lane', ondragover:(e)=>e.preventDefault(), ondrop:(e)=>onDrop(e,col.id)});
    const column = el('div',{class:'column', dataset:{col:col.id}});
    column.append(h3,lane);
    for (const o of items) lane.append(cardEl(o));
    root.append(column);
  }
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
  o.status = newCol;
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
  renderArchive(await getAll(db,'qualification_reviews'), opps);
  renderAnalytics(opps, await getAll(db,'qualification_reviews'));
  updateCaps(opps.length>0);
}

function updateCaps(hasData) {
  const caps = capabilityModel(hasData);
  $('#cap-status').textContent = [
    'Offline-first',
    caps.qualificationAvailable?'Qual: on':'Qual: off',
    caps.analyticsAvailable?'Analytics: on':'Analytics: off'
  ].join(' • ');
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
  if (decision === 'Accept') { opp.status = 'to-apply'; }
  if (decision === 'Reject') { opp.status = 'offer'; }
  await put(db,'opportunities', opp);
  const kstate = await loadKanbanState(db);
  for (const col of STAGES) {
    if (!kstate[col.id]) kstate[col.id] = {column_id: col.id, opportunity_ids: []};
    kstate[col.id].opportunity_ids = kstate[col.id].opportunity_ids.filter(x=>x!==opp.id);
  }
  const target = opp.status;
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
  await refresh();
  switchView('kanban');
})();

// === CSV Import Wizard ===
let csvWizard = { step: 1, rows: [], header: [], fileName: '', mapping: {}, items: [], duplicates: [], newbies: [], selectedIds: new Set() };

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
  const required = ['company','role','job_url','status','priority_score','fit_score','deadline','notes'];
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
  const required = ['company','role','job_url','status','priority_score','fit_score','deadline','notes'];
  const table = el('div',{},
    el('div',{class:'muted', style:'margin-bottom:8px;'}, `File: ${csvWizard.fileName}`),
    el('div',{class:'muted', style:'margin-bottom:8px;'}, 'Map your CSV columns to required fields.'),
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
    })
  );
  body.innerHTML = ''; body.append(table);
}

async function buildItemsFromMapping(){
  const header = csvWizard.header;
  const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
  const map = csvWizard.mapping;
  const rows = csvWizard.rows.slice(1);
  const items = rows.map(r => ({
    company: (r[idx[map.company]]||'').trim(),
    role: (r[idx[map.role]]||'').trim(),
    job_url: (r[idx[map.job_url]]||'').trim(),
    status: (r[idx[map.status]]||'research').trim() || 'research',
    priority_score: Number(r[idx[map.priority_score]]||0)||0,
    fit_score: Number(r[idx[map.fit_score]]||0)||0,
    deadline: (r[idx[map.deadline]]||'').trim(),
    notes: (r[idx[map.notes]]||'').trim(),
  })).filter(x=>x.company && x.role);

  const db = await openDB();
  const existing = await getAll(db,'opportunities');
  const existingHashes = new Set(existing.map(e => e.hash));
  const withHash = items.map(it => ({...it, _hash: hashKey([it.company,it.role,it.job_url].join('|').toLowerCase()) }));
  const newbies = withHash.filter(x => !existingHashes.has(x._hash));
  const duplicates = withHash.filter(x => existingHashes.has(x._hash));
  csvWizard.items = withHash;
  csvWizard.newbies = newbies;
  csvWizard.duplicates = duplicates;
  csvWizard.selectedIds = new Set(newbies.map((_,i)=>String(i))); // select all by default (index as id in preview list)
}

function renderCsvStep2(){
  const body = document.getElementById('csvm-body');
  const preview = el('div',{},
    el('div',{class:'muted', style:'margin-bottom:8px;'}, `${csvWizard.newbies.length} new • ${csvWizard.duplicates.length} duplicates (skipped)`)
  );
  const list = el('div',{});
  const show = csvWizard.items.slice(0, Math.max(10, csvWizard.items.length)); // show all if small; else first 10
  show.forEach((it, i) => {
    const isDup = csvWizard.duplicates.includes(it);
    const idx = csvWizard.items.indexOf(it);
    const id = String(idx);
    const checked = !isDup && csvWizard.selectedIds.has(id);
    const row = el('div',{class:'cardk', style:'display:flex; align-items:center; gap:8px;'},
      el('input',{type:'checkbox', disabled:isDup, checked, onchange:(e)=>{ if(e.target.checked) csvWizard.selectedIds.add(id); else csvWizard.selectedIds.delete(id);} }),
      el('div',{class:'title'}, `${it.company} — ${it.role}`),
      el('div',{class:'muted', style:'margin-left:auto;'}, isDup? 'Duplicate' : 'New')
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
  const toAdd = selected.map(it => ({ id: crypto.randomUUID(), company: it.company, role: it.role, job_url: it.job_url, status: it.status||'research', priority_score: it.priority_score||0, fit_score: it.fit_score||0, deadline: it.deadline||'', notes: it.notes||'', hash: it._hash, created_at: Date.now() }));
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
