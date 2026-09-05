#ifndef SIGAS_RT_SYSTEM_TYPES_H
#define SIGAS_RT_SYSTEM_TYPES_H

#include <Arduino.h>

namespace sigas {

enum class ZoneLevel : uint8_t {
  kNormal,
  kWarning,
  kHigh,
};

enum class RequestedAction : uint8_t {
  kNormal,
  kWarning,
  kSafeClose,
};

enum class SystemState : uint8_t {
  kStartup,
  kNormal,
  kWarning,
  kCritical,
  kSafeLatched,
  kFault,
};

enum class TransitionReason : uint8_t {
  kBoot,
  kStableNormal,
  kWarningLevel,
  kCriticalCandidate,
  kCriticalConfirmed,
  kSafeCloseRequested,
  kSafeConditions,
  kResetRequested,
  kResetAccepted,
  kResetRejected,
  kSensorTimeout,
  kQueueFailure,
};

struct SensorSample {
  uint16_t adcZone1;
  uint16_t adcZone2;
  bool resetPressed;
  uint64_t timestampUs;
  uint32_t sequence;
};

struct SafetyDecision {
  SystemState systemState;
  ZoneLevel zone1Level;
  ZoneLevel zone2Level;
  RequestedAction requestedAction;
  TransitionReason reason;
  uint64_t sampleTimestampUs;
  uint64_t decisionTimestampUs;
  uint64_t firstHighTimestampUs;
  uint64_t criticalConfirmedTimestampUs;
  uint64_t commandSentTimestampUs;
  uint32_t sequence;
};

struct ActuatorCommand {
  RequestedAction action;
  uint8_t valveAngle;
  bool buzzerOn;
  bool greenLedOn;
  bool redLedOn;
  uint64_t commandTimestampUs;
  uint64_t firstHighTimestampUs;
  uint64_t criticalConfirmedTimestampUs;
  uint64_t actuatorReceivedTimestampUs;
  uint32_t sequence;
};

const char *toString(ZoneLevel level);
const char *toString(RequestedAction action);
const char *toString(SystemState state);
const char *toString(TransitionReason reason);

}  // namespace sigas

#endif  // SIGAS_RT_SYSTEM_TYPES_H
