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

struct SensorSample {
  uint16_t adcZone1;
  uint16_t adcZone2;
  bool resetPressed;
  uint32_t timestampMs;
  uint32_t sequence;
};

struct SafetyDecision {
  ZoneLevel zone1Level;
  ZoneLevel zone2Level;
  RequestedAction requestedAction;
  uint32_t sampleTimestampMs;
  uint32_t decisionTimestampMs;
  uint32_t sequence;
};

struct ActuatorCommand {
  RequestedAction action;
  uint8_t valveAngle;
  bool buzzerOn;
  bool greenLedOn;
  bool redLedOn;
  uint32_t commandTimestampMs;
  uint32_t sequence;
};

const char *toString(ZoneLevel level);
const char *toString(RequestedAction action);

}  // namespace sigas

#endif  // SIGAS_RT_SYSTEM_TYPES_H
