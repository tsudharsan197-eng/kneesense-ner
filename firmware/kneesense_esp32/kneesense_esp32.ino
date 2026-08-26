/*
  KneeSense NER — ESP32 firmware

  Two MPU6050 IMUs (thigh + shin) -> complementary filter -> knee angle
  stream over BLE. Matches the app-side protocol in src/lib/bleProtocol.ts —
  if you change UUIDs or the payload layout, update both sides.

  ---------------------------------------------------------------------
  WIRING
  ---------------------------------------------------------------------
  ESP32 3.3V   -> VCC of both MPU6050 sensors
  ESP32 GND    -> GND of both MPU6050 sensors, buzzer -, LED cathode(s),
                  transistor emitter, calibration button's pull-down leg
  ESP32 GPIO21 -> SDA of both MPU6050 sensors
  ESP32 GPIO22 -> SCL of both MPU6050 sensors

  Thigh MPU6050: AD0 -> GND   (I2C address 0x68)
  Shin  MPU6050: AD0 -> 3.3V  (I2C address 0x69)

  Calibration button: one leg -> 3.3V, other leg -> GPIO4 AND -> 10k
    resistor -> GND (external pull-down; button press reads HIGH)

  RGB LED (common cathode): R -> 220ohm -> GPIO25, G -> 220ohm -> GPIO26,
    B -> 220ohm -> GPIO27, cathode -> GND

  Active buzzer: + -> GPIO32, - -> GND

  Vibration motor (needs a transistor — never drive a motor from a GPIO
  directly): GPIO33 -> 1k resistor -> transistor base (2N2222/BC547) ->
    transistor emitter -> GND, transistor collector -> motor -,
    motor + -> 3.3V (or 5V from the power bank if the motor needs it),
    1N4001/1N4007 flyback diode across the motor terminals (cathode/banded
    end to motor +, anode to motor -) to protect the transistor from the
    motor's back-EMF when it switches off.

  ---------------------------------------------------------------------
  LIBRARIES (install via Arduino IDE Library Manager)
  ---------------------------------------------------------------------
  - Adafruit MPU6050
  - Adafruit Unified Sensor
  - Adafruit BusIO
  (ESP32's built-in BLE library — BLEDevice.h etc. — ships with the
  ESP32 board package, nothing extra to install for that part.)
*/

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---------------- Pins ----------------
const int PIN_SDA = 21;
const int PIN_SCL = 22;
const int PIN_CALIBRATE_BTN = 4;
const int PIN_LED_R = 25;
const int PIN_LED_G = 26;
const int PIN_LED_B = 27;
const int PIN_BUZZER = 32;
const int PIN_MOTOR = 33;

// ---------------- I2C addresses ----------------
const uint8_t THIGH_ADDR = 0x68; // AD0 -> GND
const uint8_t SHIN_ADDR  = 0x69; // AD0 -> 3.3V

// ---------------- BLE protocol (see src/lib/bleProtocol.ts) ----------------
#define SERVICE_UUID       "b5b2b8a0-0001-4f0a-9e0a-1a2b3c4d5e6f"
#define ANGLE_CHAR_UUID    "b5b2b8a0-0002-4f0a-9e0a-1a2b3c4d5e6f"
#define CONTROL_CHAR_UUID  "b5b2b8a0-0003-4f0a-9e0a-1a2b3c4d5e6f"

const uint8_t CMD_CALIBRATE       = 0x01;
const uint8_t CMD_START_STREAMING = 0x02;
const uint8_t CMD_STOP_STREAMING  = 0x03;

Adafruit_MPU6050 thighMpu;
Adafruit_MPU6050 shinMpu;
bool thighOk = false;
bool shinOk = false;

// Complementary-filter state. Angle convention matches the app's
// motionAnalysis.ts: this is orientation from vertical, in degrees — NOT
// knee flexion itself. The app computes knee angle as |shinAngle -
// thighAngle| on its side, from the raw thigh/shin values streamed here.
float thighAngle = 0, shinAngle = 0;
float thighGyroBiasRadS = 0, shinGyroBiasRadS = 0;
unsigned long lastSampleMicros = 0;

BLECharacteristic *angleChar;
BLECharacteristic *controlChar;
bool deviceConnected = false;
bool streaming = false;

// ---------------- Feedback helpers ----------------

void setColor(bool r, bool g, bool b) {
  digitalWrite(PIN_LED_R, r ? HIGH : LOW);
  digitalWrite(PIN_LED_G, g ? HIGH : LOW);
  digitalWrite(PIN_LED_B, b ? HIGH : LOW);
}

void beep(int ms) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(ms);
  digitalWrite(PIN_BUZZER, LOW);
}

void buzzVibrate(int ms) {
  digitalWrite(PIN_MOTOR, HIGH);
  delay(ms);
  digitalWrite(PIN_MOTOR, LOW);
}

// ---------------- Sensor math ----------------

