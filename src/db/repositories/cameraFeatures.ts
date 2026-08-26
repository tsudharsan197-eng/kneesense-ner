import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { queueForSync } from '../outbox';
import { classifyAgreement, computeRomFromAngles } from '../../lib/poseAnalysis';
import type { CameraAngleSample } from '../../lib/cameraSource';
import type { CameraFeatures } from '../../types/models';

export interface SaveCameraFeaturesInput {
  exerciseCaptureId: string;
  imuRomDeg: number;
  cameraSamples: CameraAngleSample[];
}

/** Compares the camera-measured ROM against the IMU's for the same capture and classifies agreement per the spec's tolerance bands. */
export async function saveCameraFeatures(input: SaveCameraFeaturesInput): Promise<CameraFeatures> {
  const db = getDb();
  const angles = input.cameraSamples.map((s) => s.kneeAngle);
  const { min, max, rom } = computeRomFromAngles(angles);
  const confidenceAvg =
    input.cameraSamples.length > 0
      ? input.cameraSamples.reduce((a, s) => a + s.confidence, 0) / input.cameraSamples.length
      : 0;
  const diff = Math.abs(input.imuRomDeg - rom);

  const row: CameraFeatures = {
    id: uuidv4(),
    exercise_capture_id: input.exerciseCaptureId,
    camera_min_angle: Math.round(min * 10) / 10,
    camera_max_angle: Math.round(max * 10) / 10,
    camera_rom: Math.round(rom * 10) / 10,
    confidence_avg: Math.round(confidenceAvg * 100) / 100,
    imu_camera_diff: Math.round(diff * 10) / 10,
    agreement_status: classifyAgreement(diff),
    synced: 0,
  };

  await db.run(
    `INSERT INTO camera_features (
       id, exercise_capture_id, camera_min_angle, camera_max_angle, camera_rom,
       confidence_avg, imu_camera_diff, agreement_status, synced
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      row.id,
      row.exercise_capture_id,
      row.camera_min_angle ?? null,
      row.camera_max_angle ?? null,
      row.camera_rom ?? null,
      row.confidence_avg ?? null,
      row.imu_camera_diff ?? null,
      row.agreement_status ?? null,
    ],
  );

  await queueForSync('camera_features', row.id, 'insert', row as unknown as Record<string, unknown>);
  return row;
}

export async function getCameraFeaturesForCapture(exerciseCaptureId: string): Promise<CameraFeatures | null> {
  const db = getDb();
  const res = await db.query('SELECT * FROM camera_features WHERE exercise_capture_id = ? LIMIT 1', [
    exerciseCaptureId,
  ]);
  return (res.values?.[0] as unknown as CameraFeatures) ?? null;
}
