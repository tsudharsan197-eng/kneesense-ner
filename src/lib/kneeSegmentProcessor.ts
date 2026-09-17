// Turns raw ESP32/MPU6050 samples (accel in g, gyro in deg/s) into a fused
// tilt angle plus acceleration/jerk magnitude, via the same complementary
// filter (accelerometer static tilt + gyroscope integration) used by the
// reference BLE test client this was ported from. One instance per exercise
// capture — construct fresh so the first sample of a capture trusts the
// accelerometer alone rather than integrating gyro drift left over from an
// unrelated earlier capture.
//
// Mounting assumptions (matching the reference client — verify against the
// real sensor before trusting the numbers): accel already in g, gyro in
// deg/s, flex/extension rotation about the Y axis, tilt angle computed from
// X against gravity (atan2(ax, sqrt(ay^2+az^2))). If the board is mounted
// differently, only GYRO_AXIS and the tilt-angle axes below need to change.

const GYRO_AXIS: 'gx' | 'gy' | 'gz' = 'gy';
const COMP_FILTER_ALPHA = 0.98;
const G_TO_MS2 = 9.80665;

export interface RawImuReading {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface FusedImuSample {
  /** Seconds since this processor's first sample. */
  t: number;
  angleDeg: number;
  accelMag: number;
  jerkMag: number;
}

export class KneeSegmentProcessor {
  private lastTimeS: number | null = null;
  private lastAccelMs2: [number, number, number] | null = null;
  private angleDeg: number | null = null;
  private readonly startedAtS: number;

  constructor(nowSeconds: number = performance.now() / 1000) {
    this.startedAtS = nowSeconds;
  }

  private static accelTiltAngleDeg(ax: number, ay: number, az: number): number {
    return (Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * 180) / Math.PI;
  }

  update(sample: RawImuReading, nowSeconds: number = performance.now() / 1000): FusedImuSample {
    const dt = this.lastTimeS !== null ? nowSeconds - this.lastTimeS : null;
    this.lastTimeS = nowSeconds;

    const accelAngle = KneeSegmentProcessor.accelTiltAngleDeg(sample.ax, sample.ay, sample.az);
    const gyroRate = sample[GYRO_AXIS];

    if (this.angleDeg === null || dt === null) {
      this.angleDeg = accelAngle;
    } else {
      const gyroAngle = this.angleDeg + gyroRate * dt;
      this.angleDeg = COMP_FILTER_ALPHA * gyroAngle + (1 - COMP_FILTER_ALPHA) * accelAngle;
    }

    const accelMs2: [number, number, number] = [sample.ax * G_TO_MS2, sample.ay * G_TO_MS2, sample.az * G_TO_MS2];
    const accelMag = Math.sqrt(accelMs2[0] ** 2 + accelMs2[1] ** 2 + accelMs2[2] ** 2);

    let jerkMag = 0;
    if (this.lastAccelMs2 !== null && dt) {
      const jx = (accelMs2[0] - this.lastAccelMs2[0]) / dt;
      const jy = (accelMs2[1] - this.lastAccelMs2[1]) / dt;
      const jz = (accelMs2[2] - this.lastAccelMs2[2]) / dt;
      jerkMag = Math.sqrt(jx * jx + jy * jy + jz * jz);
    }
    this.lastAccelMs2 = accelMs2;

    return { t: nowSeconds - this.startedAtS, angleDeg: this.angleDeg, accelMag, jerkMag };
  }
}
