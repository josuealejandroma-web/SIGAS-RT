#ifndef SIGAS_RT_SAFETY_SAMPLE_POLICY_H
#define SIGAS_RT_SAFETY_SAMPLE_POLICY_H

#include <stdint.h>

#include "system_types.h"

namespace sigas {

inline ZoneLevel classifyZoneWithHysteresis(uint16_t adcRaw,
                                            ZoneLevel previousLevel,
                                            uint16_t warningEnter,
                                            uint16_t warningExit,
                                            uint16_t criticalEnter) {
  if (adcRaw >= criticalEnter) {
    return ZoneLevel::kHigh;
  }
  if (adcRaw >= warningEnter) {
    return ZoneLevel::kWarning;
  }
  if (previousLevel != ZoneLevel::kNormal && adcRaw >= warningExit) {
    return ZoneLevel::kWarning;
  }
  return ZoneLevel::kNormal;
}

inline bool isConsecutiveSequence(uint32_t previousSequence,
                                  uint32_t currentSequence) {
  return currentSequence == static_cast<uint32_t>(previousSequence + 1U);
}

inline bool isFreshSample(uint64_t nowUs, uint64_t sampleTimestampUs,
                          uint64_t timeoutUs) {
  return sampleTimestampUs <= nowUs &&
         nowUs - sampleTimestampUs < timeoutUs;
}

}  // namespace sigas

#endif  // SIGAS_RT_SAFETY_SAMPLE_POLICY_H
