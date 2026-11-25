// SIMULATION LOCALE : aucun serveur. Données simples -> localStorage ; images -> IndexedDB.
// Les données restent dans CE navigateur (non partagées entre visiteurs ou appareils).
const PREFIX = 'pixelplay-sim-';
export const DB_KEY = `${PREFIX}db`;
export const SESSION_KEY = `${PREFIX}session`;

const memory = () => { const m = new Map(); return { __memory: true, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
let adapter = null;
// localStorage si utilisable (navigation privée, stockage bloqué : repli mémoire, données perdues à l'actualisation).
export function storage() {
  if (adapter) return adapter;
  try { const t = `${PREFIX}t`; globalThis.localStorage.setItem(t, '1'); globalThis.localStorage.removeItem(t); adapter = globalThis.localStorage; } catch { adapter = memory(); }
  return adapter;
}
export const setStorage = (a) => { adapter = a || null; }; // tests : injecter un stockage en mémoire
export const isPersistent = () => !storage().__memory;

// --- notifications de changement (même onglet + autres onglets) -------------------------------
const listeners = new Set();
let bound = false;
export function emit(external = false) { for (const f of [...listeners]) { try { f({ external }); } catch { /* un écouteur ne doit pas bloquer les autres */ } } }
export function subscribe(f) {
  listeners.add(f);
  if (!bound && typeof window !== 'undefined' && window.addEventListener) {
    bound = true;
    window.addEventListener('storage', (e) => { if (!e.key || e.key === DB_KEY) emit(true); });
  }
  return () => listeners.delete(f);
}

// --- images : IndexedDB (repli mémoire si indisponible) ----------------------------------------
const IDB = 'pixelplay-sim', ST = 'blobs';
let opening = null;
const memBlobs = new Map(), urls = new Map();
function open() {
  if (opening) return opening;
  opening = new Promise((res) => {
    try {
      if (typeof indexedDB === 'undefined') return res(null);
      const r = indexedDB.open(IDB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch { res(null); }
    return undefined;
  });
  return opening;
}
const run = (db, mode, fn) => new Promise((res, rej) => {
  const t = db.transaction(ST, mode); const rq = fn(t.objectStore(ST));
  t.oncomplete = () => res(rq ? rq.result : undefined); t.onerror = () => rej(t.error || new Error('IndexedDB')); t.onabort = () => rej(t.error || new Error('IndexedDB'));
});
export async function putBlob(id, blob) { const db = await open(); if (!db) memBlobs.set(id, blob); else await run(db, 'readwrite', (s) => s.put(blob, id)); }
export async function getBlob(id) { const db = await open(); return db ? (await run(db, 'readonly', (s) => s.get(id))) || null : memBlobs.get(id) || null; }
function revoke(id) { const u = urls.get(id); if (u) { URL.revokeObjectURL(u); urls.delete(id); } }
export async function delBlob(id) { revoke(id); const db = await open(); if (!db) memBlobs.delete(id); else await run(db, 'readwrite', (s) => s.delete(id)); }
export async function clearBlobs() { [...urls.keys()].forEach(revoke); const db = await open(); if (!db) memBlobs.clear(); else await run(db, 'readwrite', (s) => s.clear()); }
// Charge les images demandées (adresses blob: temporaires) puis `urlOf(id)` répond de façon synchrone.
export async function loadUrls(ids) {
  await Promise.all([...new Set(ids)].filter((i) => !urls.has(i)).map(async (i) => { try { const b = await getBlob(i); if (b) urls.set(i, URL.createObjectURL(b)); } catch { /* image illisible : ignorée */ } }));
}
export const urlOf = (id) => urls.get(id) || null;
