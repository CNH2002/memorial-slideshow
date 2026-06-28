// IndexedDB persistence for the memorial slideshow.
// Strictly local — no network. Falls back silently if IDB is unavailable
// (private browsing, storage full, old browser) so the app always works in-memory.

const DB_NAME   = 'memorial-slideshow';
const DB_VER    = 1;
const STORE     = 'files';
const ORDER_KEY = '_order'; // meta-record that stores the sorted ID sequence

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

// Issue all store operations synchronously within one transaction — avoids
// IDB's auto-commit, which fires whenever a transaction has no outstanding requests.
function batchWrite(db, ops) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const op of ops) {
      if (op.type === 'put')    store.put(op.record);
      if (op.type === 'delete') store.delete(op.id);
    }
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Load the persisted file set on startup. Returns [] on any error or empty store. */
export async function dbLoad() {
  try {
    const db  = await openDB();
    const all = await new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    if (!all.length) return [];

    const orderRec = all.find(r  => r.id === ORDER_KEY);
    const fileRecs = all.filter(r => r.id !== ORDER_KEY);
    if (!fileRecs.length) return [];

    const idToRec = new Map(fileRecs.map(r => [r.id, r]));
    const ordered = orderRec
      ? orderRec.ids.map(id => idToRec.get(id)).filter(Boolean)
      : fileRecs;

    return ordered.map(r => ({
      id:          r.id,
      name:        r.name,
      type:        r.type,
      blob:        r.blob,
      url:         URL.createObjectURL(r.blob),
      rotation:    r.rotation ?? 0,
      contentHash: r.contentHash,
    }));
  } catch (err) {
    console.warn('[db] load failed:', err);
    return [];
  }
}

/** Persist newly-added files and write the current order record. */
export async function dbAdd(files, orderIds) {
  if (!files.length) return;
  try {
    const db = await openDB();
    await batchWrite(db, [
      ...files.map(f => ({ type: 'put', record: {
        id: f.id, name: f.name, type: f.type,
        blob: f.blob, rotation: f.rotation ?? 0,
        contentHash: f.contentHash,
      }})),
      { type: 'put', record: { id: ORDER_KEY, ids: orderIds } },
    ]);
  } catch (err) {
    console.warn('[db] add failed:', err);
  }
}

/** Update a single file's blob and/or rotation (after rotate). */
export async function dbUpdate(file) {
  try {
    const db = await openDB();
    await batchWrite(db, [{ type: 'put', record: {
      id: file.id, name: file.name, type: file.type,
      blob: file.blob, rotation: file.rotation ?? 0,
      contentHash: file.contentHash,
    }}]);
  } catch (err) {
    console.warn('[db] update failed:', err);
  }
}

/** Remove one or more files and update the order record atomically.
 *  ids may be a single string or an array of strings. */
export async function dbRemove(ids, remainingIds) {
  const idArr = Array.isArray(ids) ? ids : [ids];
  if (!idArr.length) return;
  try {
    const db = await openDB();
    await batchWrite(db, [
      ...idArr.map(id => ({ type: 'delete', id })),
      { type: 'put', record: { id: ORDER_KEY, ids: remainingIds } },
    ]);
  } catch (err) {
    console.warn('[db] remove failed:', err);
  }
}

/** Rewrite only the sort-order record (after drag-reorder). */
export async function dbSaveOrder(ids) {
  try {
    const db = await openDB();
    await batchWrite(db, [{ type: 'put', record: { id: ORDER_KEY, ids } }]);
  } catch (err) {
    console.warn('[db] saveOrder failed:', err);
  }
}

/** Wipe the entire store (Clear all / Start over). */
export async function dbClear() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[db] clear failed:', err);
  }
}
