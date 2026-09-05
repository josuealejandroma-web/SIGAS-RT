#include "system_types.h"

namespace sigas {

const char *toString(ZoneLevel level) {
  switch (level) {
    case ZoneLevel::kNormal:
      return "NORMAL";
    case ZoneLevel::kWarning:
      return "WARNING";
    case ZoneLevel::kHigh:
      return "HIGH";
  }
  return "UNKNOWN";
}

const char *toString(RequestedAction action) {
  switch (action) {
    case RequestedAction::kNormal:
      return "NORMAL";
    case RequestedAction::kWarning:
      return "WARNING";
    case RequestedAction::kSafeClose:
      return "SAFE_CLOSE";
  }
  return "UNKNOWN";
}

const char *toString(SystemState state) {
  switch (state) {
    case SystemState::kStartup:
      return "SYSTEM_STARTUP";
    case SystemState::kNormal:
      return "SYSTEM_NORMAL";
    case SystemState::kWarning:
      return "SYSTEM_WARNING";
    case SystemState::kCritical:
      return "SYSTEM_CRITICAL";
    case SystemState::kSafeLatched:
      return "SYSTEM_SAFE_LATCHED";
    case SystemState::kFault:
      return "SYSTEM_FAULT";
  }
  return "UNKNOWN";
}

const char *toString(TransitionReason reason) {
  switch (reason) {
    case TransitionReason::kBoot:
      return "BOOT";
    case TransitionReason::kStableNormal:
      return "STABLE_NORMAL";
    case TransitionReason::kWarningLevel:
      return "WARNING_LEVEL";
    case TransitionReason::kCriticalCandidate:
      return "CRITICAL_CANDIDATE";
    case TransitionReason::kCriticalConfirmed:
      return "CRITICAL_CONFIRMED";
    case TransitionReason::kSafeCloseRequested:
      return "SAFE_CLOSE_REQUESTED";
    case TransitionReason::kSafeConditions:
      return "SAFE_CONDITIONS";
    case TransitionReason::kResetRequested:
      return "RESET_REQUESTED";
    case TransitionReason::kResetAccepted:
      return "RESET_ACCEPTED";
    case TransitionReason::kResetRejected:
      return "RESET_REJECTED";
    case TransitionReason::kSensorTimeout:
      return "SENSOR_TIMEOUT";
    case TransitionReason::kQueueFailure:
      return "QUEUE_FAILURE";
  }
  return "UNKNOWN";
}

}  // namespace sigas
