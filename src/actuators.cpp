#include "actuators.h"

#include <ESP32Servo.h>

#include "config.h"
#include "system_app.h"
#include "system_types.h"

#include <esp_timer.h>

namespace sigas {
namespace {

Servo valveServo;

void stopBuzzer(bool buzzerStarted);

void applyActuatorOutputs(uint8_t valveAngle, bool buzzerOn, bool greenLedOn,
                          bool redLedOn, bool &buzzerStarted) {
  valveServo.write(valveAngle);
  digitalWrite(PIN_LED_GREEN, greenLedOn ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, redLedOn ? HIGH : LOW);

  if (buzzerOn) {
    tone(PIN_BUZZER, 2000);
    buzzerStarted = true;
  } else {
    stopBuzzer(buzzerStarted);
  }
}

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
  bool buzzerStarted = false;
  applyActuatorOutputs(VALVE_CLOSED_ANGLE, false, false, true, buzzerStarted);
}

void applyBootSafeActuatorState(bool alarmOn) {
  bool buzzerStarted = false;
  applyActuatorOutputs(VALVE_CLOSED_ANGLE, alarmOn, false, true,
                       buzzerStarted);
}

void taskActuator(void *parameters) {
  auto *context = static_cast<ActuatorTaskContext *>(parameters);
  waitForSystemRuntimeActivation();
  ActuatorCommand command{};
  RequestedAction lastAction = RequestedAction::kNormal;
  bool hasCommand = false;
  bool buzzerStarted = false;
  uint64_t maxObservedExecutionUs = 0;

  Serial.println("[TASK][TaskActuator] CREATED");

  for (;;) {
    if (xQueueReceive(context->actuatorQueue, &command, portMAX_DELAY) !=
        pdTRUE) {
      continue;
    }

    const uint64_t receivedUs = static_cast<uint64_t>(esp_timer_get_time());
    command.actuatorReceivedTimestampUs = receivedUs;
    applyActuatorOutputs(command.valveAngle, command.buzzerOn,
                         command.greenLedOn, command.redLedOn, buzzerStarted);
    const uint64_t appliedUs = static_cast<uint64_t>(esp_timer_get_time());
    const uint64_t executionUs = appliedUs - receivedUs;
    if (!hasCommand || command.action != lastAction) {
      Serial.printf("[ACTUATOR] ACTION=%s VALVE=%s BUZZER=%s GREEN=%s RED=%s SEQ=%lu T_ACTUATOR_RECEIVED=%llu T_ACTUATOR_APPLIED=%llu\r\n",
                    toString(command.action),
                    command.valveAngle == VALVE_CLOSED_ANGLE ? "CLOSED"
                                                             : "OPEN",
                    command.buzzerOn ? "ON" : "OFF",
                    command.greenLedOn ? "ON" : "OFF",
                    command.redLedOn ? "ON" : "OFF",
                    static_cast<unsigned long>(command.sequence),
                    static_cast<unsigned long long>(receivedUs),
                    static_cast<unsigned long long>(appliedUs));
    }
    if ((!hasCommand || command.action != lastAction) &&
        command.action == RequestedAction::kSafeClose &&
        command.criticalConfirmedTimestampUs > 0) {
      const uint64_t confirmationUs =
          command.criticalConfirmedTimestampUs - command.firstHighTimestampUs;
      const uint64_t commandLatencyUs =
          command.commandSentTimestampUs -
          command.criticalConfirmedTimestampUs;
      const uint64_t dispatchLatencyUs =
          receivedUs - command.commandSentTimestampUs;
      const uint64_t applyLatencyUs = appliedUs - receivedUs;
      const uint64_t postConfirmationReceivedUs =
          receivedUs - command.criticalConfirmedTimestampUs;
      const uint64_t postConfirmationAppliedUs =
          appliedUs - command.criticalConfirmedTimestampUs;
      const uint64_t endToEndReceivedUs =
          receivedUs - command.firstHighTimestampUs;
      const uint64_t endToEndAppliedUs =
          appliedUs - command.firstHighTimestampUs;
      Serial.printf("[TIMING] SEQ=%lu T_FIRST_HIGH=%llu T_CRITICAL_CONFIRMED=%llu T_COMMAND_SENT=%llu T_ACTUATOR_RECEIVED=%llu T_ACTUATOR_APPLIED=%llu CONFIRMATION_US=%llu COMMAND_LATENCY_US=%llu DISPATCH_LATENCY_US=%llu ACTUATOR_APPLY_US=%llu POST_CONFIRMATION_RECEIVED_US=%llu POST_CONFIRMATION_APPLIED_US=%llu END_TO_END_RECEIVED_US=%llu END_TO_END_APPLIED_US=%llu DEADLINE_US=500000 RESULT=%s\r\n",
                    static_cast<unsigned long>(command.sequence),
                    static_cast<unsigned long long>(command.firstHighTimestampUs),
                    static_cast<unsigned long long>(
                        command.criticalConfirmedTimestampUs),
                    static_cast<unsigned long long>(
                        command.commandSentTimestampUs),
                    static_cast<unsigned long long>(receivedUs),
                    static_cast<unsigned long long>(appliedUs),
                    static_cast<unsigned long long>(confirmationUs),
                    static_cast<unsigned long long>(commandLatencyUs),
                    static_cast<unsigned long long>(dispatchLatencyUs),
                    static_cast<unsigned long long>(applyLatencyUs),
                    static_cast<unsigned long long>(
                        postConfirmationReceivedUs),
                    static_cast<unsigned long long>(postConfirmationAppliedUs),
                    static_cast<unsigned long long>(endToEndReceivedUs),
                    static_cast<unsigned long long>(endToEndAppliedUs),
                    postConfirmationReceivedUs <= 500000ULL ? "PASS" : "FAIL");
    }
    if (executionUs > maxObservedExecutionUs) {
      maxObservedExecutionUs = executionUs;
      Serial.printf("[WCET_OBSERVED] TASK=TaskActuator DURATION_US=%llu SEQ=%lu\r\n",
                    static_cast<unsigned long long>(executionUs),
                    static_cast<unsigned long>(command.sequence));
    }
    lastAction = command.action;
    hasCommand = true;
  }
}

}  // namespace sigas
