// Scoring & honesty engine (pure functions)

export function computeCultureDims(text=''){
  const t = (text||'').toLowerCase();
  const comm = /formal|process|compliance/.test(t) ? 4 : /informal|open|transparent/.test(t) ? 7 : 6;
  const pace = /fast-paced|hyper|agile|scrappy|move fast/.test(t) ? 8 : /calm|thoughtful/.test(t) ? 5 : 7;
  const feedback = /direct|blunt|radical candor/.test(t) ? 7 : /kind|supportive|nurturing/.test(t) ? 6 : 6;
  const collab = /cross-functional|collaborative|partner/.test(t) ? 7 : /independent|autonomous/.test(t) ? 5 : 6;
  return { comm, pace, feedback, collab };
}

export function compatibilityScore(user, companyDims){
  const u = user?.work_style || { comm:6, pace:6, feedback:6, collab:6 };
  const c = companyDims || { comm:6, pace:6, feedback:6, collab:6 };
  const dims = ['comm','pace','feedback','collab'];
  let sum = 0;
  dims.forEach(k => { const d = 10 - Math.abs((u[k]||6) - (c[k]||6)); sum += d; });
  return Math.round((sum / (dims.length*10)) * 100);
}

export function fuzzySkillMatch(title='', notes='', skills=[]) {
  const t = (title+' '+notes).toLowerCase();
  let hits = 0; skills.forEach(s=>{ if (t.includes(String(s).toLowerCase())) hits++; });
  const cov = skills.length? hits / skills.length : 0.5;
  return Math.round(100 * Math.min(1, 0.6 + cov*0.4));
}

export function computeEnergy(compat=70){
  // Map compatibility to 1-10 energy scale (simple proxy)
  const e = Math.round((compat/100)*10);
  return Math.max(1, Math.min(10, e));
}

export function computeScores(op, profile){
  const text = [op.role||'', op.notes||''].join(' ');
  const cultureDims = computeCultureDims(text);
  const base = fuzzySkillMatch(op.role||'', text, profile?.skills||[]); // 35%
  const culture = compatibilityScore(profile, cultureDims); // 25%
  const timing = 65 + (op?.notes||'').toLowerCase().includes('series') ? 5 : 0; // 20% mock
  const alumni = 60; // mock 15%
  const workstyle = cultureDims.pace >= 7 ? 70 : 60; // mock 5%
  const total = Math.round(base*0.35 + culture*0.25 + timing*0.20 + alumni*0.15 + workstyle*0.05);
  const energy = computeEnergy(culture);
  return { base, culture, timing, alumni, workstyle, total, energy, cultureDims };
}

export function honestyLabel(scores, barriers=[]) {
  if (barriers && barriers.length) return { label:'Brutal Reality', why: ['Structural barriers', ...barriers] };
  if (scores.total >= 80) return { label:'Realistic Shot', why:['Strong fit score', `Energy ${scores.energy}/10`] };
  if (scores.total >= 65) return { label:'Long Shot', why:['Moderate fit', 'May need referral'] };
  return { label:'Brutal Reality', why:['Low fit'] };
}

export function detectBarriers(op){
  const title = (op.role||'').toLowerCase();
  const text = (op.notes||'').toLowerCase();
  const hard = [];
  if (/engineer|developer|tpm|devrel/.test(title)) hard.push('Deep engineering prereq');
  if (/finra|sec|clinical|md|rn/.test(text)) hard.push('Regulated credential');
  if (/talent bench|pool|general application/.test(text)) hard.push('Talent bench');
  if (op.posted_at && new Date(op.posted_at).toString() !== 'Invalid Date') {
    const age = Date.now() - new Date(op.posted_at).getTime();
    if (age > 90*24*3600*1000) hard.push('Stale >90d');
  }
  return hard;
}

