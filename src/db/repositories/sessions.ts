import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { queueForSync } from '../outbox';
import type { AffectedKnee, ScreeningSession } from '../../types/models';

export interface NewSessionInput {
  patientId: string;
  affectedKnee: AffectedKnee;
  previousInjury: boolean;
  deviceId?: string;
}

export async function createSession(input: NewSessionInput): Promise<ScreeningSession> {
  const db = getDb();
  const now = new Date().toISOString();
  const session: ScreeningSession = {
    id: uuidv4(),
    patient_id: input.patientId,
    session_date: now,
    affected_knee: input.affectedKnee,
    previous_injury: input.previousInjury ? 1 : 0,
    device_id: input.deviceId,
    status: 'draft',
    created_at: now,
    updated_at: now,
    synced: 0,
  };

  await db.run(
    `INSERT INTO screening_sessions (id, patient_id, session_date, affected_knee, previous_injury, device_id, status, created_at, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      session.id,
      session.patient_id,
      session.session_date,
      session.affected_knee,
      session.previous_injury,
      session.device_id ?? null,
      session.status,
      session.created_at,
      session.updated_at,
    ],
  );

  await queueForSync('screening_sessions', session.id, 'insert', session as unknown as Record<string, unknown>);
  return session;
}

export async function getSession(sessionId: string): Promise<ScreeningSession | null> {
  const db = getDb();
  const res = await db.query('SELECT * FROM screening_sessions WHERE id = ? LIMIT 1', [sessionId]);
  return (res.values?.[0] as unknown as ScreeningSession) ?? null;
}

export async function listSessionsForPatient(patientId: string): Promise<ScreeningSession[]> {
  const db = getDb();
  const res = await db.query('SELECT * FROM screening_sessions WHERE patient_id = ? ORDER BY created_at DESC', [
    patientId,
  ]);
  return (res.values ?? []) as unknown as ScreeningSession[];
}
