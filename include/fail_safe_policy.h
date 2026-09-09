#ifndef SIGAS_RT_FAIL_SAFE_POLICY_H
#define SIGAS_RT_FAIL_SAFE_POLICY_H

#include <stdint.h>

#include "system_types.h"

namespace sigas {

enum class RearmResult : uint8_t {
  kNone,
  kRejected,
  kAccepted,
};

class FailSafeRecovery {
 public:
  FailSafeRecovery(uint8_t requiredSafeSamples,
                   uint8_t requiredResetSamples)
      : requiredSafeSamples_(requiredSafeSamples),
        requiredResetSamples_(requiredResetSamples) {}

  void enterFailSafe() {
    safeSamples_ = 0;
    resetStableSamples_ = 0;
    resetReleaseObserved_ = false;
  }

  RearmResult observe(bool bothZonesSafe, bool resetPressed) {
    if (bothZonesSafe) {
      if (safeSamples_ < requiredSafeSamples_) {
        ++safeSamples_;
      }
    } else {
      safeSamples_ = 0;
    }

    if (!resetPressed) {
      resetStableSamples_ = 0;
      resetReleaseObserved_ = true;
      return RearmResult::kNone;
    }

    if (resetStableSamples_ < requiredResetSamples_) {
      ++resetStableSamples_;
    }
    if (!resetReleaseObserved_ ||
        resetStableSamples_ < requiredResetSamples_) {
      return RearmResult::kNone;
    }

    resetReleaseObserved_ = false;
    resetStableSamples_ = 0;
    return safeConditionsConfirmed() ? RearmResult::kAccepted
                                     : RearmResult::kRejected;
  }

  bool safeConditionsConfirmed() const {
    return safeSamples_ >= requiredSafeSamples_;
  }

 private:
  const uint8_t requiredSafeSamples_;
  const uint8_t requiredResetSamples_;
  uint8_t safeSamples_ = 0;
  uint8_t resetStableSamples_ = 0;
  bool resetReleaseObserved_ = false;
};

inline bool requiresManualRearm(SystemState state) {
  return state == SystemState::kSafeLatched ||
         state == SystemState::kFault;
}

inline bool requiresSafeClose(SystemState state) {
  return state == SystemState::kStartup ||
         state == SystemState::kCritical || requiresManualRearm(state);
}

inline SystemState stateAfterSensorTimeout(SystemState) {
  return SystemState::kFault;
}

inline SystemState stateAfterRearm(SystemState current,
                                   RearmResult result) {
  if (requiresManualRearm(current) && result == RearmResult::kAccepted) {
    return SystemState::kNormal;
  }
  return current;
}

}  // namespace sigas

#endif  // SIGAS_RT_FAIL_SAFE_POLICY_H
