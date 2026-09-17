import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import schemaSql from './schema.sql?raw';
import type { DbHandle } from './types';
import { openWebDb } from './webAdapter';

const DB_NAME = 'kneesense_ner';

let db: DbHandle | null = null;
let readyPromise: Promise<DbHandle> | null = null;

function generatePassphrase(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts the on-device database (SQLCipher, via the plugin) on native
 * platforms — this is patient health data, it shouldn't sit in plaintext
 * on a phone that could be lost or stolen. The passphrase is generated
 * once per install and kept in the plugin's own native secure store
 * (Android Keystore / iOS Keychain-backed, not anything we manage) — it
 * has nothing to do with the app's PIN lock (see PinGate.tsx), so a
 * forgotten/reset PIN can never make this data unrecoverable.
 */
async function ensureEncryptionSecret(sqlite: SQLiteConnection): Promise<void> {
  const alreadyStored = (await sqlite.isSecretStored()).result;
  if (!alreadyStored) {
    await sqlite.setEncryptionSecret(generatePassphrase());
  }
}

async function openNativeDb(): Promise<DbHandle> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await ensureEncryptionSecret(sqlite);

  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn = isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, true, 'secret', 1, false);

  await conn.open();
  await conn.execute(schemaSql);
  return conn;
}

/**
 * schema.sql's CREATE TABLE IF NOT EXISTS only creates tables that don't
 * exist yet — a column added to schema.sql after someone already has a
 * local database (any existing install, not just fresh ones) never
 * retroactively appears there, and every INSERT naming it then fails with
 * "has no column named X". Each entry here is idempotent (checked via
 * PRAGMA table_info before altering), so it's safe to run on every
 * startup, on both backends, indefinitely — this is the only migration
 * mechanism the app has, so new schema.sql columns need an entry added
 * here too, not just the CREATE TABLE.
 */
async function addColumnIfMissing(handle: DbHandle, table: string, column: string, definition: string): Promise<void> {
  const info = await handle.query(`PRAGMA table_info(${table})`);
  const hasColumn = (info.values ?? []).some((row) => row.name === column);
  if (!hasColumn) {
    await handle.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function runMigrations(handle: DbHandle): Promise<void> {
  await addColumnIfMissing(handle, 'exercise_captures', 'data_source', "TEXT NOT NULL DEFAULT 'ble'");
}

async function open(): Promise<DbHandle> {
  // Native (Android/iOS): real platform SQLite via @capacitor-community/sqlite.
  // Web (npm run dev / a plain browser build): sql.js directly — see
  // webAdapter.ts for why this bypasses that plugin's own web implementation.
  const handle = Capacitor.getPlatform() === 'web' ? await openWebDb(schemaSql) : await openNativeDb();
  await runMigrations(handle);
  db = handle;
  return handle;
}

/** Call once at app startup (e.g. in main.tsx) and await before rendering. */
export function initDb(): Promise<DbHandle> {
  if (!readyPromise) readyPromise = open();
  return readyPromise;
}

export function getDb(): DbHandle {
  if (!db) throw new Error('DB not initialized — call initDb() first (see main.tsx)');
  return db;
}
