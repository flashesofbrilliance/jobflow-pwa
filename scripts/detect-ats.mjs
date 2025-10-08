#!/usr/bin/env node
// Detect Lever and Ashby orgs for a list of companies (best-effort slug guesses)
// Usage: node scripts/detect-ats.mjs --in=companies.txt --out=output/ats_detect.csv

import fs from 'node:fs/promises';

const fetchFn = globalThis.fetch ?? (await import('node-fetch').then(m=>m.default).catch(()=>{ throw new Error('fetch not available'); }));

function slugify(name){
  return String(name||'')
    .toLowerCase()
    .replace(/&/g,'and')
    .replace(/\b(inc|llc|ltd|labs|technologies|technology|tech|corp|co|company|foundation|capital)\b/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}
function variants(name){
  const base = slugify(name).trim();
  const compact = base.replace(/-/g,'');
  const parts = new Set([base, compact]);
  if (base.endsWith('-inc')) parts.add(base.replace(/-inc$/,''));
  if (base.endsWith('-labs')) parts.add(base.replace(/-labs$/,''));
  if (base.endsWith('-capital')) parts.add(base.replace(/-capital$/,''));
  return Array.from(parts).filter(Boolean);
}

async function detectLever(org){
  const url = `https://api.lever.co/v0/postings/${org}?mode=json`;
  try {
    const res = await fetchFn(url, { headers: { 'accept':'application/json' } });
    if (!res.ok) return { ok:false, count:0 };
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : 0;
    return { ok: true, count };
  } catch { return { ok:false, count:0 }; }
}

async function detectAshby(org){
  // Prefer public API if available
  const api = `https://jobs.ashbyhq.com/api/org/${org}/jobs`;
  try {
    const res = await fetchFn(api, { headers: { 'accept':'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs.length : 0;
      return { ok:true, count: jobs };
    }
  } catch {}
  // Fallback to landing HTML check
  try {
    const res = await fetchFn(`https://jobs.ashbyhq.com/${org}`, { headers: { 'accept':'text/html' } });
    if (!res.ok) return { ok:false, count:0 };
    const html = await res.text();
    const looksLike = /ashbyhq/i.test(html) && /Job/i.test(html);
    return { ok: looksLike, count: looksLike? 1:0 };
  } catch { return { ok:false, count:0 }; }
}

async function main(){
  const args = Object.fromEntries(process.argv.slice(2).map(a=>{ const [k,v]=a.split('='); return [k.replace(/^--/,''),v]; }));
  const input = args.in;
  const outArg = args.out || '';
  if (!input) { console.error('Usage: node scripts/detect-ats.mjs --in=companies.txt [--out=output/ats_detect.csv|output/]'); process.exit(1); }
  const names = (await fs.readFile(input,'utf8')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const results = [];
  for (const name of names) {
    let leverOrg = ''; let leverFound = 'no'; let leverCount = 0;
    let ashbyOrg = ''; let ashbyFound = 'no'; let ashbyCount = 0;
    for (const v of variants(name)) {
      const r = await detectLever(v);
      if (r.ok) { leverOrg = v; leverFound = 'yes'; leverCount = r.count; break; }
    }
    for (const v of variants(name)) {
      const r = await detectAshby(v);
      if (r.ok) { ashbyOrg = v; ashbyFound = 'yes'; ashbyCount = r.count; break; }
    }
    results.push({ Company:name, LeverOrg:leverOrg, LeverFound:leverFound, LeverJobs:leverCount, AshbyOrg:ashbyOrg, AshbyFound:ashbyFound, AshbyJobs:ashbyCount });
  }
  const header = ['Company','LeverOrg','LeverFound','LeverJobs','AshbyOrg','AshbyFound','AshbyJobs'];
  const lines = [header.join(',')].concat(results.map(o=>header.map(h=>`"${String(o[h]??'').replace(/"/g,'""')}"`).join(',')));
  const ts = new Date().toISOString().replace(/[-:]/g,'').slice(0,13);
  let outFileUrl;
  if (outArg) {
    const isCsv = /\.csv$/i.test(outArg);
    const rel = isCsv ? outArg : outArg.replace(/\/?$/, '/')+`ats_detect_${ts}.csv`;
    outFileUrl = new URL('../' + rel, import.meta.url);
  } else {
    outFileUrl = new URL(`../output/ats_detect_${ts}.csv`, import.meta.url);
  }
  const parent = new URL('.', outFileUrl);
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(outFileUrl, lines.join('\n'), 'utf8');
  const latestUrl = new URL('../output/ats_detect.csv', import.meta.url);
  await fs.writeFile(latestUrl, lines.join('\n'), 'utf8');
  console.log('Wrote', outFileUrl.pathname);
  console.log('Updated latest ->', latestUrl.pathname);
}

main().catch(e=>{ console.error(e); process.exit(1); });
