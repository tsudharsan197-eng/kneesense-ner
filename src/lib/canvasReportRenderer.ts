// Renders the screening report through an HTML canvas instead of jsPDF's
// built-in text() call. This exists ONLY for scripts jsPDF can't shape
// correctly (see reportStrings.ts `needsShapedRendering`) — Tamil's pre-base
// vowel signs (e.g. ெ in மென்மை) render in the wrong visual position
// through jsPDF's font-embedding path, because it maps codepoints to glyphs
// one-to-one with no Indic reordering. A browser's own canvas text renderer
// does correct complex-script shaping (proven empirically before writing
// this), so each page is drawn as an image and placed into the PDF.
import type { ReportData } from './reportGenerator';
import { getReportStrings, type ReportStrings } from './reportStrings';
import type { Language, RiskCategory } from '../types/models';

const SCALE = 2; // render at 2x point resolution for crisp text in the embedded image
const PAGE_WIDTH_PT = 595.28;
const PAGE_HEIGHT_PT = 841.89;
const MARGIN_PT = 48;
const BOTTOM_MARGIN_PT = 48;

const TAMIL_FONT_FAMILY = 'NotoSansTamilReport';
const TAMIL_FONT_URL = '/fonts/NotoSansTamil-Variable.ttf';

let fontLoadPromise: Promise<void> | null = null;

function ensureTamilFontLoaded(): Promise<void> {
  if (!fontLoadPromise) {
    fontLoadPromise = (async () => {
      const font = new FontFace(TAMIL_FONT_FAMILY, `url(${TAMIL_FONT_URL})`, {
        weight: '100 900',
      });
      await font.load();
      document.fonts.add(font);
    })();
  }
  return fontLoadPromise;
}

export interface RenderedReportPages {
  dataUrls: string[];
  pageWidthPt: number;
  pageHeightPt: number;
}

export async function renderReportToImages(
  data: ReportData,
  language: Language,
): Promise<RenderedReportPages> {
  await ensureTamilFontLoaded();
  const s = getReportStrings(language);

  const pageWidthPx = PAGE_WIDTH_PT * SCALE;
  const pageHeightPx = PAGE_HEIGHT_PT * SCALE;
  const marginPx = MARGIN_PT * SCALE;
  const bottomLimitPx = pageHeightPx - BOTTOM_MARGIN_PT * SCALE;

  const dataUrls: string[] = [];
  let canvas = document.createElement('canvas');
  let ctx: CanvasRenderingContext2D;
  let y = 0;

  function newCanvas() {
    canvas = document.createElement('canvas');
    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;
    ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'alphabetic';
    y = 56 * SCALE;
  }
  newCanvas();

  function finishPage() {
    dataUrls.push(canvas.toDataURL('image/jpeg', 0.85));
  }

  function ensureSpace(neededPx: number) {
    if (y + neededPx > bottomLimitPx) {
      finishPage();
      newCanvas();
    }
  }

  function setFont(sizePt: number, bold: boolean, italic = false) {
    const weight = bold ? '700' : '400';
    const style = italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${sizePt * SCALE}px ${TAMIL_FONT_FAMILY}`;
  }

  function line(text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) {
    const size = opts.size ?? 11;
    ensureSpace((opts.gap ?? size * 1.4) * SCALE);
    setFont(size, !!opts.bold);
    ctx.fillStyle = '#000000';
    ctx.fillText(text, marginPx, y);
    y += (opts.gap ?? size * 1.4) * SCALE;
  }

  function rule() {
    ensureSpace(14 * SCALE);
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 1 * SCALE;
    ctx.beginPath();
    ctx.moveTo(marginPx, y);
    ctx.lineTo(pageWidthPx - marginPx, y);
    ctx.stroke();
    y += 14 * SCALE;
  }

  function row(label: string, value: string) {
    ensureSpace(16 * SCALE);
    setFont(10.5, false);
    ctx.fillStyle = '#000000';
    ctx.fillText(label, marginPx, y);
    ctx.fillText(value, marginPx + 220 * SCALE, y);
    y += 16 * SCALE;
  }

  function sectionHeading(text: string) {
    y += 6 * SCALE;
    line(text, { bold: true, size: 13, gap: 20 });
  }

  function wrapText(text: string, maxWidthPx: number): string[] {
    const words = text.split(' ');
    const wrapped: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidthPx && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrapped.push(current);
    return wrapped;
  }

  function paragraph(text: string, opts: { size?: number; italic?: boolean; color?: string } = {}) {
    const size = opts.size ?? 11;
    setFont(size, false, opts.italic);
    ctx.fillStyle = opts.color ?? '#000000';
    const maxWidth = pageWidthPx - marginPx * 2;
    const lines = wrapText(text, maxWidth);
    for (const l of lines) {
      ensureSpace(size * 1.4 * SCALE);
      ctx.fillText(l, marginPx, y);
      y += size * 1.4 * SCALE;
    }
  }

  buildReportContent(data, s, { line, rule, row, sectionHeading, paragraph });

  finishPage();
  return { dataUrls, pageWidthPt: PAGE_WIDTH_PT, pageHeightPt: PAGE_HEIGHT_PT };
}

interface ContentPrimitives {
  line: (text: string, opts?: { bold?: boolean; size?: number; gap?: number }) => void;
  rule: () => void;
  row: (label: string, value: string) => void;
  sectionHeading: (text: string) => void;
  paragraph: (text: string, opts?: { size?: number; italic?: boolean; color?: string }) => void;
}

/** The report's actual content/layout — shared shape between the canvas renderer above
 * and, in spirit, the native jsPDF path in reportGenerator.ts (kept separate there since
 * jsPDF's own text()/splitTextToSize() API differs enough that duplicating was clearer
 * than forcing both through one abstraction). */
function buildReportContent(
  data: ReportData,
  s: ReportStrings,
  { line, rule, row, sectionHeading, paragraph }: ContentPrimitives,
) {
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
  const category: RiskCategory = data.riskCategory;
  line(s.categoryHeading[category], { bold: true, size: 13, gap: 18 });
  paragraph(s.categoryRecommendation[category], { size: 11 });

  row(s.symptomsComponent, `${Math.round(data.riskBreakdown.symptomScore * 100)}%`);
  row(s.romComponent, `${Math.round(data.riskBreakdown.romScore * 100)}%`);
  row(s.movementQualityComponent, `${Math.round(data.riskBreakdown.movementQualityScore * 100)}%`);
  row(s.mobilityComponent, `${Math.round(data.riskBreakdown.mobilityScore * 100)}%`);
  row(s.agreementComponent, `${Math.round(data.riskBreakdown.agreementScore * 100)}%`);
  row(s.overall, `${Math.round(data.riskBreakdown.weightedTotal * 100)}%`);
  rule();

  paragraph(s.disclaimer, { size: 9.5, italic: true, color: '#5a5a5a' });
}
