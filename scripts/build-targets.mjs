#!/usr/bin/env node
// Build a combined targets.json from detection CSVs (Greenhouse + Lever + Ashby)
// Usage: node scripts/build-targets.mjs --gh=output/greenhouse_detect.csv --ats=output/ats_detect.csv --out=output/targets.json

import fs from 'node:fs/promises';

function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map(s=>s.replace(/^"|"$/g,''));
  const rows = [];
  for (let i=1;i<lines.length;i++){
    const line = lines[i];
    const cols = [];
    let cur=''; let inq=false;
    for (let j=0;j<line.length;j++){
      const c=line[j];
      if (c==='"'){ if (inq && line[j+1]==='"'){ cur+='"'; j++; } else inq=!inq; continue; }
      if (c===',' && !inq){ cols.push(cur); cur=''; } else cur+=c;
    }
    cols.push(cur);
    const obj = {}; header.forEach((h,idx)=>obj[h]=cols[idx]?.replace(/^"|"$/g,'')||'');
    rows.push(obj);
  }
  return rows;
}

function inferSegment(name=''){
  const s = name.toLowerCase();
  if (/(ai|ml|genai|model|llm)/.test(s)) return 'Applied AI';
  if (/(health|clinical|care|behavior)/.test(s)) return 'HealthTech';
  if (/(productivity|saas|collab|docs|design)/.test(s)) return 'SaaS Productivity';
  if (/(ecosystem|partner|identity|okta|auth)/.test(s)) return 'Ecosystem/Partnerships';
  return '';
}

async function main(){
  const args = Object.fromEntries(process.argv.slice(2).map(a=>{ const [k,v]=a.split('='); return [k.replace(/^--/,''),v]; }));
  const gh = args.gh; const ats = args.ats; const outArg = args.out || '';
  if (!gh && !ats) { console.error('Usage: node scripts/build-targets.mjs --gh=output/greenhouse_detect.csv --ats=output/ats_detect.csv --out=output/targets.json'); process.exit(1); }
  const targets = [];
  if (gh) {
    const ghRows = parseCSV(await fs.readFile(gh,'utf8'));
    for (const r of ghRows) {
      if (r.Found==='yes' && r.Slug) {
        targets.push({ type:'greenhouse', slug:r.Slug, company:r.Company, segment: inferSegment(r.Company) });
      }
    }
  }
  if (ats) {
    const aRows = parseCSV(await fs.readFile(ats,'utf8'));
    for (const r of aRows) {
      if (r.LeverFound==='yes' && r.LeverOrg) targets.push({ type:'lever', org:r.LeverOrg, company:r.Company, segment: inferSegment(r.Company) });
      if (r.AshbyFound==='yes' && r.AshbyOrg) targets.push({ type:'ashby', org:r.AshbyOrg, company:r.Company, segment: inferSegment(r.Company) });
    }
  }
  const ts = new Date().toISOString().replace(/[-:]/g,'').slice(0,13);
  let outFileUrl;
  if (outArg) {
    const isJson = /\.json$/i.test(outArg);
    const rel = isJson ? outArg : outArg.replace(/\/?$/, '/')+`targets_${ts}.json`;
    outFileUrl = new URL('../' + rel, import.meta.url);
  } else {
    outFileUrl = new URL(`../output/targets_${ts}.json`, import.meta.url);
  }
  const parent = new URL('.', outFileUrl);
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(outFileUrl, JSON.stringify(targets, null, 2), 'utf8');
  const latestUrl = new URL('../output/targets.json', import.meta.url);
  await fs.writeFile(latestUrl, JSON.stringify(targets, null, 2), 'utf8');
  console.log('Wrote', outFileUrl.pathname, 'targets:', targets.length);
  console.log('Updated latest ->', latestUrl.pathname);
}

main().catch(e=>{ console.error(e); process.exit(1); });
