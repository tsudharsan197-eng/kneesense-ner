import { v4 as uuidv4 } from 'uuid';
import { getDb } from './client';

/**
 * Queue a row for sync. Call this in the SAME transaction/right after any
 * insert/update to a syncable table. The sync worker (src/lib/sync.ts)
 * drains this table when connectivity returns — writes themselves never
 * wait on the network.
 */
export async function queueForSync(
  tableName: string,
  recordId: string,
  operation: 'insert' | 'update',
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  await db.run(
    `INSERT INTO sync_outbox (id, table_name, record_id, operation, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [uuidv4(), tableName, recordId, operation, JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function pendingOutboxCount(): Promise<number> {
  const db = getDb();
  const res = await db.query('SELECT COUNT(*) as n FROM sync_outbox');
  return (res.values?.[0]?.n as number) ?? 0;
}
