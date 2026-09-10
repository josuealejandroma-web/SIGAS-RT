#include "safety.h"

#include <esp_timer.h>

#include "actuator_policy.h"
#include "config.h"
#include "critical_timing.h"
#include "fail_safe_policy.h"
#include "safety_sample_policy.h"
#include "system_app.h"
#include "system_types.h"

namespace sigas {
namespace {

struct SafetyRuntime {
  SystemState state = SystemState::kStartup;
  ZoneLevel zone1Level = ZoneLevel::kNormal;
  ZoneLevel zone2Level = ZoneLevel::kNormal;
  uint8_t highCountZone1 = 0;
  uint8_t highCountZone2 = 0;
  uint64_t candidateStartZone1 = 0;
  uint64_t candidateStartZone2 = 0;
  uint8_t startupSafeSamples = 0;
  FailSafeRecovery recovery{SAFE_RESET_CONFIRMATION_SAMPLES,
                            RESET_DEBOUNCE_SAMPLES};
  bool safeConditionsLogged = false;
  uint64_t firstHighTimestampUs = 0;
  uint64_t criticalConfirmedTimestampUs = 0;
  uint64_t commandSentTimestampUs = 0;
  uint64_t lastSampleTimestampUs = 0;
  uint64_t taskStartTimestampUs = 0;
  uint32_t lastAcceptedSequence = 0;
  bool hasAcceptedSequence = false;
};

bool isSafeAdc(uint16_t adcRaw) {
  return adcRaw < ADC_SAFE_EXIT_SIMULATION_ONLY;
}

bool bothZonesSafe(const SensorSample &sample) {
  return isSafeAdc(sample.adcZone1) && isSafeAdc(sample.adcZone2);
}

bool criticalConfirmed(const SafetyRuntime &runtime) {
  return criticalCandidateConfirmed(runtime.highCountZone1,
                                    CRITICAL_CONFIRMATION_SAMPLES) ||
         criticalCandidateConfirmed(runtime.highCountZone2,
                                    CRITICAL_CONFIRMATION_SAMPLES);
}

RequestedAction actionForState(SystemState state) {
  if (requiresSafeClose(state)) {
    return RequestedAction::kSafeClose;
  }
  if (state == SystemState::kWarning) {
    return RequestedAction::kWarning;
  }
  return RequestedAction::kNormal;
}

ActuatorCommand buildActuatorCommand(const SafetyDecision &decision) {
  return ActuatorCommand{decision.requestedAction,
                         decision.commandedValveAngle,
                         decision.commandedBuzzerOn,
                         decision.commandedGreenLedOn,
                         decision.commandedRedLedOn,
                         decision.commandSentTimestampUs,
                         decision.firstHighTimestampUs,
                         decision.criticalConfirmedTimestampUs,
                         0,
                         decision.sequence};
}

void logStateTransition(SystemState from, SystemState to,
                        TransitionReason reason) {
  if (from != to) {
    Serial.printf("[STATE] %s -> %s REASON=%s\r\n", toString(from),
                  toString(to), toString(reason));
  }
}

void publishDecision(SafetyTaskContext *context, const SensorSample &sample,
                     SafetyRuntime &runtime, TransitionReason reason) {
  const RequestedAction action = actionForState(runtime.state);
  const ActuatorOutputs outputs =
      outputsForAction(action, VALVE_OPEN_ANGLE, VALVE_CLOSED_ANGLE);
  SafetyDecision decision{
      runtime.state,
      runtime.zone1Level,
      runtime.zone2Level,
      action,
      reason,
      outputs.valveAngle,
      outputs.buzzerOn,
      outputs.greenLedOn,
      outputs.redLedOn,
      sample.timestampUs,
      static_cast<uint64_t>(esp_timer_get_time()),
      runtime.firstHighTimestampUs,
      runtime.criticalConfirmedTimestampUs,
      0,
      sample.sequence,
  };

  ActuatorCommand command = buildActuatorCommand(decision);
  const uint64_t commandSentUs =
      static_cast<uint64_t>(esp_timer_get_time());
  stampCommandPublication(decision, command, commandSentUs);
  const BaseType_t publishResult =
      xQueueOverwrite(context->actuatorQueue, &command);
  if (publishResult == pdPASS && action == RequestedAction::kSafeClose &&
      runtime.criticalConfirmedTimestampUs > 0 &&
      runtime.commandSentTimestampUs == 0) {
    runtime.commandSentTimestampUs = commandSentUs;
    Serial.printf("[SAFETY] T_COMMAND_SENT=%llu\r\n",
                  static_cast<unsigned long long>(
                      runtime.commandSentTimestampUs));
  }
  xQueueOverwrite(context->diagnosticsDecisionQueue, &decision);
}

void enterCriticalThenLatch(SafetyRuntime &runtime, TransitionReason &reason) {
  const SystemState previous = runtime.state;
  runtime.state = SystemState::kCritical;
  runtime.firstHighTimestampUs = selectConfirmedCandidateStart(
      runtime.highCountZone1, runtime.candidateStartZone1,
      runtime.highCountZone2, runtime.candidateStartZone2,
      CRITICAL_CONFIRMATION_SAMPLES);
  runtime.criticalConfirmedTimestampUs =
      static_cast<uint64_t>(esp_timer_get_time());
  reason = TransitionReason::kCriticalConfirmed;

  Serial.printf("[SAFETY] HIGH confirmed z1=%u/%u z2=%u/%u\r\n",
                runtime.highCountZone1, CRITICAL_CONFIRMATION_SAMPLES,
                runtime.highCountZone2, CRITICAL_CONFIRMATION_SAMPLES);
  Serial.printf("[SAFETY] T_FIRST_HIGH=%llu\r\n",
                static_cast<unsigned long long>(
                    runtime.firstHighTimestampUs));
  Serial.printf("[SAFETY] T_CRITICAL_CONFIRMED=%llu\r\n",
                static_cast<unsigned long long>(
                    runtime.criticalConfirmedTimestampUs));
  Serial.println("[SAFETY] SAFE_CLOSE requested");
  logStateTransition(previous, runtime.state, reason);

  runtime.state = SystemState::kSafeLatched;
  runtime.recovery.enterFailSafe();
  runtime.safeConditionsLogged = false;
  logStateTransition(SystemState::kCritical, runtime.state,
                     TransitionReason::kSafeCloseRequested);
}

void clearCriticalHistory(SafetyRuntime &runtime) {
  resetCriticalCandidates(runtime.highCountZone1,
                          runtime.candidateStartZone1,
                          runtime.highCountZone2,
                          runtime.candidateStartZone2);
  runtime.firstHighTimestampUs = 0;
  runtime.criticalConfirmedTimestampUs = 0;
  runtime.commandSentTimestampUs = 0;
  runtime.safeConditionsLogged = false;
}

void updateFailSafeRecovery(SafetyRuntime &runtime,
                            const SensorSample &sample,
                            TransitionReason &reason) {
  const bool zonesSafe = bothZonesSafe(sample);
  const RearmResult rearm =
      runtime.recovery.observe(zonesSafe, sample.resetPressed);

  if (!zonesSafe) {
    runtime.safeConditionsLogged = false;
  } else if (runtime.recovery.safeConditionsConfirmed() &&
             !runtime.safeConditionsLogged) {
    Serial.println("[SAFETY] conditions safe");
    runtime.safeConditionsLogged = true;
  }

  if (rearm == RearmResult::kNone) {
    return;
  }

  Serial.println("[RESET] requested");
  if (rearm == RearmResult::kAccepted) {
    const SystemState previous = runtime.state;
    runtime.state = stateAfterRearm(runtime.state, rearm);
    clearCriticalHistory(runtime);
    reason = TransitionReason::kResetAccepted;
    Serial.println("[RESET] conditions verified SAFE");
    logStateTransition(previous, runtime.state, reason);
    return;
  }

  reason = TransitionReason::kResetRejected;
  Serial.println("[RESET] rejected unsafe conditions");
  Serial.printf("[STATE] remains %s\r\n", toString(runtime.state));
}

void updateStateFromSample(SafetyRuntime &runtime, const SensorSample &sample,
                           TransitionReason &reason) {
  runtime.zone1Level = classifyZoneWithHysteresis(
      sample.adcZone1, runtime.zone1Level,
      ADC_WARNING_ENTER_SIMULATION_ONLY,
      ADC_WARNING_EXIT_SIMULATION_ONLY,
      ADC_CRITICAL_SIMULATION_ONLY);
  runtime.zone2Level = classifyZoneWithHysteresis(
      sample.adcZone2, runtime.zone2Level,
      ADC_WARNING_ENTER_SIMULATION_ONLY,
      ADC_WARNING_EXIT_SIMULATION_ONLY,
      ADC_CRITICAL_SIMULATION_ONLY);

  updateCriticalCandidate(
      runtime.highCountZone1, runtime.candidateStartZone1,
      runtime.zone1Level == ZoneLevel::kHigh, sample.timestampUs,
      CRITICAL_CONFIRMATION_SAMPLES);
  updateCriticalCandidate(
      runtime.highCountZone2, runtime.candidateStartZone2,
      runtime.zone2Level == ZoneLevel::kHigh, sample.timestampUs,
      CRITICAL_CONFIRMATION_SAMPLES);

  if (requiresManualRearm(runtime.state)) {
    updateFailSafeRecovery(runtime, sample, reason);
    return;
  }

  if (criticalConfirmed(runtime)) {
    enterCriticalThenLatch(runtime, reason);
    return;
  }

  if (runtime.state == SystemState::kStartup) {
    if (bothZonesSafe(sample)) {
      if (runtime.startupSafeSamples < SAFE_RESET_CONFIRMATION_SAMPLES) {
        ++runtime.startupSafeSamples;
      }
    } else {
      runtime.startupSafeSamples = 0;
    }

    if (runtime.startupSafeSamples >= SAFE_RESET_CONFIRMATION_SAMPLES) {
      const SystemState previous = runtime.state;
      runtime.state = SystemState::kNormal;
      reason = TransitionReason::kStableNormal;
      logStateTransition(previous, runtime.state, reason);
    } else {
      reason = TransitionReason::kBoot;
    }
    return;
  }

  const bool elevated = runtime.zone1Level != ZoneLevel::kNormal ||
                        runtime.zone2Level != ZoneLevel::kNormal;
  const SystemState previous = runtime.state;
  runtime.state = elevated ? SystemState::kWarning : SystemState::kNormal;
  reason = elevated ? TransitionReason::kWarningLevel
                    : TransitionReason::kStableNormal;
  logStateTransition(previous, runtime.state, reason);

  if (runtime.zone1Level == ZoneLevel::kHigh ||
      runtime.zone2Level == ZoneLevel::kHigh) {
    Serial.printf("[SAFETY] HIGH candidate z1=%u/%u z2=%u/%u\r\n",
                  runtime.highCountZone1, CRITICAL_CONFIRMATION_SAMPLES,
                  runtime.highCountZone2, CRITICAL_CONFIRMATION_SAMPLES);
  }
}

void enterSensorFault(SafetyTaskContext *context, SafetyRuntime &runtime,
                      const SensorSample &sample, TransitionReason reason,
                      const char *diagnostic) {
  if (runtime.state == SystemState::kFault) {
    return;
  }

  const SystemState previous = runtime.state;
  runtime.state = stateAfterSensorTimeout(runtime.state);
  runtime.recovery.enterFailSafe();
  runtime.safeConditionsLogged = false;
  Serial.println(diagnostic);
  logStateTransition(previous, runtime.state, reason);
  publishDecision(context, sample, runtime, reason);
}

void handleSensorTimeout(SafetyTaskContext *context, SafetyRuntime &runtime,
                         uint32_t sequence) {
  if (runtime.state == SystemState::kFault) {
    return;
  }

  const uint64_t nowUs = static_cast<uint64_t>(esp_timer_get_time());
  if (runtime.lastSampleTimestampUs == 0) {
    if (nowUs - runtime.taskStartTimestampUs < INITIAL_SENSOR_TIMEOUT_US) {
      return;
    }
  } else if (nowUs - runtime.lastSampleTimestampUs < SENSOR_DATA_TIMEOUT_US) {
    return;
  }

  SensorSample syntheticSample{0, 0, false, nowUs, sequence};
  enterSensorFault(context, runtime, syntheticSample,
                   TransitionReason::kSensorTimeout,
                   "[FAULT] SENSOR_DATA_TIMEOUT");
}

void enforceSequenceContinuity(SafetyRuntime &runtime,
                               uint32_t currentSequence) {
  if (runtime.hasAcceptedSequence &&
      !isConsecutiveSequence(runtime.lastAcceptedSequence,
                             currentSequence)) {
    Serial.printf("[SAFETY] SEQUENCE_GAP previous=%lu current=%lu; candidates reset\r\n",
                  static_cast<unsigned long>(runtime.lastAcceptedSequence),
                  static_cast<unsigned long>(currentSequence));
    resetCriticalCandidates(runtime.highCountZone1,
                            runtime.candidateStartZone1,
                            runtime.highCountZone2,
                            runtime.candidateStartZone2);
  }
  runtime.lastAcceptedSequence = currentSequence;
  runtime.hasAcceptedSequence = true;
}

}  // namespace

void taskSafety(void *parameters) {
  auto *context = static_cast<SafetyTaskContext *>(parameters);
  waitForSystemRuntimeActivation();
  SensorSample sample{};
  SafetyRuntime runtime{};
  uint64_t maxObservedExecutionUs = 0;
  runtime.taskStartTimestampUs = static_cast<uint64_t>(esp_timer_get_time());

  Serial.println("[TASK][TaskSafety] CREATED");

  for (;;) {
    if (xQueueReceive(context->sensorQueue, &sample, SAFETY_QUEUE_TIMEOUT) !=
        pdTRUE) {
      handleSensorTimeout(context, runtime, sample.sequence);
      continue;
    }

    const uint64_t receivedUs = static_cast<uint64_t>(esp_timer_get_time());
    if (!isFreshSample(receivedUs, sample.timestampUs,
                       SENSOR_DATA_TIMEOUT_US)) {
      Serial.printf("[SAFETY] stale sample rejected SEQ=%lu SAMPLE_T_US=%llu NOW_US=%llu\r\n",
                    static_cast<unsigned long>(sample.sequence),
                    static_cast<unsigned long long>(sample.timestampUs),
                    static_cast<unsigned long long>(receivedUs));
      enterSensorFault(context, runtime, sample,
                       TransitionReason::kStaleSample,
                       "[FAULT] SENSOR_DATA_STALE");
      continue;
    }

    runtime.lastSampleTimestampUs = sample.timestampUs;
    enforceSequenceContinuity(runtime, sample.sequence);
    TransitionReason reason = TransitionReason::kStableNormal;

    const uint64_t taskStartUs = static_cast<uint64_t>(esp_timer_get_time());
    updateStateFromSample(runtime, sample, reason);
    publishDecision(context, sample, runtime, reason);
    const uint64_t taskEndUs = static_cast<uint64_t>(esp_timer_get_time());
    const uint64_t executionUs = taskEndUs - taskStartUs;
    if (executionUs > maxObservedExecutionUs) {
      maxObservedExecutionUs = executionUs;
      Serial.printf("[WCET_OBSERVED] TASK=TaskSafety DURATION_US=%llu SEQ=%lu\r\n",
                    static_cast<unsigned long long>(executionUs),
                    static_cast<unsigned long>(sample.sequence));
    }
  }
}

}  // namespace sigas
