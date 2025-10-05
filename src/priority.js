export function normalizeFactor(value) {
  if (value == null) return 50; // neutral default
  const n = Number(value);
  if (Number.isNaN(n)) return 50;
  if (n <= 5) {
    // Scale 1..5 to 0..100 (1->0, 5->100)
    return Math.max(0, Math.min(100, ((n - 1) / 4) * 100));
  }
  return Math.max(0, Math.min(100, n));
}

export function computePriority(op) {
  // Try 5-factor model first; else fall back to legacy weights
  const has5 = ['fit_score','confidence','financial_health','growth_signals','referral_warmth'].some(k=>op[k]!=null);
  if (has5) {
    const weights = { fit_score: 0.28, confidence: 0.20, financial_health: 0.18, growth_signals: 0.18, referral_warmth: 0.16 };
    let score = 0;
    for (const [k,w] of Object.entries(weights)) {
      score += normalizeFactor(op[k]) * w;
    }
    return Math.round(score);
  }
  // Legacy model (role/sector/remote/health/referral/stage)
  const W = { role:25, sector:25, remote:15, health:15, referral:10, stage:10 };
  const prefs = (window.JobFlowConfig?.scoring?.preferences)||{};
  const sectors = prefs.sectors || [];
  const sector = (op.sector||'').toLowerCase();
  const roleMatch = (op.role||'').toLowerCase().includes('product') ? 1 : 0.6;
  const sectorFit = sector && sectors.length ? (sectors.some(s=>sector.includes(s))?1:0.6) : 0.7;
  const remote = ((op.location||'').toLowerCase().includes('remote')||(op.remote_policy||'').toLowerCase().includes('remote')) ? 1 : 0.6;
  const health = 0.7;
  const referral = 0.5;
  const stage = 0.6;
  const total = (roleMatch*W.role + sectorFit*W.sector + remote*W.remote + health*W.health + referral*W.referral + stage*W.stage);
  return Math.round(total);
}

export function priorityBand(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}
