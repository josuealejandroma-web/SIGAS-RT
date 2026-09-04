#ifndef SIGAS_RT_SENSORS_H
#define SIGAS_RT_SENSORS_H

#include <Arduino.h>

namespace sigas {

struct SensorTaskContext {
  QueueHandle_t sensorQueue;
  QueueHandle_t diagnosticsSampleQueue;
};

void configureSensorInputs();
void taskSensors(void *parameters);

}  // namespace sigas

#endif  // SIGAS_RT_SENSORS_H
