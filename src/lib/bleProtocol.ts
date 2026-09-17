// Shared contract between the ESP32 firmware and the app, matching the
// reference BLE test client (a raw MPU6050-over-BLE broadcaster — no
// control/status characteristics, notify-only). This intentionally
// replaces the earlier custom binary protocol in this file's history: the
// two don't coexist, since there's only one physical characteristic to
// subscribe to and this is what the actual flashed hardware speaks.

export const DEVICE_NAME = 'KneeSense_test';
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export interface RawImuReading {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

/**
 * Each notification is a UTF-8 text packet "ax,ay,az,gx,gy,gz" (accel in g,
 * gyro in deg/s) — not a binary payload. Throws on anything that doesn't
 * parse as exactly 6 numbers, so a malformed/partial packet surfaces as a
 * visible error rather than silently feeding NaN into the angle filter.
 */
export function decodeImuCsvPayload(value: DataView): RawImuReading {
  const text = new TextDecoder().decode(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  const parts = text.trim().split(',').map(Number);
  if (parts.length !== 6 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Malformed IMU packet: "${text}"`);
  }
  const [ax, ay, az, gx, gy, gz] = parts;
  return { ax, ay, az, gx, gy, gz };
}
