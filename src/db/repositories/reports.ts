import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getDb } from '../client';
import { queueForSync } from '../outbox';
import { buildReportPdf, type ReportData } from '../../lib/reportGenerator';
import type { RiskScoreBreakdown } from '../../lib/riskScoring';
import type { Report } from '../../types/models';
import { getPatientById } from './patients';
import { getSession } from './sessions';
import { getQuestionnaireForSession } from './questionnaire';
import { listCapturesForSession } from './exerciseCaptures';
import { getWalkTestForSession } from './walkTest';
import { getCameraFeaturesForCapture } from './cameraFeatures';
import { computeAndSaveRiskScore, getRiskScoreForSession } from './riskScores';

function fileNameFor(patientCode: string, sessionDate: string): string {
  const datePart = sessionDate.slice(0, 10);
  const safeCode = patientCode.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `KneeSense_${safeCode}_${datePart}.pdf`;
}

/** Writes the PDF to disk (native) or triggers a browser download (web dev). Returns where it went, for the reports.file_path record. */
async function persistPdf(doc: ReturnType<typeof buildReportPdf>, fileName: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    doc.save(fileName); // browser download — no persistent filesystem to write to in a plain web build
    return `browser-download:${fileName}`;
  }

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.slice(dataUri.indexOf('base64,') + 'base64,'.length);
  const path = `KneeSenseReports/${fileName}`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Documents, recursive: true });
  return path;
}

/** Gathers everything for a session, builds the PDF, saves it, and records a `reports` row (queued for sync like any other table). */
export async function generateReport(sessionId: string): Promise<{ report: Report; savedTo: string }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  const patient = await getPatientById(session.patient_id);
  if (!patient) throw new Error('Patient not found for session');
  const questionnaire = await getQuestionnaireForSession(sessionId);
  if (!questionnaire) throw new Error('Cannot generate a report before the questionnaire is completed');

  const captures = await listCapturesForSession(sessionId);
  const kneeExtension = captures.find((c) => c.exercise_type === 'knee_extension') ?? null;
  const sitToStand = captures.find((c) => c.exercise_type === 'sit_to_stand') ?? null;
  const walkTest = await getWalkTestForSession(sessionId);
  const cameraFeatures = kneeExtension ? await getCameraFeaturesForCapture(kneeExtension.id) : null;

  const existingRiskRow = await getRiskScoreForSession(sessionId);
  const riskBreakdown: RiskScoreBreakdown = existingRiskRow
    ? {
        symptomScore: existingRiskRow.symptom_score ?? 0,
        romScore: existingRiskRow.rom_score ?? 0,
        movementQualityScore: existingRiskRow.movement_quality_score ?? 0,
        mobilityScore: existingRiskRow.mobility_score ?? 0,
        agreementScore: existingRiskRow.agreement_score ?? 0,
        weightedTotal: existingRiskRow.weighted_total ?? 0,
        riskCategory: existingRiskRow.risk_category ?? 'low',
      }
    : (await computeAndSaveRiskScore(sessionId)).breakdown;

  const reportData: ReportData = {
    patientCode: patient.patient_code,
    ageGroup: patient.age_group,
    location: patient.location,
    sessionDate: session.session_date,
    affectedKnee: session.affected_knee,
    previousInjury: session.previous_injury === 1,

    painScoreAvg: questionnaire.pain_score_avg ?? null,
    morningStiffness: questionnaire.morning_stiffness ?? null,
    swelling: questionnaire.swelling ?? null,
    walkingDifficulty: questionnaire.walking_difficulty ?? null,
    stairClimbingDifficulty: questionnaire.stair_climbing_difficulty ?? null,
    standFromChairDifficulty: questionnaire.stand_from_chair_difficulty ?? null,

    kneeExtension,
    sitToStand,

    walkTest: walkTest
      ? {
          distanceM: walkTest.distance_m ?? 0,
          timeS: walkTest.time_s ?? 0,
          speedMps: walkTest.speed_mps ?? 0,
          cadenceSpm: walkTest.cadence_spm ?? 0,
          pauseCount: walkTest.pause_count ?? 0,
          assistanceNeeded: walkTest.assistance_needed === 1,
        }
      : null,

    cameraAvailable: cameraFeatures !== null,
    cameraRom: cameraFeatures?.camera_rom ?? null,
    cameraConfidence: cameraFeatures?.confidence_avg ?? null,
    imuCameraDiffDeg: cameraFeatures?.imu_camera_diff ?? null,
    cameraAgreementStatus: cameraFeatures?.agreement_status ?? null,

    riskCategory: riskBreakdown.riskCategory,
    riskBreakdown,
  };

  const doc = buildReportPdf(reportData);
  const fileName = fileNameFor(patient.patient_code, session.session_date);
  const savedTo = await persistPdf(doc, fileName);

  const db = getDb();
  const report: Report = {
    id: uuidv4(),
    session_id: sessionId,
    generated_at: new Date().toISOString(),
    file_path: savedTo,
    language: 'en',
    synced: 0,
  };
  await db.run(
    `INSERT INTO reports (id, session_id, generated_at, file_path, language, synced) VALUES (?, ?, ?, ?, ?, 0)`,
    [report.id, report.session_id, report.generated_at, report.file_path, report.language ?? null],
  );
  await queueForSync('reports', report.id, 'insert', report as unknown as Record<string, unknown>);

  return { report, savedTo };
}
