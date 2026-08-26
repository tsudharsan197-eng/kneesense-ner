# KneeSense NER — ESP32 firmware

Streams thigh/shin orientation angles over BLE to the app. See the wiring diagram and pin notes at the top of [`kneesense_esp32/kneesense_esp32.ino`](kneesense_esp32/kneesense_esp32.ino) — that file is the source of truth for wiring, not this README.

**Not compiled/flashed in this session** — there's no Arduino toolchain available here, so this needs to be verified on your machine before trusting it on real hardware.

## Setup (Arduino IDE)

1. **Board support**: File → Preferences → Additional Boards Manager URLs → add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`, then Tools → Board → Boards Manager → install **esp32** (Espressif Systems).
2. **Board selection**: Tools → Board → ESP32 Arduino → **ESP32 Dev Module** (or your specific board if different).
3. **Libraries** (Sketch → Include Library → Manage Libraries): install
   - `Adafruit MPU6050`
   - `Adafruit Unified Sensor`
   - `Adafruit BusIO`

   (The ESP32 BLE library — `BLEDevice.h` etc. — ships with the esp32 board package, nothing extra to install there.)
4. Wire everything per the comment block at the top of the `.ino` file.
5. Upload, then open the Serial Monitor at **115200 baud** — it'll print an error if a sensor isn't found at its expected I2C address (a wiring/AD0 check).

## Expected LED behavior

- **Blue** — booting
- **Solid red** (stays on) — a sensor didn't respond at startup; check wiring/AD0 before continuing
- **Red, briefly** — calibrating (keep the leg still)
- **Green** — calibrated and idle
- **Blue, solid** — a phone/app is connected over BLE

## Testing without the app

The Serial Monitor only prints sensor-not-found errors right now. To sanity-check the IMU readings independently before involving BLE at all, temporarily add `Serial.print`/`println` calls for `thighAngle`/`shinAngle` in `loop()` — that's the fastest way to confirm the complementary filter looks reasonable (near 0 when a segment is vertical, changing smoothly as you tilt it) before debugging anything at the BLE layer.

## Protocol

Matches [`src/lib/bleProtocol.ts`](../src/lib/bleProtocol.ts) exactly — if you change UUIDs, the control command bytes, or the angle payload layout on either side, update both.

- Service UUID `b5b2b8a0-0001-4f0a-9e0a-1a2b3c4d5e6f`
- Angle characteristic (notify, 12 bytes, little-endian): `uint32 millis`, `float32 thighAngle`, `float32 shinAngle`
- Control characteristic (write, 1 byte): `0x01` calibrate, `0x02` start streaming, `0x03` stop streaming

## Known limitation: accelerometer axis assumption

`accelPitchDeg()` assumes a specific sensor-mounting orientation (see the comment above it in the `.ino`). If the calibration LED goes green but the angle doesn't change sensibly as you move the leg, the sensor is very likely mounted with a different face outward than assumed — swap which accelerometer axis (and the matching gyro axis, `tg.gyro.y`/`sg.gyro.y`) feeds the calculation.
