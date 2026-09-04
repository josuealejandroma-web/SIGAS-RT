#include "safety.h"

#include "config.h"
#include "system_types.h"

namespace sigas {
namespace {

ZoneLevel classifyZone(uint16_t adcRaw) {
  if (adcRaw >= ADC_HIGH_THRESHOLD_SIMULATION_ONLY) {
    return ZoneLevel::kHigh;
  }
  if (adcRaw >= ADC_WARNING_THRESHOLD_SIMULATION_ONLY) {
    return ZoneLevel::kWarning;
  }
  return ZoneLevel::kNormal;
}

RequestedAction selectAction(ZoneLevel zone1Level, ZoneLevel zone2Level,
                             bool closeLatched) {
  if (closeLatched) {
    return RequestedAction::kSafeClose;
  }

  if (zone1Level == ZoneLevel::kHigh || zone2Level == ZoneLevel::kHigh) {
    return RequestedAction::kSafeClose;
  }
  if (zone1Level == ZoneLevel::kWarning ||
      zone2Level == ZoneLevel::kWarning) {
    return RequestedAction::kWarning;
  }
  return RequestedAction::kNormal;
}

ActuatorCommand buildActuatorCommand(const SafetyDecision &decision) {
  const RequestedAction action = decision.requestedAction;

  if (action == RequestedAction::kSafeClose) {
    return ActuatorCommand{action, VALVE_CLOSED_ANGLE, true, false, true,
                           millis(), decision.sequence};
  }

  if (action == RequestedAction::kWarning) {
    return ActuatorCommand{action, VALVE_OPEN_ANGLE, false, true, true,
                           millis(), decision.sequence};
  }

  return ActuatorCommand{action, VALVE_OPEN_ANGLE, false, true, false,
                         millis(), decision.sequence};
}

}  // namespace

void taskSafety(void *parameters) {
  auto *context = static_cast<SafetyTaskContext *>(parameters);
  SensorSample sample{};
  bool closeLatchedSimulationOnly = false;

  Serial.println("[TASK][TaskSafety] CREATED");

  for (;;) {
    if (xQueueReceive(context->sensorQueue, &sample, SAFETY_QUEUE_TIMEOUT) !=
        pdTRUE) {
      continue;
    }

    SafetyDecision decision{
        classifyZone(sample.adcZone1),
        classifyZone(sample.adcZone2),
        RequestedAction::kNormal,
        sample.timestampMs,
        millis(),
        sample.sequence,
    };
    if (decision.zone1Level == ZoneLevel::kHigh ||
        decision.zone2Level == ZoneLevel::kHigh) {
      closeLatchedSimulationOnly = true;
    }

    decision.requestedAction = selectAction(
        decision.zone1Level, decision.zone2Level, closeLatchedSimulationOnly);

    ActuatorCommand command = buildActuatorCommand(decision);
    xQueueOverwrite(context->actuatorQueue, &command);
    xQueueOverwrite(context->diagnosticsDecisionQueue, &decision);

    if (sample.resetPressed) {
      Serial.printf("[RESET] PRESSED SEQ=%lu\r\n",
                    static_cast<unsigned long>(sample.sequence));
    }
  }
}

}  // namespace sigas
