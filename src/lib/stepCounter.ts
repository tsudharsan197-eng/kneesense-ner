// Real-time, non-ML step counter — ported from the reference BLE test
// client's StepCounter. Two phases:
//   CALIBRATING (5s) — learns the walking peak angle, baseline angle,
//     swing and acceleration thresholds from the patient's own gait.
//   COUNTING — state machine WAITING -> TRACKING PEAK -> RESET -> WAITING.
//     A step is counted when the (smoothed) shin angle rises above the
//     learned threshold and then drops by a hysteresis margin. Angle is
//     the primary detector; acceleration magnitude is only a
//     movement-confirmation gate (rejects a peak with no footfall
//     transient behind it).

const CALIBRATION_SECONDS = 5.0;
const ANGLE_SMOOTH_ALPHA = 0.35;
const ACCEL_BASELINE_ALPHA = 0.01;

const MIN_ANGLE_RANGE_DEG = 5.0;
const SWING_FRACTIONS = [0.3, 0.25, 0.2];
const MIN_PEAKS_FOR_VALID_PATTERN = 3;
const MAX_INTERVAL_VARIATION = 0.45;

const MIN_STEP_INTERVAL = 0.3;
const HYSTERESIS_FRACTION = 0.5;
const MIN_HYSTERESIS_DEG = 3.0;
const MAX_HYSTERESIS_DEG = 15.0;

const THRESHOLD_MARGIN_FRACTION = 0.25;
const THRESHOLD_MARGIN_MIN_DEG = 2.0;
const THRESHOLD_ADAPT_ALPHA = 0.05;

const ACCEL_GATE_WINDOW = 10;
const ACCEL_THRESHOLD_FRACTION = 0.5;

export const STEP_CALIBRATION_SECONDS = CALIBRATION_SECONDS;

function ema(prev: number | null, value: number, alpha: number): number {
  return prev === null ? value : prev + alpha * (value - prev);
}

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

/** Confirms a PEAK once a rising move of >= minSwing reverses by >= minSwing. */
class ZigZagPeakTracker {
  private pivotValue: number | null = null;
  private trend: 'UP' | 'DOWN' | null = null;
  private extremeValue: number | null = null;
  lastPeakValue: number | null = null;
  private readonly minSwing: number;

  constructor(minSwing: number) {
    this.minSwing = minSwing;
  }

  update(value: number): boolean {
    if (this.pivotValue === null) {
      this.pivotValue = value;
      this.extremeValue = value;
      return false;
    }
    if (this.trend === null) {
      if (value - this.pivotValue >= this.minSwing) {
        this.trend = 'UP';
        this.extremeValue = value;
      } else if (this.pivotValue - value >= this.minSwing) {
        this.trend = 'DOWN';
        this.extremeValue = value;
      }
      return false;
    }
    if (this.trend === 'UP') {
      if (value >= this.extremeValue!) {
        this.extremeValue = value;
        return false;
      }
      if (this.extremeValue! - value >= this.minSwing) {
        this.pivotValue = this.extremeValue!;
        this.lastPeakValue = this.pivotValue;
        this.trend = 'DOWN';
        this.extremeValue = value;
        return true;
      }
      return false;
    }
    // trend === 'DOWN'
    if (value <= this.extremeValue!) {
      this.extremeValue = value;
      return false;
    }
    if (value - this.extremeValue! >= this.minSwing) {
      this.pivotValue = this.extremeValue!;
      this.trend = 'UP';
      this.extremeValue = value;
    }
    return false;
  }
}

export type StepCounterPhase = 'CALIBRATING' | 'COUNTING';

export interface StepDetection {
  stepDetected: boolean;
  markTime: number | null;
  markAngle: number | null;
}

export class StepCounter {
  phase: StepCounterPhase = 'CALIBRATING';
  phaseStartS: number | null = null;

  angleSmooth: number | null = null;
  private accelBaselineEma: number | null = null;
  private calibSamples: Array<[number, number, number]> = []; // t, angleSmooth, dynAccel

  private minSwing: number | null = null;
  private hysteresis: number | null = null;
  peakThreshold: number | null = null;
  private peakReference: number | null = null;
  private accelThreshold: number | null = null;

  private state: 'WAITING' | 'TRACKING PEAK' | 'RESET' = 'RESET';
  private candidatePeak: number | null = null;
  private candidateTime: number | null = null;
  private lastStepTime: number | null = null;
  stepCount = 0;
  private recentAccel: number[] = [];

  update(angleDeg: number, accelMag: number, now: number): StepDetection {
    if (this.phaseStartS === null) this.phaseStartS = now;

    this.angleSmooth = ema(this.angleSmooth, angleDeg, ANGLE_SMOOTH_ALPHA);

    if (this.accelBaselineEma === null) this.accelBaselineEma = accelMag;
    this.accelBaselineEma = ema(this.accelBaselineEma, accelMag, ACCEL_BASELINE_ALPHA);
    const dynAccel = accelMag - this.accelBaselineEma;
    this.recentAccel.push(dynAccel);
    if (this.recentAccel.length > ACCEL_GATE_WINDOW) this.recentAccel.shift();

    if (this.phase === 'CALIBRATING') {
      this.runCalibration(this.angleSmooth, dynAccel, now);
      return { stepDetected: false, markTime: null, markAngle: null };
    }

    const { markTime, markAngle } = this.runCounting(this.angleSmooth, now);
    return { stepDetected: markTime !== null, markTime, markAngle };
  }

