// Real-time, non-ML squat / sit-to-stand counter — ported from the
// reference BLE test client's SquatCounter. Unlike StepCounter this also
// auto-detects which direction "squatting" moves the angle (down or up,
// since it depends on sensor mounting), and classifies every completed rep
// as a normal "squat" or a "shallow squat" against a depth boundary — a
// rep is counted from any real movement-and-reversal cycle, not gated
// behind reaching that boundary, so limited-range-of-motion reps still
// register (just classified as shallow).
//
// HEALTHY_SQUAT_DEPTH_DEG below is a FIXED reference boundary, not derived
// from this patient's own calibration swing — it's shin-angle movement in
// THIS sensor's own mounting (not anatomical knee-flexion degrees), copied
// from the reference client's prior test runs. Re-derive it against this
// app's actual hardware (have someone with normal mobility do a full squat,
// read the resulting angle movement off a logged capture, hardcode that)
// before trusting the shallow/squat split for real screening use.

const CALIBRATION_SECONDS = 8.0;
const ANGLE_SMOOTH_ALPHA = 0.35;
const ACCEL_BASELINE_ALPHA = 0.01;

const MIN_ANGLE_RANGE_DEG = 6.0;
const SWING_FRACTIONS = [0.25, 0.2, 0.15];
const MIN_REPS_FOR_VALID_PATTERN = 2;
const MAX_INTERVAL_VARIATION = 0.7;

const MIN_REP_INTERVAL = 1.0;
const MIN_MOVEMENT_DEG = 1.0;
const MOVEMENT_FRACTION = 0.0;
const MIN_HYSTERESIS_DEG = 1.0;
const MAX_HYSTERESIS_DEG = 12.0;
const HYSTERESIS_FRACTION = 0.3;

/** See the module comment above — placeholder pending re-derivation against this app's real sensor mounting. */
const HEALTHY_SQUAT_DEPTH_DEG = 14.0;

const ACCEL_THRESHOLD_FRACTION = 0.35;
const ACCEL_GATE_WINDOW = 10;

export const SQUAT_CALIBRATION_SECONDS = CALIBRATION_SECONDS;

function ema(prev: number | null, value: number, alpha: number): number {
  return prev === null ? value : prev + alpha * (value - prev);
}

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

/** Confirms a TROUGH once a falling move of >= minSwing reverses by >= minSwing. */
class ZigZagTroughTracker {
  private pivotValue: number | null = null;
  private trend: 'UP' | 'DOWN' | null = null;
  private extremeValue: number | null = null;
  lastTroughValue: number | null = null;
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
    if (this.trend === 'DOWN') {
      if (value <= this.extremeValue!) {
        this.extremeValue = value;
        return false;
      }
      if (value - this.extremeValue! >= this.minSwing) {
        this.pivotValue = this.extremeValue!;
        this.lastTroughValue = this.pivotValue;
        this.trend = 'UP';
        this.extremeValue = value;
        return true;
      }
      return false;
    }
    // trend === 'UP'
    if (value >= this.extremeValue!) {
      this.extremeValue = value;
      return false;
    }
    if (this.extremeValue! - value >= this.minSwing) {
      this.pivotValue = this.extremeValue!;
      this.trend = 'DOWN';
      this.extremeValue = value;
    }
    return false;
  }
}

export type SquatCounterPhase = 'CALIBRATING' | 'COUNTING';
export type SquatType = 'squat' | 'shallow';

export interface SquatDetection {
  repDetected: boolean;
  markTime: number | null;
  markAngle: number | null;
  squatType: SquatType | null;
}

export class SquatCounter {
  phase: SquatCounterPhase = 'CALIBRATING';
  phaseStartS: number | null = null;

  angleSmooth: number | null = null;
  private accelBaselineEma: number | null = null;
  private calibSamples: Array<[number, number, number]> = []; // t, angleSmooth, dynAccel

