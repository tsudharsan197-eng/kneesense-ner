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

async function open(): Promise<DbHandle> {
  // Native (Android/iOS): real platform SQLite via @capacitor-community/sqlite.
  // Web (npm run dev / a plain browser build): sql.js directly — see
  // webAdapter.ts for why this bypasses that plugin's own web implementation.
  const handle = Capacitor.getPlatform() === 'web' ? await openWebDb(schemaSql) : await openNativeDb();
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
