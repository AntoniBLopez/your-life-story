/**
 * Keeps in-progress recordings in IndexedDB, chunk by chunk, so a long recording survives
 * a closed tab, a crash or a failed upload. A backup is deleted only once the audio is
 * safely stored on the server (or the user discards it).
 */

const DB_NAME = "yls-recordings";
const DB_VERSION = 1;
const RECORDINGS = "recordings";
const CHUNKS = "chunks";

export type RecordingBackup = {
  id: string;
  /** Experience id, or "new" for an unsaved experience. */
  scope: string;
  fieldKey: string;
  mimeType: string;
  startedAt: number;
  updatedAt: number;
  bytes: number;
  chunks: number;
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDINGS)) db.createObjectStore(RECORDINGS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CHUNKS)) db.createObjectStore(CHUNKS, { keyPath: ["id", "seq"] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function done(transaction: IDBTransaction) {
  return new Promise<boolean>((resolve) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}

function result<T>(request: IDBRequest<T>) {
  return new Promise<T | undefined>((resolve) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
}

export async function startRecordingBackup(meta: { scope: string; fieldKey: string; mimeType: string }) {
  try {
    const db = await openDb();
    if (!db) return null;
    const now = Date.now();
    const backup: RecordingBackup = { id: `${now}-${Math.random().toString(36).slice(2, 10)}`, ...meta, startedAt: now, updatedAt: now, bytes: 0, chunks: 0 };
    const transaction = db.transaction(RECORDINGS, "readwrite");
    transaction.objectStore(RECORDINGS).put(backup);
    return (await done(transaction)) ? backup.id : null;
  } catch {
    return null;
  }
}

export async function appendRecordingChunk(id: string, seq: number, blob: Blob) {
  try {
    const db = await openDb();
    if (!db) return false;
    const transaction = db.transaction([RECORDINGS, CHUNKS], "readwrite");
    transaction.objectStore(CHUNKS).put({ id, seq, blob });
    const recordings = transaction.objectStore(RECORDINGS);
    const current = await result(recordings.get(id) as IDBRequest<RecordingBackup | undefined>);
    if (current) recordings.put({ ...current, updatedAt: Date.now(), bytes: current.bytes + blob.size, chunks: Math.max(current.chunks, seq + 1) });
    return await done(transaction);
  } catch {
    return false;
  }
}

export async function listRecordingBackups(scope?: string) {
  try {
    const db = await openDb();
    if (!db) return [];
    const all = await result(db.transaction(RECORDINGS).objectStore(RECORDINGS).getAll() as IDBRequest<RecordingBackup[]>);
    return (all ?? []).filter((item) => item.bytes > 0 && (scope === undefined || item.scope === scope)).sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function loadRecordingBlob(id: string) {
  try {
    const db = await openDb();
    if (!db) return null;
    const transaction = db.transaction([RECORDINGS, CHUNKS]);
    const meta = await result(transaction.objectStore(RECORDINGS).get(id) as IDBRequest<RecordingBackup | undefined>);
    const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
    const chunks = await result(transaction.objectStore(CHUNKS).getAll(range) as IDBRequest<{ seq: number; blob: Blob }[]>);
    if (!meta || !chunks?.length) return null;
    chunks.sort((a, b) => a.seq - b.seq);
    return new Blob(chunks.map((chunk) => chunk.blob), { type: meta.mimeType });
  } catch {
    return null;
  }
}

export async function deleteRecordingBackup(id: string | null | undefined) {
  if (!id) return;
  try {
    const db = await openDb();
    if (!db) return;
    const transaction = db.transaction([RECORDINGS, CHUNKS], "readwrite");
    transaction.objectStore(RECORDINGS).delete(id);
    transaction.objectStore(CHUNKS).delete(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
    await done(transaction);
  } catch {
    // Best effort: a leftover backup is offered for recovery and can be discarded.
  }
}
