import { openDB } from 'idb';

const DB_NAME = 'jobflow';
// Bump when adding stores/indexes. v4 introduces new stores; v5 adds planning/config.
const DB_VERSION = 6;
const STORE = 'opportunities';

let dbPromise;

export async function ensureDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1..v3 legacy setup
        if (oldVersion < 1) {
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('by_company_role', ['company', 'role']);
          os.createIndex('by_stage', 'stage');
          os.createIndex('by_hash', 'hash', { unique: true });
          os.createIndex('by_stage_pos', ['stage', 'pos']);
        } else {
          const os = db.transaction.objectStore(STORE);
          if (!os.indexNames.contains('by_hash')) os.createIndex('by_hash', 'hash', { unique: true });
          if (!os.indexNames.contains('by_stage_pos')) os.createIndex('by_stage_pos', ['stage', 'pos']);
        }
        if (!db.objectStoreNames.contains('qualification_reviews')) {
          const qr = db.createObjectStore('qualification_reviews', { keyPath: 'id', autoIncrement: true });
          qr.createIndex('by_opportunity', 'opportunityId');
          qr.createIndex('by_ts', 'ts');
        }
        if (!db.objectStoreNames.contains('events')) {
          const ev = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
          ev.createIndex('by_name', 'name');
          ev.createIndex('by_ts', 'ts');
        }
        // v4: additional stores for domain expansion
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('contacts')) {
            const cs = db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
            cs.createIndex('by_company', 'company');
            cs.createIndex('by_name', 'name');
          }
          if (!db.objectStoreNames.contains('companies')) {
            const co = db.createObjectStore('companies', { keyPath: 'id', autoIncrement: true });
            co.createIndex('by_name', 'name');
            co.createIndex('by_sector', 'sector');
          }
          if (!db.objectStoreNames.contains('activities')) {
            const ac = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
            ac.createIndex('by_opportunity', 'opportunityId');
            ac.createIndex('by_ts', 'ts');
          }
          if (!db.objectStoreNames.contains('notes')) {
            const nt = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
            nt.createIndex('by_opportunity', 'opportunityId');
            nt.createIndex('by_ts', 'ts');
          }
        }
        // v5: planning/config stores
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('config')) {
            // generic key/value config store
            db.createObjectStore('config', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('planning')) {
            db.createObjectStore('planning', { keyPath: 'key' }); // use key='planning'
          }
          // opportunity indices for deadlines and quick lookups
          const os = db.transaction.objectStore(STORE);
          if (!os.indexNames.contains('by_deadline')) os.createIndex('by_deadline', 'deadline');
          if (!os.indexNames.contains('by_company')) os.createIndex('by_company', 'company');
        }
      },
    });
  }
  return dbPromise;
}

export async function addSample() {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const samples = [
    { company: 'ACME', role: 'Frontend Engineer', url: 'https://example.com/fe', stage: 'Research', createdAt: now },
    { company: 'Globex', role: 'Backend Engineer', url: 'https://example.com/be', stage: 'Research', createdAt: now },
  ];
  const tx = db.transaction(STORE, 'readwrite');
  for (const s of samples) await tx.store.add(s);
  await tx.done;
}

export async function countAll() {
  const db = await ensureDb();
  return db.count(STORE);
}

