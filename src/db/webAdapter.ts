import initSqlJs, { type Database } from 'sql.js';
// Vite-resolved asset URL (hashed + copied on build, served correctly in
// dev) — more reliable than a static /assets/... path guess, which sql.js's
// own locateFile resolution doesn't always honor consistently under Vite.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { DbHandle, QueryResult } from './types';

// Browser-only dev fallback: talks to sql.js directly instead of going
// through @capacitor-community/sqlite's jeep-sqlite web implementation,
// which hangs unrecoverably in some sandboxed/embedded browsers with no
// thrown error (see README "Known caveat"). Native builds never use this —
// they talk to real platform SQLite via @capacitor-community/sqlite.
//
// Data here is in-memory only (persisted to IndexedDB best-effort on write)
// since this path exists purely for UI development in a browser, not as a
// durable store — the native app is the durable target.

const IDB_KEY = 'kneesense_ner_web_db';

async function loadPersisted(): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    const req = indexedDB.open('kneesense_ner_web', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('db');
    req.onerror = () => resolve(undefined);
    req.onsuccess = () => {
      const tx = req.result.transaction('db', 'readonly');
      const get = tx.objectStore('db').get(IDB_KEY);
      get.onsuccess = () => resolve(get.result as Uint8Array | undefined);
      get.onerror = () => resolve(undefined);
    };
  });
}

function persist(bytes: Uint8Array): void {
  const req = indexedDB.open('kneesense_ner_web', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('db');
  req.onsuccess = () => {
    const tx = req.result.transaction('db', 'readwrite');
    tx.objectStore('db').put(bytes, IDB_KEY);
  };
}

class WebDbHandle implements DbHandle {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private save(): void {
    persist(this.db.export());
  }

  async execute(statements: string): Promise<void> {
    this.db.run(statements);
    this.save();
  }

  async run(statement: string, values: unknown[] = []): Promise<void> {
    this.db.run(statement, values as never[]);
    this.save();
  }

  async query(statement: string, values: unknown[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(statement);
    stmt.bind(values as never[]);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return { values: rows };
  }
}

export async function openWebDb(schemaSql: string): Promise<DbHandle> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const existing = await loadPersisted();
  const db = existing ? new SQL.Database(existing) : new SQL.Database();
  db.run(schemaSql);
  return new WebDbHandle(db);
}
