import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { queueForSync } from '../outbox';
import { getCurrentUser } from '../../lib/supabaseAuth';
import type { AgeGroup, Patient, Sex } from '../../types/models';

export interface NewPatientInput {
  patientCode: string;
  ageGroup: AgeGroup;
  sex?: Sex;
  occupation?: string;
  location?: string;
  createdBy?: string;
}

/**
 * Writes to local SQLite first, then queues an outbox row. Never blocks on
 * the network — getCurrentUser() is a local read of the cached Supabase
 * session (see supabaseAuth.ts), not a network call, so this works
 * identically whether the health worker is online, offline, or never
 * signed in at all (created_by just stays null in that last case).
 */
export async function createPatient(input: NewPatientInput): Promise<Patient> {
  const db = getDb();
  const now = new Date().toISOString();
  const currentUser = await getCurrentUser();
  const patient: Patient = {
    id: uuidv4(),
    patient_code: input.patientCode,
    age_group: input.ageGroup,
    sex: input.sex,
    occupation: input.occupation,
    location: input.location,
    created_at: now,
    created_by: input.createdBy ?? currentUser?.id,
    updated_at: now,
    synced: 0,
  };

  await db.run(
    `INSERT INTO patients (id, patient_code, age_group, sex, occupation, location, created_at, created_by, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      patient.id,
      patient.patient_code,
      patient.age_group,
      patient.sex ?? null,
      patient.occupation ?? null,
      patient.location ?? null,
      patient.created_at,
      patient.created_by ?? null,
      patient.updated_at,
    ],
  );

  await queueForSync('patients', patient.id, 'insert', patient as unknown as Record<string, unknown>);
  return patient;
}

export async function listPatients(): Promise<Patient[]> {
  const db = getDb();
  const res = await db.query('SELECT * FROM patients ORDER BY created_at DESC');
  return (res.values ?? []) as unknown as Patient[];
}

export async function getPatientByCode(patientCode: string): Promise<Patient | null> {
  const db = getDb();
  const res = await db.query('SELECT * FROM patients WHERE patient_code = ? LIMIT 1', [patientCode]);
  return (res.values?.[0] as unknown as Patient) ?? null;
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const db = getDb();
  const res = await db.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [patientId]);
  return (res.values?.[0] as unknown as Patient) ?? null;
}
