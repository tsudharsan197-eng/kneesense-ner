// Shared contract between the ESP32 firmware (firmware/kneesense_esp32/kneesense_esp32.ino)
// and the app. Keep both sides in sync if you change this.

export const SERVICE_UUID = 'b5b2b8a0-0001-4f0a-9e0a-1a2b3c4d5e6f';
export const ANGLE_CHAR_UUID = 'b5b2b8a0-0002-4f0a-9e0a-1a2b3c4d5e6f';
export const CONTROL_CHAR_UUID = 'b5b2b8a0-0003-4f0a-9e0a-1a2b3c4d5e6f';

export const CONTROL_CMD = {
  CALIBRATE: 0x01,
  START_STREAMING: 0x02,
  STOP_STREAMING: 0x03,
} as const;

/**
 * Angle notify payload is 12 bytes, little-endian (ESP32/Xtensa is
 * little-endian): uint32 millis-since-boot, float32 thighAngle,
 * float32 shinAngle. Kept deliberately small — BLE's default ATT payload
 * is 20 bytes, and we don't want to depend on MTU negotiation succeeding.
 */
export function decodeAnglePayload(value: DataView): { t: number; thighAngle: number; shinAngle: number } {
  return {
    t: value.getUint32(0, true),
    thighAngle: value.getFloat32(4, true),
    shinAngle: value.getFloat32(8, true),
  };
}
