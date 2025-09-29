import { openDB } from 'idb';

const DB_NAME = 'jobflow';
const DB_VERSION = 2;
const STORE = 'opportunities';

let dbPromise;

export async function ensureDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('by_company_role', ['company', 'role']);
          os.createIndex('by_stage', 'stage');
          os.createIndex('by_hash', 'hash', { unique: true });
        } else {
          const os = db.transaction.objectStore(STORE);
          if (!os.indexNames.contains('by_hash')) os.createIndex('by_hash', 'hash', { unique: true });
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