// Pitch around the mediolateral (side-to-side) axis, from the
// accelerometer alone — noisy but drift-free. This is the axis a
// side-strapped sensor rotates around during knee flexion/extension.
// If your sensors are mounted with a different face outward, you may
// need to swap which accel axis feeds this (and the matching gyro axis
// below) — check with the calibration LED + a slow known motion.
float accelPitchDeg(sensors_event_t &a) {
  return atan2(a.acceleration.y, sqrt(a.acceleration.x * a.acceleration.x + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
}

// Calibrates while the leg is held still: takes the accelerometer's
// current reading as the zero reference for the complementary filter,
// and measures each gyro's stationary bias so it doesn't integrate a
// slow drift over a multi-minute screening session.
void calibrate() {
  setColor(true, false, false); // red = calibrating, don't move
  const int N = 100;
  float thighSum = 0, shinSum = 0;
  float thighGyroSum = 0, shinGyroSum = 0;

  for (int i = 0; i < N; i++) {
    sensors_event_t ta, tg, ttemp, sa, sg, stemp;
    thighMpu.getEvent(&ta, &tg, &ttemp);
    shinMpu.getEvent(&sa, &sg, &stemp);
    thighSum += accelPitchDeg(ta);
    shinSum  += accelPitchDeg(sa);
    thighGyroSum += tg.gyro.y;
    shinGyroSum  += sg.gyro.y;
    delay(10);
  }

  thighAngle = thighSum / N;
  shinAngle = shinSum / N;
  thighGyroBiasRadS = thighGyroSum / N;
  shinGyroBiasRadS = shinGyroSum / N;
  lastSampleMicros = micros();

  setColor(false, true, false); // green = calibrated / ready
  beep(150);
  buzzVibrate(150);
}

// ---------------- BLE callbacks ----------------

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    deviceConnected = true;
    setColor(false, false, true); // blue = connected
  }
  void onDisconnect(BLEServer *server) override {
    deviceConnected = false;
    streaming = false;
    setColor(false, true, false);
    server->getAdvertising()->start(); // resume advertising so the app can reconnect
  }
};

class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    std::string v = c->getValue();
    if (v.length() == 0) return;
    uint8_t cmd = (uint8_t)v[0];
    if (cmd == CMD_CALIBRATE) {
      calibrate();
    } else if (cmd == CMD_START_STREAMING) {
      streaming = true;
    } else if (cmd == CMD_STOP_STREAMING) {
      streaming = false;
    }
  }
};

void setupBle() {
  BLEDevice::init("KneeSense-NER");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);

  angleChar = service->createCharacteristic(ANGLE_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  angleChar->addDescriptor(new BLE2902());

  controlChar = service->createCharacteristic(CONTROL_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  controlChar->setCallbacks(new ControlCallbacks());

  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
}

// ---------------- Setup / loop ----------------

void setup() {
  Serial.begin(115200);
  Wire.begin(PIN_SDA, PIN_SCL);

  pinMode(PIN_CALIBRATE_BTN, INPUT); // external pull-down — see wiring notes
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_MOTOR, OUTPUT);
  setColor(false, false, true); // blue = starting up

  thighOk = thighMpu.begin(THIGH_ADDR);
  shinOk = shinMpu.begin(SHIN_ADDR);
  if (!thighOk) Serial.println("Thigh MPU6050 (0x68) not found — check wiring/AD0");
  if (!shinOk) Serial.println("Shin MPU6050 (0x69) not found — check wiring/AD0");

  if (!thighOk || !shinOk) {
    // Solid red = a sensor didn't respond. Fix wiring and reset the board.
    setColor(true, false, false);
  }

  for (Adafruit_MPU6050 *mpu : { &thighMpu, &shinMpu }) {
    mpu->setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu->setGyroRange(MPU6050_RANGE_500_DEG);
    mpu->setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  setupBle();

  if (thighOk && shinOk) {
    calibrate(); // initial calibration; re-run any time via the button or a BLE 0x01 command
  }
}

void loop() {
  static bool lastBtn = LOW;
  bool btn = digitalRead(PIN_CALIBRATE_BTN);
  if (btn == HIGH && lastBtn == LOW && thighOk && shinOk) {
    calibrate();
  }
  lastBtn = btn;

  if (!streaming || !deviceConnected || !thighOk || !shinOk) return;

  unsigned long now = micros();
  float dt = (now - lastSampleMicros) / 1000000.0;
  if (dt < 0.02) return; // ~50 Hz cap
  lastSampleMicros = now;

  sensors_event_t ta, tg, ttemp, sa, sg, stemp;
  thighMpu.getEvent(&ta, &tg, &ttemp);
  shinMpu.getEvent(&sa, &sg, &stemp);

  float thighAccelAngle = accelPitchDeg(ta);
  float shinAccelAngle = accelPitchDeg(sa);

  // Complementary filter: mostly trust the integrated (bias-corrected)
  // gyro rate for smooth, low-latency motion, and slowly pull toward the
  // accelerometer's absolute (but noisy) reading so the estimate can't
  // drift indefinitely. 0.98 is a common starting point for a ~50 Hz loop
  // — raise it for smoother-but-slower drift correction, lower it if the
  // angle visibly drifts during a long capture.
  const float ALPHA = 0.98;
  thighAngle = ALPHA * (thighAngle + (tg.gyro.y - thighGyroBiasRadS) * dt * 180.0 / PI) + (1 - ALPHA) * thighAccelAngle;
  shinAngle  = ALPHA * (shinAngle  + (sg.gyro.y - shinGyroBiasRadS) * dt * 180.0 / PI) + (1 - ALPHA) * shinAccelAngle;

  uint8_t payload[12];
  uint32_t t = millis();
  memcpy(payload, &t, 4);
  memcpy(payload + 4, &thighAngle, 4);
  memcpy(payload + 8, &shinAngle, 4);
  angleChar->setValue(payload, 12);
  angleChar->notify();
}
