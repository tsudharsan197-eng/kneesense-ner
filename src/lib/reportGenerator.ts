import { jsPDF } from 'jspdf';
import type { RiskScoreBreakdown } from './riskScoring';
import type { AffectedKnee, ExerciseCapture, RiskCategory } from '../types/models';

export interface ReportData {
  patientCode: string;
  ageGroup: string;
  location?: string;
  sessionDate: string;
  affectedKnee: AffectedKnee;
  previousInjury: boolean;

  painScoreAvg: number | null;
  morningStiffness: number | null;
  swelling: number | null;
  walkingDifficulty: number | null;
  stairClimbingDifficulty: number | null;
  standFromChairDifficulty: number | null;

  kneeExtension: ExerciseCapture | null;
  sitToStand: ExerciseCapture | null;

  walkTest: {
    distanceM: number;
    timeS: number;
    speedMps: number;
    cadenceSpm: number;
    pauseCount: number;
    assistanceNeeded: boolean;
  } | null;

  cameraAvailable: boolean;
  cameraRom?: number | null;
  cameraConfidence?: number | null;
  imuCameraDiffDeg?: number | null;
  cameraAgreementStatus?: string | null;

  riskCategory: RiskCategory;
  riskBreakdown: RiskScoreBreakdown;
}

const CATEGORY_HEADING: Record<RiskCategory, string> = {
  low: 'Low OA-risk markers',
  moderate: 'Moderate OA-risk markers detected',
  high: 'High OA-risk markers detected',
};

const CATEGORY_RECOMMENDATION: Record<RiskCategory, string> = {
  low: 'No urgent concerns identified. Advise routine monitoring and preventive knee care.',
  moderate: 'Some risk markers present. Provide preventive guidance and recommend follow-up if symptoms persist or worsen.',
  high: 'Multiple risk markers present. Further clinical evaluation recommended.',
};

const DIFFICULTY_LABELS = ['None', 'Mild', 'Moderate', 'Severe'];

/** Builds the offline screening report as a jsPDF document. Caller decides how to persist it (see reports.ts). */
export function buildReportPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 56;

  const line = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 11);
    doc.text(text, marginX, y);
    y += opts.gap ?? (opts.size ? opts.size * 1.4 : 16);
  };

  const rule = () => {
    doc.setDrawColor(200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;
  };

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(label, marginX, y);
    doc.text(value, marginX + 220, y);
    y += 16;
  };

  const sectionHeading = (text: string) => {
    y += 6;
    line(text, { bold: true, size: 13, gap: 20 });
  };

  line('KneeSense NER — Screening Report', { bold: true, size: 16, gap: 24 });
  row('Patient ID', data.patientCode);
  row('Date', new Date(data.sessionDate).toLocaleString());
  row('Age group', data.ageGroup);
  if (data.location) row('Location', data.location);
  row('Knee tested', data.affectedKnee);
  row('Previous injury', data.previousInjury ? 'Yes' : 'No');
  rule();

  sectionHeading('Symptoms');
  row('Average pain score (0-10)', data.painScoreAvg?.toFixed(1) ?? 'Not recorded');
  row('Morning stiffness', data.morningStiffness !== null ? DIFFICULTY_LABELS[data.morningStiffness] : 'Not recorded');
  row('Swelling', data.swelling !== null ? DIFFICULTY_LABELS[data.swelling] : 'Not recorded');
  row('Walking difficulty', data.walkingDifficulty !== null ? DIFFICULTY_LABELS[data.walkingDifficulty] : 'Not recorded');
  row('Stair-climbing difficulty', data.stairClimbingDifficulty !== null ? DIFFICULTY_LABELS[data.stairClimbingDifficulty] : 'Not recorded');
  row('Standing from chair difficulty', data.standFromChairDifficulty !== null ? DIFFICULTY_LABELS[data.standFromChairDifficulty] : 'Not recorded');
  rule();

  sectionHeading('Seated knee extension');
  if (data.kneeExtension) {
    row('Minimum angle', `${data.kneeExtension.min_angle_deg}°`);
    row('Maximum angle', `${data.kneeExtension.max_angle_deg}°`);
    row('Range of motion', `${data.kneeExtension.rom_deg}°`);
    row('Movement smoothness (lower = smoother)', `${data.kneeExtension.smoothness}`);
    row('Repetitions counted', `${data.kneeExtension.rep_count}`);
  } else {
    row('Status', 'Not performed');
  }
  rule();

  sectionHeading('Sit-to-stand');
  if (data.sitToStand) {
    row('Minimum angle', `${data.sitToStand.min_angle_deg}°`);
    row('Maximum angle', `${data.sitToStand.max_angle_deg}°`);
    row('Range of motion', `${data.sitToStand.rom_deg}°`);
    row('Movement smoothness (lower = smoother)', `${data.sitToStand.smoothness}`);
    row('Repetitions counted', `${data.sitToStand.rep_count}`);
  } else {
    row('Status', 'Not performed / skipped for safety');
  }
  rule();

  sectionHeading('Walking test');
  if (data.walkTest) {
    row('Distance', `${data.walkTest.distanceM} m`);
    row('Time', `${data.walkTest.timeS} s`);
    row('Speed', `${data.walkTest.speedMps} m/s`);
    row('Cadence', `${data.walkTest.cadenceSpm} steps/min`);
    row('Pauses', `${data.walkTest.pauseCount}`);
    row('Assistance needed', data.walkTest.assistanceNeeded ? 'Yes' : 'No');
  } else {
    row('Status', 'Not performed');
  }
  rule();

  sectionHeading('Camera cross-check');
  if (data.cameraAvailable) {
    row('Camera range of motion', `${data.cameraRom}°`);
    row('Camera confidence', `${data.cameraConfidence}`);
    row('IMU-camera difference', `${data.imuCameraDiffDeg}°`);
    row('Agreement', `${data.cameraAgreementStatus}`);
  } else {
    row('Status', 'Not performed (IMU-only screening)');
  }
  rule();

  sectionHeading('Screening result');
  line(CATEGORY_HEADING[data.riskCategory], { bold: true, size: 13, gap: 18 });
  const recLines = doc.splitTextToSize(CATEGORY_RECOMMENDATION[data.riskCategory], pageWidth - marginX * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(recLines, marginX, y);
  y += recLines.length * 14 + 8;

  row('Symptoms component (30%)', `${Math.round(data.riskBreakdown.symptomScore * 100)}%`);
  row('Range of motion component (25%)', `${Math.round(data.riskBreakdown.romScore * 100)}%`);
  row('Movement quality component (15%)', `${Math.round(data.riskBreakdown.movementQualityScore * 100)}%`);
  row('Mobility component (20%)', `${Math.round(data.riskBreakdown.mobilityScore * 100)}%`);
  row('Sensor-camera agreement (10%)', `${Math.round(data.riskBreakdown.agreementScore * 100)}%`);
  row('Overall weighted score', `${Math.round(data.riskBreakdown.weightedTotal * 100)}%`);
  rule();

  const disclaimer =
    'This is an automated screening result based on self-reported symptoms and movement-sensor readings. ' +
    'It identifies possible OA risk markers only and is NOT a medical diagnosis. Osteoarthritis cannot be ' +
    'confirmed or ruled out by this tool. A qualified clinician should review this result before any clinical ' +
    'decision is made.';
  const discLines = doc.splitTextToSize(disclaimer, pageWidth - marginX * 2);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(discLines, marginX, y);

  return doc;
}
