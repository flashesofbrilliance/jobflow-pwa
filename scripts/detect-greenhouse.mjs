#!/usr/bin/env node
// Detect which company slugs exist on Greenhouse job boards by probing the public API
// Usage:
//  node scripts/detect-greenhouse.mjs --in=companies.txt [--out=output/greenhouse_detect.csv]
// Input format: one company name per line (e.g., Alchemy, Coinbase)

import fs from 'node:fs/promises';

const fetchFn = globalThis.fetch ?? (await import('node-fetch').then(m=>m.default).catch(()=>{ throw new Error('fetch not available'); }));

function slugify(name){
  return String(name||'')
    .toLowerCase()
    .replace(/&/g,'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

function variants(name){
  const base = slugify(name.replace(/\b(inc|llc|ltd|labs|technologies|technology|corp|co|company)\b/gi,'').trim());
  const raw = slugify(name);
  const out = new Set([base, raw]);
  // extra heuristics
  if (base.endsWith('-inc')) out.add(base.replace(/-inc$/,''));
  if (base.endsWith('-labs')) out.add(base.replace(/-labs$/,''));
  if (base.includes(' - ')) out.add(base.replace(/-+/g,''));
  return Array.from(out).filter(Boolean);
}

async function probeGreenhouse(slug){
  const api = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const res = await fetchFn(api, { headers: { 'accept':'application/json' } });
  if (!res.ok) return { ok:false, status:res.status };
  try {
    const json = await res.json();
    const count = Array.isArray(json?.jobs) ? json.jobs.length : 0;
    return { ok:true, count };
  } catch (e) {
    return { ok:false, status: 'bad_json' };
  }
}

async function main(){
  const args = Object.fromEntries(process.argv.slice(2).map(a=>{
    const [k,v] = a.split('=');
    return [k.replace(/^--/,''), v];
  }));
  const input = args.in;
  const outArg = args.out || '';
  if (!input) { console.error('Usage: node scripts/detect-greenhouse.mjs --in=companies.txt [--out=output/greenhouse_detect.csv|output/]'); process.exit(1); }
  const text = await fs.readFile(input, 'utf8');
  const names = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const results = [];
  for (const name of names) {
    const slugs = variants(name);
    let found = null; let count = 0;
    for (const s of slugs) {
      try {
        const r = await probeGreenhouse(s);
        if (r.ok) { found = s; count = r.count; break; }
      } catch {}
    }
    results.push({ Company:name, Slug: found||'', Found: found? 'yes':'no', Jobs: count });
  }
  const header = ['Company','Slug','Found','Jobs'];
  const lines = [header.join(',')].concat(results.map(o=>header.map(h=>`"${String(o[h]??'').replace(/"/g,'""')}"`).join(',')));
  const ts = new Date().toISOString().replace(/[-:]/g,'').slice(0,13);
  let outFileUrl;
  if (outArg) {
    const isCsv = /\.csv$/i.test(outArg);
    const rel = isCsv ? outArg : outArg.replace(/\/?$/, '/')+`greenhouse_detect_${ts}.csv`;
    outFileUrl = new URL('../' + rel, import.meta.url);
  } else {
    outFileUrl = new URL(`../output/greenhouse_detect_${ts}.csv`, import.meta.url);
  }
  const parent = new URL('.', outFileUrl);
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(outFileUrl, lines.join('\n'), 'utf8');
  const latestUrl = new URL('../output/greenhouse_detect.csv', import.meta.url);
  await fs.writeFile(latestUrl, lines.join('\n'), 'utf8');
  console.log('Wrote', outFileUrl.pathname);
  console.log('Updated latest ->', latestUrl.pathname);
}

main().catch(e=>{ console.error(e); process.exit(1); });
