import { Network } from '@capacitor/network';
import { getDb } from '../db/client';
import { supabase } from './supabase';
import type { SyncOutboxRow } from '../types/models';

let draining = false;

/** Pushes queued outbox rows to Supabase, oldest first. Safe to call repeatedly. */
export async function drainOutbox(): Promise<{ pushed: number; failed: number }> {
  if (draining || !supabase) return { pushed: 0, failed: 0 };
  draining = true;
  let pushed = 0;
  let failed = 0;

  try {
    const db = getDb();
    const res = await db.query('SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 50');
    const rows = (res.values ?? []) as unknown as SyncOutboxRow[];

    for (const row of rows) {
      try {
        const payload = JSON.parse(row.payload);
        const { error } = await supabase.from(row.table_name).upsert(payload, { onConflict: 'id' });
        if (error) throw error;

        await db.run('DELETE FROM sync_outbox WHERE id = ?', [row.id]);
        await db.run(`UPDATE ${row.table_name} SET synced = 1, synced_at = ? WHERE id = ?`, [
          new Date().toISOString(),
          row.record_id,
        ]);
        pushed++;
      } catch (err) {
        failed++;
        await db.run('UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', [
          String(err),
          row.id,
        ]);
      }
    }
  } finally {
    draining = false;
  }

  return { pushed, failed };
}

/** Call once at startup: drains immediately, then re-drains whenever the device comes online. */
export function startSyncWatcher(): () => void {
  drainOutbox();
  const listener = Network.addListener('networkStatusChange', (status) => {
    if (status.connected) drainOutbox();
  });
  return () => {
    listener.then((l) => l.remove());
  };
}
