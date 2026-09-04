#ifndef SIGAS_RT_SAFETY_H
#define SIGAS_RT_SAFETY_H

#include <Arduino.h>

namespace sigas {

struct SafetyTaskContext {
  QueueHandle_t sensorQueue;
  QueueHandle_t actuatorQueue;
  QueueHandle_t diagnosticsDecisionQueue;
};

void taskSafety(void *parameters);

}  // namespace sigas

#endif  // SIGAS_RT_SAFETY_H
