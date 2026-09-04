#ifndef SIGAS_RT_DIAGNOSTICS_H
#define SIGAS_RT_DIAGNOSTICS_H

#include <Arduino.h>

namespace sigas {

struct DiagnosticsTaskContext {
  QueueHandle_t sampleQueue;
  QueueHandle_t decisionQueue;
};

void taskDiagnostics(void *parameters);

}  // namespace sigas

#endif  // SIGAS_RT_DIAGNOSTICS_H