  private runCalibration(angleSmooth: number, dynAccel: number, now: number) {
    this.calibSamples.push([now, angleSmooth, dynAccel]);
    if (now - this.phaseStartS! < CALIBRATION_SECONDS) return;

    if (this.deriveThresholdsAndValidate()) {
      this.phase = 'COUNTING';
      this.phaseStartS = now;
      this.stepCount = 0;
      this.lastStepTime = null;
      this.state = 'RESET';
      this.candidatePeak = null;
    } else {
      const cutoff = now - (CALIBRATION_SECONDS - 2.0);
      this.calibSamples = this.calibSamples.filter((s) => s[0] >= cutoff);
      this.phaseStartS = this.calibSamples.length > 0 ? this.calibSamples[0][0] : now;
    }
  }

  private deriveThresholdsAndValidate(): boolean {
    const angleVals = this.calibSamples.map((s) => s[1]);
    const dynAccelVals = this.calibSamples.map((s) => s[2]);

    const angleRange = Math.max(...angleVals) - Math.min(...angleVals);
    if (angleRange < MIN_ANGLE_RANGE_DEG) return false;

    const accelStd = std(dynAccelVals);

    for (const fraction of SWING_FRACTIONS) {
      const minSwing = angleRange * fraction;
      const peaks = StepCounter.findPeaks(this.calibSamples, minSwing);
      if (peaks.length < MIN_PEAKS_FOR_VALID_PATTERN) continue;

      const peakTimes = peaks.map((p) => p[0]);
      const peakValues = peaks.map((p) => p[1]);
      const intervals = peakTimes.slice(1).map((t, i) => t - peakTimes[i]);
      if (intervals.length < MIN_PEAKS_FOR_VALID_PATTERN - 1) continue;

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variation = avgInterval ? std(intervals) / avgInterval : 1.0;
      if (variation > MAX_INTERVAL_VARIATION) continue;

      const avgPeak = peakValues.reduce((a, b) => a + b, 0) / peakValues.length;
      const margin = Math.max(THRESHOLD_MARGIN_MIN_DEG, THRESHOLD_MARGIN_FRACTION * minSwing);

      this.minSwing = minSwing;
      this.hysteresis = Math.min(Math.max(HYSTERESIS_FRACTION * minSwing, MIN_HYSTERESIS_DEG), MAX_HYSTERESIS_DEG);
      this.peakReference = avgPeak;
      this.peakThreshold = avgPeak - margin;
      this.accelThreshold = ACCEL_THRESHOLD_FRACTION * Math.max(accelStd, 1e-6);
      return true;
    }
    return false;
  }

  private static findPeaks(samples: Array<[number, number, number]>, minSwing: number): Array<[number, number]> {
    const tracker = new ZigZagPeakTracker(minSwing);
    const peaks: Array<[number, number]> = [];
    for (const [t, angleSmooth] of samples) {
      if (tracker.update(angleSmooth)) peaks.push([t, tracker.lastPeakValue!]);
    }
    return peaks;
  }

  private runCounting(angle: number, now: number): { markTime: number | null; markAngle: number | null } {
    if (this.state === 'WAITING') {
      if (angle >= this.peakThreshold!) {
        this.state = 'TRACKING PEAK';
        this.candidatePeak = angle;
        this.candidateTime = now;
      }
      return { markTime: null, markAngle: null };
    }

    if (this.state === 'TRACKING PEAK') {
      if (angle > this.candidatePeak!) {
        this.candidatePeak = angle;
        this.candidateTime = now;
      }
      if (angle > this.candidatePeak! - this.hysteresis!) {
        return { markTime: null, markAngle: null }; // drop not deep enough yet
      }

      const markTime = this.candidateTime;
      const markAngle = this.candidatePeak;
      this.candidatePeak = null;
      this.state = 'RESET'; // lock until back in reset region

      if (this.lastStepTime !== null && now - this.lastStepTime < MIN_STEP_INTERVAL) {
        return { markTime: null, markAngle: null };
      }
      if (this.recentAccel.length > 0 && Math.max(...this.recentAccel) < this.accelThreshold!) {
        return { markTime: null, markAngle: null }; // no footfall transient — reject
      }

      this.stepCount += 1;
      this.lastStepTime = now;

      this.peakReference = ema(this.peakReference, markAngle!, THRESHOLD_ADAPT_ALPHA);
      const margin = Math.max(THRESHOLD_MARGIN_MIN_DEG, THRESHOLD_MARGIN_FRACTION * this.minSwing!);
      this.peakThreshold = this.peakReference - margin;

      return { markTime, markAngle };
    }

    // RESET: stay locked until the angle returns to the reset region
    if (angle <= this.peakThreshold! - this.hysteresis!) {
      this.state = 'WAITING';
    }
    return { markTime: null, markAngle: null };
  }
}