export async function clearAll() {
  const db = await ensureDb();
  const tx = db.transaction(STORE, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

function mkHash(o) {
  return `${o.company||''}|${o.role||''}|${o.job_url||o.url||''}`;
}

export async function upsertOpportunity(o) {
  const db = await ensureDb();
  const tx = db.transaction(STORE, 'readwrite');
  const obj = { ...o };
  if (!obj.stage) obj.stage = 'Research';
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();
  if (typeof obj.pos !== 'number') obj.pos = Date.now();
  obj.hash = mkHash(obj);
  try {
    const existingKey = await tx.store.index('by_hash').getKey(obj.hash);
    if (existingKey) {
      obj.id = existingKey;
      await tx.store.put(obj);
    } else {
      await tx.store.add(obj);
    }
  } finally {
    await tx.done;
  }
}

export async function getAll() {
  const db = await ensureDb();
  return db.getAll(STORE);
}

// Qualification reviews
export async function addQualificationReview(opportunityId, rec) {
  const db = await ensureDb();
  const tx = db.transaction('qualification_reviews', 'readwrite');
  const payload = { opportunityId, ts: new Date().toISOString(), ...rec };
  await tx.store.add(payload);
  await tx.done;
}

export async function getQualificationReviews() {
  const db = await ensureDb();
  return db.getAll('qualification_reviews');
}

// Events (local only)
export async function logEvent(name, data) {
  const db = await ensureDb();
  const tx = db.transaction('events', 'readwrite');
  await tx.store.add({ name, ts: new Date().toISOString(), data });
  await tx.done;
}

export async function getEventsByName(name) {
  const db = await ensureDb();
  const idx = db.transaction('events').store.index('by_name');
  return idx.getAll(name);
}

// JSON backup (opt-in)
export async function exportJSON() {
  const db = await ensureDb();
  const [ops, reviews, events, cfg, plan] = await Promise.all([
    db.getAll(STORE),
    db.getAll('qualification_reviews'),
    db.getAll('events'),
    db.getAll('config'),
    db.getAll('planning')
  ]);
  return { opportunities: ops, qualification_reviews: reviews, events, config: cfg, planning: plan };
}

// Planning config
const DEFAULT_PLANNING = {
  key: 'planning',
  targetDate: '', // YYYY-MM-DD
  targetInterviews: 5,
  callbacks: { cold: 8, warm: 40, strong: 60 },
  weeklyProgress: { cold: 0, warm: 0 },
  weeklyHistory: [], // stack of { type:'cold'|'warm', delta:+/-1, ts }
  lastRolloverIso: ''
};

export async function getPlanningConfig() {
  const db = await ensureDb();
  const v = await db.get('planning', 'planning');
  return v || { ...DEFAULT_PLANNING };
}

export async function setPlanningConfig(partial) {
  const db = await ensureDb();
  const cur = await getPlanningConfig();
  const next = { ...cur, ...partial, key: 'planning' };
  await db.put('planning', next);
  return next;
}

export async function rolloverWeeklyIfNeeded(now = new Date()) {
  const cfg = await getPlanningConfig();
  const last = cfg.lastRolloverIso ? new Date(cfg.lastRolloverIso) : null;
  const startOfWeek = (d)=>{ const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; };
  const curWeek = startOfWeek(now).toISOString();
  const lastWeek = last ? startOfWeek(last).toISOString() : '';
  if (curWeek !== lastWeek) {
    cfg.weeklyProgress = { cold: 0, warm: 0 };
    cfg.lastRolloverIso = now.toISOString();
    await setPlanningConfig(cfg);
  }
  return cfg;
}

// Flags storage (optional helper)
export async function setFlag(key, value) {
  const db = await ensureDb();
  await db.put('config', { key, value });
}
export async function getFlag(key) {
  const db = await ensureDb();
  const v = await db.get('config', key);
  return v?.value;
}

// Opportunity helpers
export async function getById(id) {
  const db = await ensureDb();
  return db.get(STORE, id);
}

export async function updateOpportunity(id, patch) {
  const db = await ensureDb();
  const tx = db.transaction(STORE, 'readwrite');
  const cur = await tx.store.get(id);
  if (!cur) {
    await tx.done;
    throw new Error('not_found');
  }
  const next = { ...cur, ...patch };
  next.hash = mkHash(next);
  await tx.store.put(next);
  await tx.done;
  return next;
}

export async function deleteOpportunity(id) {
  const db = await ensureDb();
  const tx = db.transaction(STORE, 'readwrite');
  await tx.store.delete(id);
  await tx.done;
}
