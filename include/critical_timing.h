#ifndef SIGAS_RT_CRITICAL_TIMING_H
#define SIGAS_RT_CRITICAL_TIMING_H

#include <stdint.h>

#include "system_types.h"

namespace sigas {

inline void updateCriticalCandidate(uint8_t &counter,
                                    uint64_t &candidateStartTimestampUs,
                                    bool high, uint64_t sampleTimestampUs,
                                    uint8_t requiredSamples) {
  if (!high) {
    counter = 0;
    candidateStartTimestampUs = 0;
    return;
  }

  if (counter == 0) {
    candidateStartTimestampUs = sampleTimestampUs;
  }
  if (counter < requiredSamples) {
    ++counter;
  }
}

inline bool criticalCandidateConfirmed(uint8_t counter,
                                       uint8_t requiredSamples) {
  return counter >= requiredSamples;
}

inline uint64_t selectConfirmedCandidateStart(
    uint8_t countZone1, uint64_t candidateStartZone1,
    uint8_t countZone2, uint64_t candidateStartZone2,
    uint8_t requiredSamples) {
  const bool zone1Confirmed =
      criticalCandidateConfirmed(countZone1, requiredSamples);
  const bool zone2Confirmed =
      criticalCandidateConfirmed(countZone2, requiredSamples);

  if (zone1Confirmed && zone2Confirmed) {
    return candidateStartZone1 <= candidateStartZone2
               ? candidateStartZone1
               : candidateStartZone2;
  }
  if (zone1Confirmed) {
    return candidateStartZone1;
  }
  if (zone2Confirmed) {
    return candidateStartZone2;
  }
  return 0;
}

inline void stampCommandPublication(SafetyDecision &decision,
                                    ActuatorCommand &command,
                                    uint64_t timestampUs) {
  decision.commandSentTimestampUs = timestampUs;
  command.commandSentTimestampUs = timestampUs;
}

}  // namespace sigas

#endif  // SIGAS_RT_CRITICAL_TIMING_H
