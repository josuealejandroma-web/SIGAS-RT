#include "actuators.h"

#include <ESP32Servo.h>

#include "config.h"
#include "system_types.h"

#include <esp_timer.h>

namespace sigas {
namespace {

Servo valveServo;

void stopBuzzer(bool buzzerStarted) {
  if (buzzerStarted) {
    noTone(PIN_BUZZER);
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
}

}  // namespace

void configureActuatorOutputs() {
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  valveServo.setPeriodHertz(50);
  valveServo.attach(PIN_VALVE_SERVO, 500, 2400);
  valveServo.write(VALVE_OPEN_ANGLE);
}

void taskActuator(void *parameters) {
  auto *context = static_cast<ActuatorTaskContext *>(parameters);
  ActuatorCommand command{};
  RequestedAction lastAction = RequestedAction::kNormal;
  bool hasCommand = false;
  bool buzzerStarted = false;

  Serial.println("[TASK][TaskActuator] CREATED");

  for (;;) {
    if (xQueueReceive(context->actuatorQueue, &command, portMAX_DELAY) !=
        pdTRUE) {
      continue;
    }

    valveServo.write(command.valveAngle);
    digitalWrite(PIN_LED_GREEN, command.greenLedOn ? HIGH : LOW);
    digitalWrite(PIN_LED_RED, command.redLedOn ? HIGH : LOW);

    if (command.buzzerOn) {
      tone(PIN_BUZZER, 2000);
      buzzerStarted = true;
    } else {
      stopBuzzer(buzzerStarted);
    }

    const uint64_t receivedUs = static_cast<uint64_t>(esp_timer_get_time());
    if (!hasCommand || command.action != lastAction) {
      Serial.printf("[ACTUATOR] ACTION=%s VALVE=%s BUZZER=%s GREEN=%s RED=%s SEQ=%lu T_ACTUATOR_RECEIVED=%llu\r\n",
                    toString(command.action),
                    command.valveAngle == VALVE_CLOSED_ANGLE ? "CLOSED"
                                                             : "OPEN",
                    command.buzzerOn ? "ON" : "OFF",
                    command.greenLedOn ? "ON" : "OFF",
                    command.redLedOn ? "ON" : "OFF",
                    static_cast<unsigned long>(command.sequence),
                    static_cast<unsigned long long>(receivedUs));
    }
    lastAction = command.action;
    hasCommand = true;
  }
}

}  // namespace sigas
