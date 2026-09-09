#ifndef SIGAS_RT_BOOT_GUARD_H
#define SIGAS_RT_BOOT_GUARD_H

namespace sigas {

enum class BootMode {
  kNormal,
  kHardwareSmokeTest,
};

constexpr BootMode configuredBootMode() {
#ifdef SIGAS_RT_HARDWARE_SMOKE_TEST
  return BootMode::kHardwareSmokeTest;
#else
  return BootMode::kNormal;
#endif
}

class BootGuard {
 public:
  bool completeInitialization() {
    if (failureLatched_) {
      return false;
    }
    runtimeEnabled_ = true;
    return true;
  }

  void latchFailure() {
    failureLatched_ = true;
    runtimeEnabled_ = false;
  }

  bool runtimeEnabled() const {
    return runtimeEnabled_ && !failureLatched_;
  }

  bool safeCloseRequired() const {
    return !runtimeEnabled();
  }

 private:
  volatile bool runtimeEnabled_ = false;
  volatile bool failureLatched_ = false;
};

}  // namespace sigas

#endif  // SIGAS_RT_BOOT_GUARD_H
