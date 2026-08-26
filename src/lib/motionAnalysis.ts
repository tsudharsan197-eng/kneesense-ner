// Pure, framework-free analysis of a thigh/shin IMU angle stream for one
// exercise capture. Input is whatever the sensor link (BLE from the ESP32,
// or the simulator during development) produces; this module doesn't care
// which. Angles are in degrees, t is milliseconds since capture start.

export interface AngleSample {
  t: number;
  thighAngle: number;
  shinAngle: number;
}

export interface KneeAngleSample extends AngleSample {
  kneeAngle: number;
}

export interface RomResult {
  minAngle: number;
  maxAngle: number;
  rom: number;
}

export interface RepCountResult {
  repCount: number;
  repPeaks: number[]; // indices into the sample array
}

/** Knee angle = |shin orientation - thigh orientation|, per the project spec. */
export function withKneeAngle(samples: AngleSample[]): KneeAngleSample[] {
  return samples.map((s) => ({ ...s, kneeAngle: Math.abs(s.shinAngle - s.thighAngle) }));
}

export function computeROM(samples: KneeAngleSample[]): RomResult {
  if (samples.length === 0) return { minAngle: 0, maxAngle: 0, rom: 0 };
  let minAngle = samples[0].kneeAngle;
  let maxAngle = samples[0].kneeAngle;
  for (const s of samples) {
    if (s.kneeAngle < minAngle) minAngle = s.kneeAngle;
    if (s.kneeAngle > maxAngle) maxAngle = s.kneeAngle;
  }
  return { minAngle, maxAngle, rom: maxAngle - minAngle };
}

/**
 * Smoothness as mean absolute jerk (rate of change of angular acceleration),
 * normalized by ROM and duration so it's comparable across reps/patients of
 * different speed and range. Lower = smoother. Sudden angle changes, pauses,
 * and rep-to-rep variability all show up as jerk spikes.
 */
export function computeSmoothness(samples: KneeAngleSample[]): number {
  if (samples.length < 4) return 0;

  const velocity: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = (samples[i].t - samples[i - 1].t) / 1000;
    if (dt <= 0) continue;
    velocity.push((samples[i].kneeAngle - samples[i - 1].kneeAngle) / dt);
  }

  const accel: number[] = [];
  for (let i = 1; i < velocity.length; i++) {
    accel.push(velocity[i] - velocity[i - 1]);
  }

  const jerk: number[] = [];
  for (let i = 1; i < accel.length; i++) {
    jerk.push(Math.abs(accel[i] - accel[i - 1]));
  }
  if (jerk.length === 0) return 0;

  const meanJerk = jerk.reduce((a, b) => a + b, 0) / jerk.length;
  const { rom } = computeROM(samples);
  const durationS = (samples[samples.length - 1].t - samples[0].t) / 1000;
  if (rom <= 0 || durationS <= 0) return 0;

  return meanJerk / (rom * durationS);
}

/** Small moving average to knock down single-sample sensor/simulator noise before peak-picking. */
function smoothAngles(samples: KneeAngleSample[], windowSize = 5): number[] {
  const half = Math.floor(windowSize / 2);
  return samples.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(samples.length - 1, i + half);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += samples[j].kneeAngle;
    return sum / (hi - lo + 1);
  });
}

/**
 * Topographic prominence of the peak at index `i`: scan outward from the
 * peak in each direction, tracking the lowest point seen, and stop as soon
 * as a value *higher* than the peak is reached (that marks leaving this
 * peak's "basin" into a neighboring, taller one). This is what makes the
 * result about the nearest real valley next to this specific peak, rather
 * than the global min/max of the whole capture — using the global extremes
 * made every noise wiggle on a slope look like a huge, valid peak.
 */
function prominenceOf(angles: number[], i: number): number {
  const peakVal = angles[i];

  let leftValley = peakVal;
  for (let j = i - 1; j >= 0; j--) {
    if (angles[j] > peakVal) break;
    leftValley = Math.min(leftValley, angles[j]);
  }

  let rightValley = peakVal;
  for (let j = i + 1; j < angles.length; j++) {
    if (angles[j] > peakVal) break;
    rightValley = Math.min(rightValley, angles[j]);
  }

  return peakVal - Math.max(leftValley, rightValley);
}

/**
 * Counts extension/flexion repetitions via peak detection on the (smoothed)
 * knee-angle series: a rep is a local maximum with at least
 * `minProminenceDeg` of topographic prominence, at least `minSeparationMs`
 * apart from the previously accepted peak.
 */
export function countReps(
  samples: KneeAngleSample[],
  options: { minProminenceDeg?: number; minSeparationMs?: number } = {},
): RepCountResult {
  const minProminence = options.minProminenceDeg ?? 10;
  const minSeparation = options.minSeparationMs ?? 500;
  const angles = smoothAngles(samples);

  const candidates: number[] = [];
  for (let i = 1; i < angles.length - 1; i++) {
    if (angles[i] >= angles[i - 1] && angles[i] >= angles[i + 1]) candidates.push(i);
  }

  const accepted: number[] = [];
  for (const idx of candidates) {
    if (prominenceOf(angles, idx) < minProminence) continue;

    const last = accepted[accepted.length - 1];
    if (last !== undefined && samples[idx].t - samples[last].t < minSeparation) {
      if (angles[idx] > angles[last]) accepted[accepted.length - 1] = idx;
      continue;
    }
    accepted.push(idx);
  }

  return { repCount: accepted.length, repPeaks: accepted };
}
