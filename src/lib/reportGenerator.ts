import { jsPDF } from 'jspdf';
import type { RiskScoreBreakdown } from './riskScoring';
import type { AffectedKnee, ExerciseCapture, Language, RiskCategory } from '../types/models';
import { getReportStrings, needsShapedRendering, type ReportStrings } from './reportStrings';
import { renderReportToImages } from './canvasReportRenderer';

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

/** Native jsPDF text path — fast, and correct for Latin-script languages (English today).
 * Not used for Tamil: see reportStrings.ts `needsShapedRendering` for why. */
function buildReportPdfNative(data: ReportData, s: ReportStrings): jsPDF {
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

  const bool = (v: boolean) => (v ? s.yes : s.no);

  line(s.title, { bold: true, size: 16, gap: 24 });
  row(s.patientId, data.patientCode);
  row(s.date, new Date(data.sessionDate).toLocaleString());
  row(s.ageGroup, data.ageGroup);
  if (data.location) row(s.location, data.location);
  row(s.kneeTested, data.affectedKnee);
  row(s.previousInjury, bool(data.previousInjury));
  rule();

  sectionHeading(s.symptomsSection);
  row(s.avgPainScore, data.painScoreAvg?.toFixed(1) ?? s.notRecorded);
  row(s.morningStiffness, data.morningStiffness !== null ? s.difficultyLabels[data.morningStiffness] : s.notRecorded);
  row(s.swelling, data.swelling !== null ? s.difficultyLabels[data.swelling] : s.notRecorded);
  row(s.walkingDifficulty, data.walkingDifficulty !== null ? s.difficultyLabels[data.walkingDifficulty] : s.notRecorded);
  row(
    s.stairClimbingDifficulty,
    data.stairClimbingDifficulty !== null ? s.difficultyLabels[data.stairClimbingDifficulty] : s.notRecorded,
  );
  row(
    s.standFromChairDifficulty,
    data.standFromChairDifficulty !== null ? s.difficultyLabels[data.standFromChairDifficulty] : s.notRecorded,
  );
  rule();

  sectionHeading(s.kneeExtensionSection);
  if (data.kneeExtension) {
    row(s.minAngle, `${data.kneeExtension.min_angle_deg}°`);
    row(s.maxAngle, `${data.kneeExtension.max_angle_deg}°`);
    row(s.rom, `${data.kneeExtension.rom_deg}°`);
    row(s.smoothness, `${data.kneeExtension.smoothness}`);
    row(s.repsCounted, `${data.kneeExtension.rep_count}`);
  } else {
    row(s.status, s.notPerformed);
  }
  rule();

  sectionHeading(s.sitToStandSection);
  if (data.sitToStand) {
    row(s.minAngle, `${data.sitToStand.min_angle_deg}°`);
    row(s.maxAngle, `${data.sitToStand.max_angle_deg}°`);
    row(s.rom, `${data.sitToStand.rom_deg}°`);
    row(s.smoothness, `${data.sitToStand.smoothness}`);
    row(s.repsCounted, `${data.sitToStand.rep_count}`);
  } else {
    row(s.status, s.notPerformedSkippedSafety);
  }
  rule();

  sectionHeading(s.walkingTestSection);
  if (data.walkTest) {
    row(s.distance, `${data.walkTest.distanceM} m`);
    row(s.time, `${data.walkTest.timeS} s`);
    row(s.speed, `${data.walkTest.speedMps} m/s`);
    row(s.cadence, `${data.walkTest.cadenceSpm} steps/min`);
    row(s.pauses, `${data.walkTest.pauseCount}`);
    row(s.assistanceNeeded, bool(data.walkTest.assistanceNeeded));
  } else {
    row(s.status, s.notPerformed);
  }
  rule();

  sectionHeading(s.cameraSection);
  if (data.cameraAvailable) {
    row(s.cameraRom, `${data.cameraRom}°`);
    row(s.cameraConfidence, `${data.cameraConfidence}`);
    row(s.imuCameraDiff, `${data.imuCameraDiffDeg}°`);
    row(s.agreement, `${data.cameraAgreementStatus}`);
  } else {
    row(s.status, s.notPerformedCameraOnly);
  }
  rule();

  sectionHeading(s.resultSection);
  line(s.categoryHeading[data.riskCategory], { bold: true, size: 13, gap: 18 });
  const recLines = doc.splitTextToSize(s.categoryRecommendation[data.riskCategory], pageWidth - marginX * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(recLines, marginX, y);
  y += recLines.length * 14 + 8;

  row(s.symptomsComponent, `${Math.round(data.riskBreakdown.symptomScore * 100)}%`);
  row(s.romComponent, `${Math.round(data.riskBreakdown.romScore * 100)}%`);
  row(s.movementQualityComponent, `${Math.round(data.riskBreakdown.movementQualityScore * 100)}%`);
  row(s.mobilityComponent, `${Math.round(data.riskBreakdown.mobilityScore * 100)}%`);
  row(s.agreementComponent, `${Math.round(data.riskBreakdown.agreementScore * 100)}%`);
  row(s.overall, `${Math.round(data.riskBreakdown.weightedTotal * 100)}%`);
  rule();

  const discLines = doc.splitTextToSize(s.disclaimer, pageWidth - marginX * 2);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(discLines, marginX, y);

  return doc;
}

/** Canvas-rendered path for scripts jsPDF can't shape correctly (Tamil today) — see
 * canvasReportRenderer.ts. Each page is drawn by the browser (correct shaping) then
 * placed into the PDF as a full-page image. */
async function buildReportPdfShaped(data: ReportData, language: Language): Promise<jsPDF> {
  const { dataUrls, pageWidthPt, pageHeightPt } = await renderReportToImages(data, language);
  const doc = new jsPDF({ unit: 'pt', format: [pageWidthPt, pageHeightPt] });
  dataUrls.forEach((dataUrl, i) => {
    if (i > 0) doc.addPage([pageWidthPt, pageHeightPt]);
    doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidthPt, pageHeightPt);
  });
  return doc;
}

/** Builds the offline screening report as a jsPDF document. Caller decides how to persist it (see reports.ts). */
export async function buildReportPdf(data: ReportData, language: Language = 'en'): Promise<jsPDF> {
  if (needsShapedRendering(language)) {
    return buildReportPdfShaped(data, language);
  }
  return buildReportPdfNative(data, getReportStrings(language));
}
