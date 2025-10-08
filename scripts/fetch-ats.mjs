#!/usr/bin/env node
// Fetch live product/strategy roles from ATS (Greenhouse + Lever) and output CSV.
// Output: jobflow-pwa/output/target_sourced.csv

import fs from 'node:fs/promises';

// Use built-in fetch (Node 18+). If unavailable, try dynamic import of node-fetch.
const fetchFn = globalThis.fetch ?? (await import('node-fetch').then(m=>m.default).catch(()=>{ throw new Error('fetch not available'); }));

const TARGETS = [
  // Greenhouse slug, Company, Segment
  { type:'greenhouse', slug:'notion', company:'Notion', segment:'SaaS Productivity' },
  { type:'greenhouse', slug:'figma', company:'Figma', segment:'SaaS Productivity' },
  // HealthTech examples (modernhealth on Lever)
  { type:'lever', org:'modernhealth', company:'Modern Health', segment:'HealthTech' },
  // Add more companies as needed…
];

const CSV_HEADER = ['Company','Role Title','Segment / Industry','Location','Direct Job Link','Fit Flag','Notes'];

function normLocation(s=''){
  const x = s.toLowerCase();
  if (x.includes('remote')) return 'Remote';
  if (x.includes('new york') || x.includes('ny') || x.includes('nyc')) return 'NYC';
  if (x.includes('hybrid')) return 'Hybrid';
  return s;
}

function isRoleIncluded(title){
  const t = title.toLowerCase();
  const include = (
    /product manager|product management/.test(t) ||
    /product marketing/.test(t) ||
    /product strategy|strategy/.test(t) ||
    /business operations|biz ops/.test(t) ||
    /corporate strategy/.test(t) ||
    /ecosystem|partnership/.test(t) ||
    /innovation/.test(t)
  );
  const exclude = (
    /engineer|developer|devrel|data scientist|ml engineer|qa|security|it|finance|legal|compliance|clinical|tpm|technical program/.test(t) ||
    /design|designer/.test(t) ||
    /intern|contract|temporary|temp/.test(t) ||
    (/support/.test(t) && !/strategy/.test(t)) ||
    (/researcher/.test(t) && !/strategy/.test(t))
  );
  return include && !exclude;
}

function seniorityFlag(title){
  const t = title.toLowerCase();
  return /(senior|lead|principal|head|director)/.test(t);
}

function fitFlag({ title, loc }){
  const strong = isRoleIncluded(title) && seniorityFlag(title) && (loc==='Remote' || loc==='NYC' || loc==='Hybrid');
  return strong ? '✅ Strong Fit' : '⚠️ Stretch';
}

function dedupe(objs){
  const seen = new Set();
  return objs.filter(o=>{
    const key = (o['Company']+'|'+o['Role Title']+'|'+o['Direct Job Link']).toLowerCase();
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}

async function fetchGreenhouse(slug, company, segment){
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const res = await fetchFn(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) { console.warn(`Greenhouse fetch failed for ${slug}: ${res.status}`); return []; }
  const data = await res.json();
  const out = [];
  for (const j of data.jobs||[]) {
    const title = j.title||'';
    const loc = normLocation(j?.location?.name||'');
    if (!isRoleIncluded(title)) continue;
    const link = j.absolute_url || j.hosted_url || j?.url || '';
    const fit = fitFlag({ title, loc });
    const note = `${loc==='Remote'?'remote-first':loc} • GH`;
    out.push({
      'Company': company,
      'Role Title': title,
      'Segment / Industry': segment,
      'Location': loc,
      'Direct Job Link': link,
      'Fit Flag': fit,
      'Notes': note
    });
  }
  return out;
}

async function fetchLever(org, company, segment){
  const url = `https://api.lever.co/v0/postings/${org}?mode=json`;
  const res = await fetchFn(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) { console.warn(`Lever fetch failed for ${org}: ${res.status}`); return []; }
  const data = await res.json();
  const out = [];
  for (const j of data||[]) {
    const title = j.text||'';
    const loc = normLocation(j?.categories?.location || '');
    if (!isRoleIncluded(title)) continue;
    const link = j.hostedUrl || j.applyUrl || j.userPostingUrl || '';
    const fit = fitFlag({ title, loc });
    const note = `${loc==='Remote'?'remote-first':loc} • Lever`;
    out.push({
      'Company': company,
      'Role Title': title,
      'Segment / Industry': segment,
      'Location': loc,
      'Direct Job Link': link,
      'Fit Flag': fit,
      'Notes': note
    });
  }
  return out;
}

function toCsvLines(objs){
  const head = CSV_HEADER;
  const rows = objs.map(o => head.map(h => `"${String(o[h]??'').replace(/"/g,'""')}"`).join(','));
  return [head.join(',')].concat(rows);
}

async function main(){
  const results = [];
  for (const t of TARGETS) {
    try {
      if (t.type==='greenhouse') results.push(...await fetchGreenhouse(t.slug, t.company, t.segment));
      if (t.type==='lever') results.push(...await fetchLever(t.org, t.company, t.segment));
    } catch (_) {}
  }
  const deduped = dedupe(results);
  const lines = toCsvLines(deduped);
  const outDir = new URL('../output/', import.meta.url);
  const outPath = new URL('target_sourced.csv', outDir);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  console.log('Wrote', outPath.pathname);
}

main().catch(e=>{ console.error(e); process.exit(1); });