  baselineAngle: number | null = null;
  private squatDirection: 1 | -1 | null = null;
  private minMovement: number | null = null;
  private hysteresis: number | null = null;
  private shallowDepth: number | null = null;
  /** Absolute-angle version of shallowDepth, for display. */
  depthThreshold: number | null = null;
  private accelThreshold: number | null = null;

  private state: 'WAITING' | 'TRACKING DESCENT' | 'RESET' = 'RESET';
  private candidateTrough: number | null = null;
  private candidateTime: number | null = null;
  private lastRepTime: number | null = null;
  repCount = 0;
  squatCount = 0;
  shallowCount = 0;
  private recentAccel: number[] = [];

  update(angleDeg: number, accelMag: number, now: number): SquatDetection {
    if (this.phaseStartS === null) this.phaseStartS = now;

    this.angleSmooth = ema(this.angleSmooth, angleDeg, ANGLE_SMOOTH_ALPHA);

    if (this.accelBaselineEma === null) this.accelBaselineEma = accelMag;
    this.accelBaselineEma = ema(this.accelBaselineEma, accelMag, ACCEL_BASELINE_ALPHA);
    const dynAccel = accelMag - this.accelBaselineEma;
    this.recentAccel.push(dynAccel);
    if (this.recentAccel.length > ACCEL_GATE_WINDOW) this.recentAccel.shift();

    if (this.phase === 'CALIBRATING') {
      this.runCalibration(this.angleSmooth, dynAccel, now);
      return { repDetected: false, markTime: null, markAngle: null, squatType: null };
    }

    const { markTime, markAngle, squatType } = this.runCounting(this.angleSmooth, now);
    return { repDetected: markTime !== null, markTime, markAngle, squatType };
  }

  private runCalibration(angleSmooth: number, dynAccel: number, now: number) {
    this.calibSamples.push([now, angleSmooth, dynAccel]);
    if (now - this.phaseStartS! < CALIBRATION_SECONDS) return;

    if (this.deriveParametersAndValidate()) {
      this.phase = 'COUNTING';
      this.phaseStartS = now;
      this.repCount = 0;
      this.squatCount = 0;
      this.shallowCount = 0;
      this.lastRepTime = null;
      this.state = 'RESET';
      this.candidateTrough = null;
    } else {
      const cutoff = now - (CALIBRATION_SECONDS - 3.0);
      this.calibSamples = this.calibSamples.filter((s) => s[0] >= cutoff);
      this.phaseStartS = this.calibSamples.length > 0 ? this.calibSamples[0][0] : now;
    }
  }

  private deriveParametersAndValidate(): boolean {
    const angleVals = this.calibSamples.map((s) => s[1]);
    const dynAccelVals = this.calibSamples.map((s) => s[2]);
    if (angleVals.length === 0) return false;

    const angleRange = Math.max(...angleVals) - Math.min(...angleVals);
    if (angleRange < MIN_ANGLE_RANGE_DEG) return false;

    for (const fraction of SWING_FRACTIONS) {
      const minSwing = angleRange * fraction;
      const troughs = SquatCounter.findTroughs(this.calibSamples, minSwing);
      if (troughs.length < MIN_REPS_FOR_VALID_PATTERN) continue;

      const troughTimes = troughs.map((tr) => tr[0]);
      const intervals = troughTimes.slice(1).map((t, i) => t - troughTimes[i]);
      if (intervals.length === 0) continue;

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variation = avgInterval ? std(intervals) / avgInterval : 1.0;
      if (variation > MAX_INTERVAL_VARIATION) continue;

      const troughValues = troughs.map((tr) => tr[1]);
      const meanAngle = angleVals.reduce((a, b) => a + b, 0) / angleVals.length;
      const avgTrough = troughValues.reduce((a, b) => a + b, 0) / troughValues.length;

      if (avgTrough <= meanAngle) {
        this.squatDirection = -1;
        this.baselineAngle = Math.max(...angleVals);
      } else {
        this.squatDirection = 1;
        this.baselineAngle = Math.min(...angleVals);
      }

      const swingValues = troughValues.map((v) => Math.abs(this.baselineAngle! - v));
      const typicalSwing = swingValues.reduce((a, b) => a + b, 0) / swingValues.length;
      if (typicalSwing < MIN_ANGLE_RANGE_DEG / 2) continue;

      this.minMovement = Math.max(MIN_MOVEMENT_DEG, MOVEMENT_FRACTION * typicalSwing);
      this.hysteresis = Math.min(
        Math.max(HYSTERESIS_FRACTION * this.minMovement, MIN_HYSTERESIS_DEG),
        MAX_HYSTERESIS_DEG,
      );

      this.shallowDepth = HEALTHY_SQUAT_DEPTH_DEG;
      this.depthThreshold = this.baselineAngle + this.squatDirection * this.shallowDepth;

      const accelStd = std(dynAccelVals);
      this.accelThreshold = ACCEL_THRESHOLD_FRACTION * Math.max(accelStd, 1e-6);
      return true;
    }
    return false;
  }

