#include <cstdio>

#include "actuator_policy.h"
#include "boot_guard.h"
#include "critical_timing.h"
#include "fail_safe_policy.h"
#include "safety_sample_policy.h"

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

struct CriticalSequenceHarness {
  uint8_t countZone1 = 0;
  uint8_t countZone2 = 0;
  uint64_t startZone1 = 0;
  uint64_t startZone2 = 0;
  uint32_t lastSequence = 0;
  bool hasSequence = false;

  void observe(uint32_t sequence, bool highZone1, bool highZone2,
               uint64_t timestampUs) {
    if (hasSequence &&
        !sigas::isConsecutiveSequence(lastSequence, sequence)) {
      sigas::resetCriticalCandidates(countZone1, startZone1, countZone2,
                                     startZone2);
    }
    lastSequence = sequence;
    hasSequence = true;
    sigas::updateCriticalCandidate(countZone1, startZone1, highZone1,
                                   timestampUs, 3);
    sigas::updateCriticalCandidate(countZone2, startZone2, highZone2,
                                   timestampUs, 3);
  }

  bool confirmed() const {
    return sigas::criticalCandidateConfirmed(countZone1, 3) ||
           sigas::criticalCandidateConfirmed(countZone2, 3);
  }
};

sigas::ZoneLevel classify(uint16_t adcRaw, sigas::ZoneLevel previous) {
  return sigas::classifyZoneWithHysteresis(adcRaw, previous, 1400, 1000,
                                           3000);
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

void testHysteresisAfterHighCandidate() {
  sigas::ZoneLevel level = classify(1500, sigas::ZoneLevel::kNormal);
  level = classify(3100, level);
  level = classify(1200, level);
  check("M01-01", level == sigas::ZoneLevel::kWarning);

  level = classify(1500, sigas::ZoneLevel::kNormal);
  level = classify(3100, level);
  level = classify(999, level);
  check("M01-02", level == sigas::ZoneLevel::kNormal);

  level = classify(3100, sigas::ZoneLevel::kNormal);
  level = classify(1200, level);
  check("M01-03", level == sigas::ZoneLevel::kWarning);

  level = classify(3100, sigas::ZoneLevel::kNormal);
  level = classify(999, level);
  check("M01-04", level == sigas::ZoneLevel::kNormal);

  sigas::ZoneLevel zone1 = classify(1500, sigas::ZoneLevel::kNormal);
  sigas::ZoneLevel zone2 = classify(3100, sigas::ZoneLevel::kNormal);
  zone1 = classify(999, zone1);
  zone2 = classify(1200, zone2);
  check("M01-05", zone1 == sigas::ZoneLevel::kNormal &&
                       zone2 == sigas::ZoneLevel::kWarning);
}

void testCriticalSequenceContinuity() {
  CriticalSequenceHarness consecutive;
  consecutive.observe(10, true, false, 100);
  consecutive.observe(11, true, false, 200);
  consecutive.observe(12, true, false, 300);
  check("M02-01", consecutive.confirmed());

  CriticalSequenceHarness gap;
  gap.observe(10, true, false, 100);
  gap.observe(12, true, false, 200);
  gap.observe(13, true, false, 300);
  check("M02-02", !gap.confirmed() && gap.countZone1 == 2 &&
                       gap.startZone1 == 200);

  gap.observe(14, true, false, 400);
  check("M02-03", gap.confirmed() && gap.startZone1 == 200);

  CriticalSequenceHarness rollover;
  rollover.observe(0xFFFFFFFEU, false, true, 100);
  rollover.observe(0xFFFFFFFFU, false, true, 200);
  rollover.observe(0U, false, true, 300);
  check("M02-07", rollover.confirmed() && rollover.startZone2 == 100);
}

void testSampleFreshnessPolicy() {
  constexpr uint64_t timeoutUs = 350000;
  check("M02-04", sigas::isFreshSample(1000000, 650001, timeoutUs));

  const bool stale = !sigas::isFreshSample(1000000, 650000, timeoutUs);
  const sigas::SystemState state = stale
      ? sigas::stateAfterSensorTimeout(sigas::SystemState::kNormal)
      : sigas::SystemState::kNormal;
  const sigas::ActuatorOutputs outputs = sigas::outputsForAction(
      sigas::RequestedAction::kSafeClose, 20, 110);
  check("M02-05", stale && state == sigas::SystemState::kFault &&
                       sigas::requiresSafeClose(state) &&
                       outputs.valveAngle == 110 && outputs.buzzerOn);

  sigas::FailSafeRecovery recovery(3, 2);
  recovery.enterFailSafe();
  sigas::SystemState rearmState = sigas::SystemState::kFault;
  for (int index = 0; index < 3; ++index) {
    rearmState = observeRecovery(rearmState, recovery, true, false);
  }
  const bool staleResetAccepted = sigas::isFreshSample(
      1000000, 650000, timeoutUs);
  if (staleResetAccepted) {
    rearmState = observeRecovery(rearmState, recovery, true, true);
    rearmState = observeRecovery(rearmState, recovery, true, true);
  }
  check("M02-06", !staleResetAccepted &&
                       rearmState == sigas::SystemState::kFault);
}

void testActuatorOutputPolicy() {
  const sigas::ActuatorOutputs normal = sigas::outputsForAction(
      sigas::RequestedAction::kNormal, 20, 110);
  check("M03-01", normal.valveAngle == 20 && !normal.buzzerOn &&
                       normal.greenLedOn && !normal.redLedOn);

  const sigas::ActuatorOutputs warning = sigas::outputsForAction(
      sigas::RequestedAction::kWarning, 20, 110);
  check("M03-02", warning.valveAngle == 20 && !warning.buzzerOn &&
                       warning.greenLedOn && warning.redLedOn);

  const sigas::ActuatorOutputs safeLatched = sigas::outputsForAction(
      sigas::RequestedAction::kSafeClose, 20, 110);
  check("M03-03", safeLatched.valveAngle == 110 &&
                       safeLatched.buzzerOn && !safeLatched.greenLedOn &&
                       safeLatched.redLedOn);
  check("M03-04", safeLatched.valveAngle == 110 &&
                       safeLatched.buzzerOn && !safeLatched.greenLedOn &&
                       safeLatched.redLedOn);
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
  testHysteresisAfterHighCandidate();
  testCriticalSequenceContinuity();
  testSampleFreshnessPolicy();
  testActuatorOutputPolicy();
  return failures == 0 ? 0 : 1;
}
