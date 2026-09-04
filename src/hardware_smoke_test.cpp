#include "hardware_smoke_test.h"

#include <Arduino.h>
#include <ESP32Servo.h>

#include "config.h"

namespace sigas {
namespace {

Servo valveServo;

enum class AdcLevel : uint8_t {
  kLow,
  kMedium,
  kHigh,
};

struct SensorState {
  uint8_t pin;
  const char *tag;
};

SensorState sensorZone1{PIN_MQ2_ZONE_1_ADC, "[HW-TEST][MQ2-Z1]"};
SensorState sensorZone2{PIN_MQ2_ZONE_2_ADC, "[HW-TEST][MQ2-Z2]"};

AdcLevel classifyAdcLevel(uint16_t adcRaw) {
  if (adcRaw < 1365) {
    return AdcLevel::kLow;
  }
  if (adcRaw < 2730) {
    return AdcLevel::kMedium;
  }
  return AdcLevel::kHigh;
}

const char *levelText(AdcLevel level) {
  switch (level) {
    case AdcLevel::kLow:
      return "LOW";
    case AdcLevel::kMedium:
      return "MEDIUM";
    case AdcLevel::kHigh:
      return "HIGH";
  }
  return "UNKNOWN";
}

void printAdcReading(const SensorState &sensor) {
  const uint16_t adcRaw = analogRead(sensor.pin);
  const AdcLevel level = classifyAdcLevel(adcRaw);

  Serial.printf("%s ADC_RAW=%u LEVEL=%s T=%lu\r\n", sensor.tag, adcRaw,
                levelText(level), static_cast<unsigned long>(millis()));
}

void taskSensorSmokeTest(void *parameters) {
  (void)parameters;
  TickType_t lastWake = xTaskGetTickCount();

  for (;;) {
    printAdcReading(sensorZone1);
    printAdcReading(sensorZone2);
    vTaskDelayUntil(&lastWake, SENSOR_TEST_PERIOD);
  }
}

void taskActuatorSmokeTest(void *parameters) {
  (void)parameters;
  TickType_t lastWake = xTaskGetTickCount();
  bool openPhase = true;
  bool buzzerStarted = false;

  for (;;) {
    if (openPhase) {
      valveServo.write(VALVE_OPEN_ANGLE);
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
      if (buzzerStarted) {
        noTone(PIN_BUZZER);
      } else {
        digitalWrite(PIN_BUZZER, LOW);
      }

      Serial.println("[HW-TEST][VALVE] OPEN");
      Serial.println("[HW-TEST][LED-GREEN] OK");
      Serial.println("[HW-TEST][BUZZER] OFF");
    } else {
      valveServo.write(VALVE_CLOSED_ANGLE);
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_RED, HIGH);
      tone(PIN_BUZZER, 2000);
      buzzerStarted = true;

      Serial.println("[HW-TEST][VALVE] CLOSED");
      Serial.println("[HW-TEST][LED-RED] OK");
      Serial.println("[HW-TEST][BUZZER] ON");
    }

    openPhase = !openPhase;
    vTaskDelayUntil(&lastWake, ACTUATOR_TEST_PERIOD);
  }
}

void taskResetButtonSmokeTest(void *parameters) {
  (void)parameters;
  TickType_t lastWake = xTaskGetTickCount();
  bool lastPressed = digitalRead(PIN_RESET_BUTTON) == LOW;

  Serial.printf("[HW-TEST][RESET] %s\r\n",
                lastPressed ? "PRESSED" : "RELEASED");

  for (;;) {
    const bool pressed = digitalRead(PIN_RESET_BUTTON) == LOW;
    if (pressed != lastPressed) {
      Serial.printf("[HW-TEST][RESET] %s\r\n",
                    pressed ? "PRESSED" : "RELEASED");
      lastPressed = pressed;
    }
    vTaskDelayUntil(&lastWake, RESET_TEST_PERIOD);
  }
}

void configurePins() {
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2_ZONE_1_ADC, ADC_11db);
  analogSetPinAttenuation(PIN_MQ2_ZONE_2_ADC, ADC_11db);

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RESET_BUTTON, INPUT_PULLUP);

  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  valveServo.setPeriodHertz(50);
  valveServo.attach(PIN_VALVE_SERVO, 500, 2400);
  valveServo.write(VALVE_OPEN_ANGLE);
}

}  // namespace

void setupHardwareSmokeTest() {
  Serial.begin(115200);
  delay(1000);

  configurePins();

  Serial.println("[BOOT][SIGAS-RT] Hardware smoke test iniciado");
  Serial.println("[BOOT][SIGAS-RT] Prototipo academico simulado, no certificado");
  Serial.println("[BOOT][SIGAS-RT] Flujo: Sensor analogico -> ADC -> ESP32 -> PWM/Digital -> Actuador");

  xTaskCreatePinnedToCore(taskSensorSmokeTest, "TaskSensorHW", 4096, nullptr,
                          SENSOR_TEST_PRIORITY, nullptr, 1);
  xTaskCreatePinnedToCore(taskActuatorSmokeTest, "TaskActuatorHW", 4096,
                          nullptr, ACTUATOR_TEST_PRIORITY, nullptr, 1);
  xTaskCreatePinnedToCore(taskResetButtonSmokeTest, "TaskResetHW", 4096,
                          nullptr, RESET_TEST_PRIORITY, nullptr, 1);
}

}  // namespace sigas