  private static findTroughs(samples: Array<[number, number, number]>, minSwing: number): Array<[number, number]> {
    const tracker = new ZigZagTroughTracker(minSwing);
    const troughs: Array<[number, number]> = [];
    for (const [t, angleSmooth] of samples) {
      if (tracker.update(angleSmooth)) troughs.push([t, tracker.lastTroughValue!]);
    }
    return troughs;
  }

  private depthOf(angle: number): number {
    return this.squatDirection! * (angle - this.baselineAngle!);
  }

  private runCounting(
    angle: number,
    now: number,
  ): { markTime: number | null; markAngle: number | null; squatType: SquatType | null } {
    const movement = this.depthOf(angle);

    if (this.state === 'WAITING') {
      if (movement >= this.minMovement!) {
        this.state = 'TRACKING DESCENT';
        this.candidateTrough = angle;
        this.candidateTime = now;
      }
      return { markTime: null, markAngle: null, squatType: null };
    }

    if (this.state === 'TRACKING DESCENT') {
      const currentDepth = this.depthOf(angle);
      const troughDepth = this.depthOf(this.candidateTrough!);

      if (currentDepth > troughDepth) {
        this.candidateTrough = angle;
        this.candidateTime = now;
        return { markTime: null, markAngle: null, squatType: null };
      }

      const riseFromTrough = troughDepth - currentDepth;
      if (riseFromTrough < this.hysteresis!) {
        return { markTime: null, markAngle: null, squatType: null };
      }

      const markTime = this.candidateTime;
      const markAngle = this.candidateTrough;
      const markDepth = troughDepth;
      this.candidateTrough = null;
      this.state = 'RESET';

      if (this.lastRepTime !== null && now - this.lastRepTime < MIN_REP_INTERVAL) {
        return { markTime: null, markAngle: null, squatType: null };
      }
      if (this.recentAccel.length > 0 && Math.max(...this.recentAccel) < this.accelThreshold!) {
        return { markTime: null, markAngle: null, squatType: null };
      }

      this.repCount += 1;
      this.lastRepTime = now;

      let squatType: SquatType;
      if (markDepth >= this.shallowDepth!) {
        squatType = 'squat';
        this.squatCount += 1;
      } else {
        squatType = 'shallow';
        this.shallowCount += 1;
      }

      return { markTime, markAngle, squatType };
    }

    // RESET: require the angle to come back close to upright before allowing
    // another descent. The reference client used a strict `movement <= 0.0`
    // here — found via testing to be fragile: baselineAngle is the single
    // highest angle *observed* during calibration, and noisy/smoothed real
    // data on a later rep may never again reach that exact extreme, which
    // permanently stalls the counter in RESET after the first rep. Using a
    // small tolerance instead (mirroring how StepCounter's own RESET check
    // already uses a peakThreshold-minus-hysteresis margin, not an exact
    // threshold) fixes that without weakening the rep-boundary detection
    // itself, which still requires the full hysteresis reversal above.
    if (movement <= this.hysteresis! * 0.5) {
      this.state = 'WAITING';
    }
    return { markTime: null, markAngle: null, squatType: null };
  }
}
