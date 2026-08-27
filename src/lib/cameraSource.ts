import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { computeConfidence, computeKneeFlexionAngle, type PoseLandmark } from './poseAnalysis';

export type KneeSide = 'left' | 'right';

export interface Point2D {
  x: number;
  y: number;
}

export interface CameraAngleSample {
  t: number;
  kneeAngle: number;
  confidence: number;
  /** Normalized (0-1) image-space landmarks, for drawing a skeleton overlay on the video. */
  imagePoints: { hip: Point2D; knee: Point2D; ankle: Point2D } | null;
}

// BlazePose 33-point landmark indices (MediaPipe's standard pose model).
const LANDMARK_INDEX = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
} as const;

// Everything here is bundled locally (see scripts/copy-mediapipe-assets.mjs)
// so this runs fully offline — no CDN fetch at runtime.
const WASM_BASE_URL = '/mediapipe/wasm';
const MODEL_ASSET_PATH = '/mediapipe/pose_landmarker_lite.task';

/**
 * Wraps webcam capture + MediaPipe pose detection into the same start/stop
 * sample-callback shape as SensorSource (sensorSource.ts), so the capture
 * page can run both side by side. Requires a real camera and user
 * permission grant — this can only be exercised end-to-end on an actual
 * device/browser, not in an automated headless test.
 */
export class PoseCameraSource {
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private running = false;

  async start(video: HTMLVideoElement, side: KneeSide, onSample: (sample: CameraAngleSample) => void): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    // GPU delegate needs WebGL2 with specific extensions and is genuinely
    // unreliable across real hardware (integrated graphics, driver quirks,
    // locked-down/virtualized machines) — this is a common real-world
    // failure point for MediaPipe Tasks Vision, not a hypothetical one.
    // Falling back to CPU keeps the feature working (slower, but correct)
    // instead of failing outright on affected devices.
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    } catch (err) {
      console.warn('[camera] GPU delegate failed, retrying on CPU', err);
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    }

    // No facingMode constraint: 'environment' (rear camera) only makes
    // sense on a phone propped up beside the leg. A laptop only has a
    // front-facing webcam, so forcing 'environment' is wrong there — let
    // the browser hand back whatever camera it actually has.
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = this.stream;
    await video.play();

    const { hip: hipIdx, knee: kneeIdx, ankle: ankleIdx } = LANDMARK_INDEX[side];
    const startTime = performance.now();
    this.running = true;

    const loop = () => {
      if (!this.running || !this.landmarker) return;
      const result = this.landmarker.detectForVideo(video, performance.now());
      // World landmarks (real-world 3D meters, hip-centered) are more
      // geometrically accurate for an angle than normalized image coords —
      // fall back to image-space landmarks if unavailable.
      const points = (result.worldLandmarks?.[0] ?? result.landmarks?.[0]) as PoseLandmark[] | undefined;
      // Image-space landmarks (normalized 0-1 relative to the video frame)
      // are what a skeleton overlay needs to draw on a canvas — these are
      // always in image coordinates, unlike worldLandmarks.
      const imagePoints = result.landmarks?.[0] as PoseLandmark[] | undefined;

      if (points && points.length > ankleIdx) {
        const hip = points[hipIdx];
        const knee = points[kneeIdx];
        const ankle = points[ankleIdx];
        onSample({
          t: performance.now() - startTime,
          kneeAngle: computeKneeFlexionAngle(hip, knee, ankle),
          confidence: computeConfidence(hip, knee, ankle),
          imagePoints:
            imagePoints && imagePoints.length > ankleIdx
              ? { hip: imagePoints[hipIdx], knee: imagePoints[kneeIdx], ankle: imagePoints[ankleIdx] }
              : null,
        });
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.landmarker?.close();
    this.landmarker = null;
  }
}
