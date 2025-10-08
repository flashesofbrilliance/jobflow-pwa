#!/usr/bin/env node
// Fetch live product/strategy roles from ATS (Greenhouse + Lever) and output CSV.
// Output: jobflow-pwa/output/target_sourced.csv

import fs from 'node:fs/promises';

// Use built-in fetch (Node 18+). If unavailable, try dynamic import of node-fetch.
const fetchFn = globalThis.fetch ?? (await import('node-fetch').then(m=>m.default).catch(()=>{ throw new Error('fetch not available'); }));

let TARGETS = [
  // Greenhouse slug, Company, Segment
  { type:'greenhouse', slug:'notion', company:'Notion', segment:'SaaS Productivity' },
  { type:'greenhouse', slug:'figma', company:'Figma', segment:'SaaS Productivity' },
  // HealthTech examples (modernhealth on Lever)
  { type:'lever', org:'modernhealth', company:'Modern Health', segment:'HealthTech' },
  // Add more companies as needed…
];

const CSV_HEADER = ['Company','Role Title','Segment / Industry','Location','Direct Job Link','Fit Flag','Notes'];
let SEGMENT_MAP = {};

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

function inferSegment(company='', title=''){
  const fromMap = SEGMENT_MAP[company] || SEGMENT_MAP[company?.replace(/\s+Labs$/,'')] || '';
  if (fromMap) return fromMap;
  const c = (company||'').toLowerCase();
  const t = (title||'').toLowerCase();
  if (/(\b|\s)(ai|genai|ml|llm|agent|copilot)(\b|\s)/.test(c) || /(\b|\s)(ai|genai|ml|llm|agent|copilot)(\b|\s)/.test(t)) return 'Applied AI';
  if (/(\b|\s)(health|clinical|care|behavior)(\b|\s)/.test(c) || /(\b|\s)(health|clinical|care|behavior)(\b|\s)/.test(t)) return 'HealthTech';
  if (/(productivity|docs|collab|design|note|workspace)/.test(c) || /(product|product marketing|collaboration|docs|workspace)/.test(t)) return 'SaaS Productivity';
  if (/(okta|identity|wallet|chain|crypto|defi|ecosystem|partner|exchange|protocol|web3)/.test(c) || /(ecosystem|partner|platform|identity|wallet|protocol|web3|crypto|defi)/.test(t)) return 'Ecosystem/Partnerships';
  return '';
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

function parseSince(arg){
  if (!arg) return null;
  const m = String(arg).match(/^(\d+)([dh])$/i);
  if (!m) return null;
  const n = Number(m[1]); const unit = m[2].toLowerCase();
  const ms = unit==='d' ? n*24*3600*1000 : n*3600*1000;
  return Date.now() - ms;
}

async function fetchGreenhouse(slug, company, segment){
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const res = await fetchFn(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) { console.warn(`Greenhouse fetch failed for ${slug}: ${res.status}`); return []; }
  const data = await res.json();
  const out = [];
  for (const j of (data.jobs||[])) {
    const title = j.title||'';
    const loc = normLocation(j?.location?.name||'');
    if (!isRoleIncluded(title)) continue;
    const link = j.absolute_url || j.hosted_url || j?.url || '';
    // recency if available
    const updated = j.updated_at ? new Date(j.updated_at) : null;
    const fit = fitFlag({ title, loc });
    const recent = updated ? ((Date.now()-updated.getTime()) <= 60*24*3600*1000) : '';
    const note = `${loc==='Remote'?'remote-first':loc}${recent?' • ≤60d':''} • GH`;
    out.push({
      'Company': company,
      'Role Title': title,
      'Segment / Industry': segment || inferSegment(company, title),
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
  for (const j of (data||[])) {
    const title = j.text||'';
    const loc = normLocation(j?.categories?.location || '');
    if (!isRoleIncluded(title)) continue;
    const link = j.hostedUrl || j.applyUrl || j.userPostingUrl || '';
    const created = j.createdAt ? new Date(j.createdAt) : null;
    const fit = fitFlag({ title, loc });
    const recent = created ? ((Date.now()-created.getTime()) <= 60*24*3600*1000) : '';
    const note = `${loc==='Remote'?'remote-first':loc}${recent?' • ≤60d':''} • Lever`;
    out.push({
      'Company': company,
      'Role Title': title,
      'Segment / Industry': segment || inferSegment(company, title),
      'Location': loc,
      'Direct Job Link': link,
      'Fit Flag': fit,
      'Notes': note
    });
  }
  return out;
}

async function fetchAshby(org, company, segment){
  // Public org jobs API
  const api = `https://jobs.ashbyhq.com/api/org/${org}/jobs`;
  const res = await fetchFn(api, { headers: { 'accept':'application/json' } });
  if (!res.ok) { console.warn(`Ashby ${org}: ${res.status}`); return [];
  }
  const data = await res.json();
  const out = [];
  for (const j of (data?.jobs||[])) {
    const title = j.title || '';
    const loc = normLocation(j?.location || '');
    if (!isRoleIncluded(title)) continue;
    const link = j.jobUrl || j.applyUrl || `https://jobs.ashbyhq.com/${org}`;
    const fit = fitFlag({ title, loc });
    const note = `${loc==='Remote'?'remote-first':loc} • Ashby`;
    out.push({
      'Company': company,
      'Role Title': title,
      'Segment / Industry': segment || inferSegment(company, title),
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
  const args = process.argv.slice(2);
  let getroBoards = args.filter(a=>a.startsWith('--getro=')).map(a=>a.split('=')[1]);
  const targetsFile = (args.find(a=>a.startsWith('--targets='))||'').split('=')[1];
  const deltaFileArg = (args.find(a=>a.startsWith('--state='))||'').split('=')[1] || 'output/fetch_state.json';
  const deltaOnly = args.includes('--delta-only');
  const sinceArg = (args.find(a=>a.startsWith('--since='))||'').split('=')[1] || '';
  const sinceTs = parseSince(sinceArg);
  // Load segment map (optional)
  try {
    const segUrl = new URL('../data/company-segments.json', import.meta.url);
    SEGMENT_MAP = JSON.parse(await fs.readFile(segUrl,'utf8'));
  } catch {}
  // Load boards from JSON file if provided or default registry
  const boardsFile = (args.find(a=>a.startsWith('--boards-file='))||'').split('=')[1];
  try {
    const bfUrl = boardsFile ? new URL('../'+boardsFile, import.meta.url) : new URL('../data/vc-boards.json', import.meta.url);
    const boards = JSON.parse(await fs.readFile(bfUrl, 'utf8'));
    const urls = (boards||[]).map(b=>b?.url).filter(Boolean);
    getroBoards = [...new Set([...(getroBoards||[]), ...urls])];
  } catch {}
  if (targetsFile) {
    try {
      const text = await fs.readFile(targetsFile, 'utf8');
      const json = JSON.parse(text);
      if (Array.isArray(json)) TARGETS = TARGETS.concat(json);
    } catch (e) { console.warn('Failed to load targets file', targetsFile, e.message); }
  }
  const results = [];
  for (const t of TARGETS) {
    try {
      if (t.type==='greenhouse') results.push(...await fetchGreenhouse(t.slug, t.company, t.segment));
      if (t.type==='lever') results.push(...await fetchLever(t.org, t.company, t.segment));
      if (t.type==='ashby') results.push(...await fetchAshby(t.org, t.company, t.segment));
    } catch (_) {}
  }
  for (const board of getroBoards) {
    try { results.push(...await fetchGetroBoard(board)); } catch (_) {}
  }
  let deduped = dedupe(results);

  // Optional time filter (sinceTs based on provider timestamps in Notes if present is weak), keep simple: skip if sinceTs set and we cannot infer recency signal.
  if (sinceTs) {
    deduped = deduped.filter(r => /≤60d/.test(r['Notes']) || true);
  }

  // Load prior state for delta
  let state = { seen: {} };
  try {
    const url = new URL('../'+deltaFileArg, import.meta.url);
    state = JSON.parse(await fs.readFile(url,'utf8'));
  } catch {}

  const nowIso = new Date().toISOString();
  const nextSeen = { ...(state.seen||{}) };
  const withDelta = deduped.map(r => {
    const id = r['Direct Job Link'];
    const was = nextSeen[id];
    const isNew = !was;
    nextSeen[id] = nowIso;
    return { row: r, isNew };
  });
  if (deltaOnly) {
    deduped = withDelta.filter(x=>x.isNew).map(x=>x.row);
  }
  const lines = toCsvLines(deduped);
  // Output handling: --out can be a file or a directory. Default is timestamped CSV in output/
  const ts = new Date().toISOString().replace(/[-:]/g,'').slice(0,13); // YYYYMMDDTHH
  const outArg = (args.find(a=>a.startsWith('--out='))||'').split('=')[1] || '';
  let outFileUrl;
  if (outArg) {
    const isCsv = /\.csv$/i.test(outArg);
    const rel = isCsv ? outArg : outArg.replace(/\/?$/, '/')+`target_sourced_${ts}.csv`;
    outFileUrl = new URL(rel, import.meta.url);
  } else {
    outFileUrl = new URL(`../output/target_sourced_${ts}.csv`, import.meta.url);
  }
  const outParent = new URL('.', outFileUrl);
  await fs.mkdir(outParent, { recursive: true });
  await fs.writeFile(outFileUrl, lines.join('\n'), 'utf8');
  // Also write/update a stable latest pointer for convenience
  const latestUrl = new URL('../output/target_sourced.csv', import.meta.url);
  await fs.writeFile(latestUrl, lines.join('\n'), 'utf8');
  console.log('Wrote', outFileUrl.pathname);
  console.log('Updated latest ->', latestUrl.pathname);

  // Persist state
  try {
    const stateUrl = new URL('../'+deltaFileArg, import.meta.url);
    await fs.mkdir(new URL('.', stateUrl), { recursive: true });
    await fs.writeFile(stateUrl, JSON.stringify({ seen: nextSeen }, null, 2), 'utf8');
    console.log('Updated state ->', stateUrl.pathname);
  } catch {}
}

main().catch(e=>{ console.error(e); process.exit(1); });
// --- Getro-like board scraper (extract ATS links from VC boards) ---
const ATS_HOST_ALLOW = [
  'boards.greenhouse.io', 'greenhouse.io', 'jobs.lever.co', 'lever.co',
  'jobs.ashbyhq.com', 'ashbyhq.com', 'myworkdayjobs.com', 'workday.com',
  'smartrecruiters.com', 'personio.de', 'personio.com', 'workable.com',
  'teamtailor.com', 'recruitee.com', 'jobvite.com', 'icims.com', 'bamboohr.com'
];

function extractLinks(html, base){
  const links = [];
  const hrefRe = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>(.*?)<\/a>/gi;
  let m; while ((m = hrefRe.exec(html))) {
    try {
      const u = new URL(m[1], base);
      links.push(u.href);
    } catch {}
  }
  return Array.from(new Set(links));
}

async function fetchGetroBoard(boardUrl){
  const res = await fetchFn(boardUrl, { headers: { 'accept':'text/html' } });
  if (!res.ok) { console.warn('Getro fetch failed', boardUrl, res.status); return []; }
  const html = await res.text();
  const links = extractLinks(html, res.url).filter(href => {
    try { const h = new URL(href).host; return ATS_HOST_ALLOW.some(a => h.endsWith(a)); } catch { return false; }
  });
  const out = [];
  for (const link of links) {
    let title = '';
    let company = '';
    let loc = '';
    try {
      const r = await fetchFn(link, { headers: { 'accept':'text/html' } });
      if (r.ok) {
        const page = await r.text();
        const t = page.match(/<title>([^<]{1,200})<\/title>/i)?.[1] || '';
        title = t.replace(/\s+\|.*$/,'').trim();
        const urlObj = new URL(link);
        const ldjson = Array.from(page.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map(m=>m[1]);
        for (const block of ldjson) {
          try {
            const data = JSON.parse(block);
            const arr = Array.isArray(data) ? data : [data];
            for (const d of arr) {
              const type = String(d['@type']||'').toLowerCase();
              if (type.includes('jobposting')) {
                company = company || d?.hiringOrganization?.name || '';
                const addr = d?.jobLocation?.address || (Array.isArray(d?.jobLocation)? d.jobLocation[0]?.address : {} ) || {};
                loc = loc || addr?.addressLocality || addr?.addressRegion || '';
              }
            }
          } catch {}
        }
        if (!company && urlObj.host.endsWith('greenhouse.io')) {
          const parts = urlObj.pathname.split('/').filter(Boolean);
          company = (parts[0] || '').replace(/-/g,' ').trim();
        }
        if (!loc) {
          if (/remote/i.test(page)) loc = 'Remote';
          else if (/new york|nyc|\bny\b/i.test(page)) loc = 'NYC';
          else if (/hybrid/i.test(page)) loc = 'Hybrid';
        }
        loc = normLocation(loc||'');
      }
    } catch {}
    if (!title) continue;
    if (!isRoleIncluded(title)) continue;
    const fit = fitFlag({ title, loc });
    const note = `${loc==='Remote'?'remote-first':(loc||'')}`.trim()+ ' • ATS';
    out.push({
      'Company': company || '',
      'Role Title': title,
      'Segment / Industry': '',
      'Location': loc || '',
      'Direct Job Link': link,
      'Fit Flag': fit,
      'Notes': note
    });
  }
  return out;
}
