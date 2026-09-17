import { BleClient } from '@capacitor-community/bluetooth-le';
import { CHARACTERISTIC_UUID, DEVICE_NAME, SERVICE_UUID, decodeImuCsvPayload } from './bleProtocol';
import { KneeSegmentProcessor, type FusedImuSample } from './kneeSegmentProcessor';
import type { SensorSource } from './sensorSource';
import type { AngleSample } from './motionAnalysis';

/**
 * A rural health worker pairs the ESP32 once after attaching the sensor
 * (see SensorPairingPage), then runs knee-extension, sit-to-stand, walk
 * test, etc. without re-pairing between exercises — so this is a
 * module-level singleton connection, not something each capture page owns.
 */
let deviceId: string | null = null;
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await BleClient.initialize();
    initialized = true;
  }
}

export function isConnected(): boolean {
  return deviceId !== null;
}

/**
 * Fan-out for BLE disconnect events. There's exactly one native disconnect
 * callback per connection (registered in connect() below), but more than
 * one screen needs to react to it — SensorPairingPage resets its own
 * status, and whichever capture page is mid-capture needs to stop and show
 * an error rather than silently freezing. Returns an unsubscribe function.
 */
const disconnectListeners = new Set<() => void>();

export function onDisconnect(listener: () => void): () => void {
  disconnectListeners.add(listener);
  return () => disconnectListeners.delete(listener);
}

/**
 * Races a promise against a timer so a stalled native BLE call surfaces as
 * a real error instead of hanging the UI in "Connecting..." forever.
 * Web Bluetooth's connect can genuinely never settle in some failure modes
 * — e.g. the OS having separately bonded/paired with the device at the
 * platform level (Windows Settings > Bluetooth, not this app) conflicting
 * with the page's own GATT connection attempt.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const CONNECT_TIMEOUT_MS = 15000;
const TIMEOUT_MESSAGE =
  'Connection timed out. If this sensor is also paired in your device\'s own Bluetooth settings (not this app), remove/unpair it there first — this app connects directly over Web Bluetooth and an OS-level pairing can block that. Then try again.';

export async function connect(): Promise<void> {
  await ensureInitialized();
  const device = await BleClient.requestDevice({ name: DEVICE_NAME, optionalServices: [SERVICE_UUID] });
  await withTimeout(
    BleClient.connect(device.deviceId, () => {
      deviceId = null;
      disconnectListeners.forEach((listener) => listener());
    }),
    CONNECT_TIMEOUT_MS,
    TIMEOUT_MESSAGE,
  );
  deviceId = device.deviceId;
}

export async function disconnect(): Promise<void> {
  if (!deviceId) return;
  await BleClient.disconnect(deviceId);
  deviceId = null;
}

/**
 * Subscribes to the raw IMU notify stream and fans each packet through a
 * fresh KneeSegmentProcessor (accel+gyro complementary filter), so callers
 * get a ready-to-use angle/accel/jerk sample instead of raw sensor axes.
 * One processor per subscription — starting a new exercise capture always
 * gets a clean angle-fusion state, not gyro-integration drift left over
 * from a previous, unrelated capture. Returns a stop function; there is no
 * on-device calibration to trigger (this firmware has no control/status
 * characteristics, notify-only) — calibration is entirely client-side, see
 * stepCounter.ts / squatCounter.ts.
 */
export function subscribeBleImuSamples(
  onSample: (sample: FusedImuSample) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!deviceId) {
    onError?.(new Error('Not connected to a sensor'));
    return () => {};
  }
  const id = deviceId;
  const processor = new KneeSegmentProcessor();

  BleClient.startNotifications(id, SERVICE_UUID, CHARACTERISTIC_UUID, (value) => {
    try {
      const reading = decodeImuCsvPayload(value);
      onSample(processor.update(reading));
    } catch (err) {
      console.warn('[ble] skipping malformed packet', err);
    }
  }).catch((err) => {
    console.error('[ble] failed to start streaming', err);
    onError?.(err);
  });

  return () => {
    BleClient.stopNotifications(id, SERVICE_UUID, CHARACTERISTIC_UUID).catch(() => {});
  };
}

/**
 * A SensorSource backed by the already-connected ESP32, for pages that only
 * need the angle stream (knee-extension capture — no live rep counting).
 * Single-sensor hardware (shin-mounted): the thigh is assumed to stay still
 * during seated knee extension (it rests on the chair), so its angle is
 * fixed at 0deg and knee angle reduces to |shinAngle - 0| = shinAngle in
 * motionAnalysis.ts. This assumption does NOT hold for sit-to-stand (the
 * thigh does most of that motion) — SitToStandPage uses
 * subscribeBleImuSamples directly instead, for the same reason it also
 * needs live squat counting.
 */
export function createBleSensorSource(): SensorSource {
  let stop: (() => void) | null = null;
  return {
    start(onSample: (sample: AngleSample) => void, onError?: (error: unknown) => void) {
      stop = subscribeBleImuSamples((sample) => {
        onSample({ t: sample.t, thighAngle: 0, shinAngle: sample.angleDeg });
      }, onError);
    },
    stop() {
      stop?.();
      stop = null;
    },
  };
}
