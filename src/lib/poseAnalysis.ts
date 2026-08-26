// Pure geometry/classification helpers for the MediaPipe camera cross-check.
// No MediaPipe or DOM types here on purpose — keeps this testable with
// plain synthetic points, same spirit as motionAnalysis.ts.

import type { AgreementStatus } from '../types/models';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PoseLandmark extends Point3D {
  visibility?: number;
}

/**
 * Knee flexion angle from hip/knee/ankle landmarks, in the SAME convention
 * as the IMU (motionAnalysis.ts): 0deg = leg fully straight, larger =
 * more bent. That's 180deg minus the raw interior hip-knee-ankle angle.
 */
export function computeKneeFlexionAngle(hip: Point3D, knee: Point3D, ankle: Point3D): number {
  const v1 = { x: hip.x - knee.x, y: hip.y - knee.y, z: hip.z - knee.z };
  const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: ankle.z - knee.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;

  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  const interiorAngleDeg = (Math.acos(cos) * 180) / Math.PI;
  return 180 - interiorAngleDeg;
}

/** Average visibility of the three landmarks used for the angle, as the camera confidence (0-1). */
export function computeConfidence(hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark): number {
  const vals = [hip.visibility, knee.visibility, ankle.visibility].filter(
    (v): v is number => typeof v === 'number',
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Prototype tolerance bands from the spec: <=5deg agree, 6-10 check filtering, >10 mismatch. */
export function classifyAgreement(diffDeg: number): AgreementStatus {
  const abs = Math.abs(diffDeg);
  if (abs <= 5) return 'agree';
  if (abs <= 10) return 'check_filtering';
  return 'mismatch';
}

export function computeRomFromAngles(angles: number[]): { min: number; max: number; rom: number } {
  if (angles.length === 0) return { min: 0, max: 0, rom: 0 };
  const min = Math.min(...angles);
  const max = Math.max(...angles);
  return { min, max, rom: max - min };
}
