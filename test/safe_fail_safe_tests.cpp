#include <cstdio>

#include "boot_guard.h"
#include "critical_timing.h"
#include "fail_safe_policy.h"

namespace {

int failures = 0;

void check(const char *name, bool condition) {
  std::printf("%s: %s\n", name, condition ? "PASS" : "FAIL");
  if (!condition) {
    ++failures;
  }
}

sigas::SystemState observeRecovery(sigas::SystemState state,
                                   sigas::FailSafeRecovery &recovery,
                                   bool zonesSafe, bool resetPressed) {
  return sigas::stateAfterRearm(
      state, recovery.observe(zonesSafe, resetPressed));
}

void testConfiguredBootMode() {
#ifdef EXPECT_HARDWARE_SMOKE_MODE
  check("SAFE-BOOT-01-FLAG",
        sigas::configuredBootMode() ==
            sigas::BootMode::kHardwareSmokeTest);
#else
  const bool resetButtonHeldAtBoot = true;
  check("SAFE-BOOT-01",
        resetButtonHeldAtBoot &&
            sigas::configuredBootMode() == sigas::BootMode::kNormal);
#endif
}

void testNormalTimeoutRecoveryStaysClosed() {
  sigas::SystemState state =
      sigas::stateAfterSensorTimeout(sigas::SystemState::kNormal);
  sigas::FailSafeRecovery recovery(3, 2);
  recovery.enterFailSafe();
  for (int index = 0; index < 3; ++index) {
    state = observeRecovery(state, recovery, true, false);
  }
  check("SAFE-FAULT-01",
        state == sigas::SystemState::kFault &&
            sigas::requiresSafeClose(state));
}

void testLatchedTimeoutRemainsRearmProtected() {
  sigas::SystemState state =
      sigas::stateAfterSensorTimeout(sigas::SystemState::kSafeLatched);
  sigas::FailSafeRecovery recovery(3, 2);
  recovery.enterFailSafe();
  for (int index = 0; index < 5; ++index) {
    state = observeRecovery(state, recovery, true, false);
  }
  check("SAFE-FAULT-02",
        state == sigas::SystemState::kFault &&
            recovery.safeConditionsConfirmed() &&
            sigas::requiresManualRearm(state) &&
            sigas::requiresSafeClose(state));
}

void testSafeSamplesWithoutResetStayClosed() {
  sigas::SystemState state = sigas::SystemState::kFault;
  sigas::FailSafeRecovery recovery(3, 2);
  recovery.enterFailSafe();
  for (int index = 0; index < 5; ++index) {
    state = observeRecovery(state, recovery, true, false);
  }
  check("SAFE-FAULT-03",
        recovery.safeConditionsConfirmed() &&
            state == sigas::SystemState::kFault &&
            sigas::requiresSafeClose(state));
}

void testDeliberateSafeRearmReturnsToNormal() {
  sigas::SystemState state = sigas::SystemState::kFault;
  sigas::FailSafeRecovery recovery(3, 2);
  recovery.enterFailSafe();
  for (int index = 0; index < 3; ++index) {
    state = observeRecovery(state, recovery, true, false);
  }
  state = observeRecovery(state, recovery, true, true);
  state = observeRecovery(state, recovery, true, true);
  check("SAFE-FAULT-04", state == sigas::SystemState::kNormal);

  state = sigas::SystemState::kFault;
  recovery.enterFailSafe();
  for (int index = 0; index < 4; ++index) {
    state = observeRecovery(state, recovery, true, true);
  }
  check("SAFE-FAULT-04-HELD",
        state == sigas::SystemState::kFault &&
            sigas::requiresSafeClose(state));
}

void testPartialInitializationLatchesSafeClose() {
  sigas::BootGuard guard;
  const bool closedBeforeInitialization = guard.safeCloseRequired();
  guard.latchFailure();
  const bool activationRejected = !guard.completeInitialization();
  check("SAFE-BOOT-02",
        closedBeforeInitialization && activationRejected &&
            !guard.runtimeEnabled() && guard.safeCloseRequired());
}

void testDiscardedSpikeDoesNotDefineFirstHigh() {
  uint8_t countZone1 = 0;
  uint8_t countZone2 = 0;
  uint64_t candidateStartZone1 = 0;
  uint64_t candidateStartZone2 = 0;

  sigas::updateCriticalCandidate(countZone1, candidateStartZone1, true,
                                 100, 3);
  sigas::updateCriticalCandidate(countZone1, candidateStartZone1, false,
                                 200, 3);
  const uint64_t sustainedCandidateTimestamps[] = {300, 400, 500};
  for (uint64_t timestamp : sustainedCandidateTimestamps) {
    sigas::updateCriticalCandidate(countZone2, candidateStartZone2, true,
                                   timestamp, 3);
  }

  const uint64_t firstHigh = sigas::selectConfirmedCandidateStart(
      countZone1, candidateStartZone1, countZone2, candidateStartZone2, 3);
  check("A05-FIRST-HIGH-SPIKE",
        countZone1 == 0 && candidateStartZone1 == 0 && firstHigh == 300);
}

void testSimultaneousConfirmationUsesOldestCandidate() {
  const uint64_t firstHigh = sigas::selectConfirmedCandidateStart(
      3, 120, 3, 100, 3);
  check("A05-FIRST-HIGH-BOTH", firstHigh == 100);
}

void testCommandPublicationTimestampIsCoherent() {
  sigas::SafetyDecision decision{};
  sigas::ActuatorCommand command{};
  sigas::stampCommandPublication(decision, command, 123456);
  check("A05-COMMAND-SENT",
        decision.commandSentTimestampUs == 123456 &&
            command.commandSentTimestampUs == 123456);
}

}  // namespace

int main() {
  testConfiguredBootMode();
  testNormalTimeoutRecoveryStaysClosed();
  testLatchedTimeoutRemainsRearmProtected();
  testSafeSamplesWithoutResetStayClosed();
  testDeliberateSafeRearmReturnsToNormal();
  testPartialInitializationLatchesSafeClose();
  testDiscardedSpikeDoesNotDefineFirstHigh();
  testSimultaneousConfirmationUsesOldestCandidate();
  testCommandPublicationTimestampIsCoherent();
  return failures == 0 ? 0 : 1;
}
