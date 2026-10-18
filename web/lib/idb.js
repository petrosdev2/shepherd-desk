'use client';
/**
 * Tiny IndexedDB wrapper — no dependency, no build step.
 *
 * Two stores:
 *   docs   key "col:id"  -> { col, id, body }   the church's records, kept locally
 *   outbox autoIncrement -> { op, col, id, body, at }   writes waiting for the network
 *
 * The database name carries the church id, so two churches on one shared
 * phone never see each other's records.
 */
const VERSION = 1;

export function openDb(churchId) {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open('shepherd-desk-' + churchId, VERSION); }
    catch (e) { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs');
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);   // private mode, blocked storage, full disk
    req.onblocked = () => resolve(null);
  });
}

const run = (db, store, mode, fn) => new Promise(resolve => {
  if (!db) return resolve(null);
  let tx;
  try { tx = db.transaction(store, mode); } catch (e) { return resolve(null); }
  const os = tx.objectStore(store);
  let out = null;
  try { out = fn(os); } catch (e) { /* ignore */ }
  tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
  tx.onerror = () => resolve(null);
  tx.onabort = () => resolve(null);
});

export const docsAll = db => run(db, 'docs', 'readonly', os => os.getAll());
export const docPut = (db, col, id, body) => run(db, 'docs', 'readwrite', os => os.put({ col, id, body }, col + ':' + id));
export const docDel = (db, col, id) => run(db, 'docs', 'readwrite', os => os.delete(col + ':' + id));
export const docsReplace = (db, rows) => run(db, 'docs', 'readwrite', os => {
  os.clear();
  rows.forEach(r => os.put(r, r.col + ':' + r.id));
});

export const outboxAll = db => new Promise(resolve => {
  if (!db) return resolve([]);
  let tx;
  try { tx = db.transaction('outbox', 'readonly'); } catch (e) { return resolve([]); }
  const os = tx.objectStore('outbox');
  const keys = os.getAllKeys(), vals = os.getAll();
  tx.oncomplete = () => resolve((keys.result || []).map((k, i) => ({ key: k, ...(vals.result || [])[i] })));
  tx.onerror = () => resolve([]);
  tx.onabort = () => resolve([]);
});
export const outboxAdd = (db, entry) => run(db, 'outbox', 'readwrite', os => os.add(entry));
export const outboxDel = (db, key) => run(db, 'outbox', 'readwrite', os => os.delete(key));
export const outboxCount = db => run(db, 'outbox', 'readonly', os => os.count());
