// Rule-based OA-risk-marker scoring (prototype). NOT a diagnosis — this
// combines symptom self-report and movement-test features into a coarse
// risk category to guide whether clinical follow-up is recommended. See
// README / project spec for the "never say 'has osteoarthritis'" wording
// rule enforced in the UI layer, not here.

import type { RiskCategory } from '../types/models';

export interface RiskScoreBreakdown {
  symptomScore: number; // 0-1, higher = more risk
  romScore: number;
  movementQualityScore: number;
  mobilityScore: number;
  agreementScore: number;
  weightedTotal: number;
  riskCategory: RiskCategory;
}

export interface RiskScoreInput {
  // Symptoms (pain + stiffness + swelling — the "how does it feel" domain)
  painScoreAvg: number; // 0-10
  morningStiffness: number; // 0-3
  swelling: number; // 0-3

  // Range of motion, from the knee-extension capture
  romDeg: number | null;

  // Movement quality, from the same capture
  smoothness: number | null;

  // Mobility (reported functional difficulty, blended with objective
  // walk-test metrics when available)
  walkingDifficulty: number; // 0-3
  stairClimbingDifficulty: number; // 0-3
  standFromChairDifficulty: number; // 0-3
  walkTest?: {
    speedMps: number;
    pauseCount: number;
    assistanceNeeded: boolean;
    gaitIrregularity: number; // 0-3
  } | null;

  // Sensor/camera cross-check, if a camera capture was done
  imuCameraDiffDeg?: number | null;
}

const WEIGHTS = {
  symptoms: 0.3,
  rom: 0.25,
  movementQuality: 0.15,
  mobility: 0.2,
  agreement: 0.1,
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerpRisk = (value: number, lowRisk: number, highRisk: number) =>
  clamp01((value - lowRisk) / (highRisk - lowRisk));

function scoreSymptoms(painScoreAvg: number, morningStiffness: number, swelling: number): number {
  const painNorm = clamp01(painScoreAvg / 10);
  const stiffNorm = clamp01(morningStiffness / 3);
  const swellingNorm = clamp01(swelling / 3);
  return painNorm * 0.6 + stiffNorm * 0.2 + swellingNorm * 0.2;
}

/** Healthy seated-knee-extension ROM is ~90°; <=30° is severely restricted. Prototype thresholds — recalibrate against clinician-reviewed data before real use. */
function scoreRom(romDeg: number | null): number {
  if (romDeg === null) return 0.5; // no capture yet — neutral, not zero, so a missing test doesn't look "healthy"
  return lerpRisk(90 - romDeg, 0, 60);
}

/** Prototype thresholds based on this app's own smoothness metric scale — see motionAnalysis.ts. */
function scoreMovementQuality(smoothness: number | null): number {
  if (smoothness === null) return 0.5;
  return lerpRisk(smoothness, 0.1, 0.6);
}

/** Comfortable-pace walking speed: >=1.2 m/s is a common healthy-adult reference; <=0.4 m/s is severely reduced. Prototype thresholds. */
function scoreObjectiveWalk(walkTest: NonNullable<RiskScoreInput['walkTest']>): number {
  const speedRisk = lerpRisk(1.2 - walkTest.speedMps, 0, 0.8);
  const pauseRisk = lerpRisk(walkTest.pauseCount, 0, 3);
  const assistanceRisk = walkTest.assistanceNeeded ? 1 : 0;
  const gaitRisk = clamp01(walkTest.gaitIrregularity / 3);
  return (speedRisk + pauseRisk + assistanceRisk + gaitRisk) / 4;
}

function scoreMobility(
  walkingDifficulty: number,
  stairClimbingDifficulty: number,
  standFromChairDifficulty: number,
  walkTest?: RiskScoreInput['walkTest'],
): number {
  const reported = clamp01((walkingDifficulty + stairClimbingDifficulty + standFromChairDifficulty) / 9);
  if (!walkTest) return reported;
  return reported * 0.5 + scoreObjectiveWalk(walkTest) * 0.5;
}

/** Prototype tolerance bands from the spec: <=5deg agree, 6-10 check filtering, >10 mismatch. */
function scoreAgreement(imuCameraDiffDeg?: number | null): number {
  if (imuCameraDiffDeg === undefined || imuCameraDiffDeg === null) return 0; // no camera used — don't penalize an IMU-only screening
  if (imuCameraDiffDeg <= 5) return 0;
  if (imuCameraDiffDeg <= 10) return 0.5;
  return 1;
}

function categorize(weightedTotal: number): RiskCategory {
  if (weightedTotal < 0.34) return 'low';
  if (weightedTotal < 0.67) return 'moderate';
  return 'high';
}

export function computeRiskScore(input: RiskScoreInput): RiskScoreBreakdown {
  const symptomScore = scoreSymptoms(input.painScoreAvg, input.morningStiffness, input.swelling);
  const romScore = scoreRom(input.romDeg);
  const movementQualityScore = scoreMovementQuality(input.smoothness);
  const mobilityScore = scoreMobility(
    input.walkingDifficulty,
    input.stairClimbingDifficulty,
    input.standFromChairDifficulty,
    input.walkTest,
  );
  const agreementScore = scoreAgreement(input.imuCameraDiffDeg);

  const weightedTotal =
    symptomScore * WEIGHTS.symptoms +
    romScore * WEIGHTS.rom +
    movementQualityScore * WEIGHTS.movementQuality +
    mobilityScore * WEIGHTS.mobility +
    agreementScore * WEIGHTS.agreement;

  return {
    symptomScore,
    romScore,
    movementQualityScore,
    mobilityScore,
    agreementScore,
    weightedTotal: Math.round(weightedTotal * 1000) / 1000,
    riskCategory: categorize(weightedTotal),
  };
}
