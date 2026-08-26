import { getDb } from '../client';
import { generateSalt, hashPin } from '../../lib/pinAuth';

export interface AppSettingsRow {
  pin_hash: string | null;
  pin_salt: string | null;
  health_worker_name: string | null;
}

export async function getAppSettings(): Promise<AppSettingsRow | null> {
  const db = getDb();
  const res = await db.query('SELECT pin_hash, pin_salt, health_worker_name FROM app_settings WHERE id = 1 LIMIT 1');
  return (res.values?.[0] as unknown as AppSettingsRow) ?? null;
}

export async function isPinSet(): Promise<boolean> {
  const settings = await getAppSettings();
  return !!settings?.pin_hash;
}

/** Sets or overwrites the PIN — used both for first-time setup and a "forgot PIN" reset. Doesn't touch any patient data. */
export async function setPin(pin: string, healthWorkerName?: string): Promise<void> {
  const db = getDb();
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  await db.run(
    `INSERT INTO app_settings (id, pin_hash, pin_salt, health_worker_name, updated_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt,
       health_worker_name = COALESCE(excluded.health_worker_name, app_settings.health_worker_name),
       updated_at = excluded.updated_at`,
    [hash, salt, healthWorkerName ?? null, new Date().toISOString()],
  );
}

export async function verifyPin(pin: string): Promise<boolean> {
  const settings = await getAppSettings();
  if (!settings?.pin_hash || !settings.pin_salt) return false;
  const candidate = await hashPin(pin, settings.pin_salt);
  return candidate === settings.pin_hash;
}
