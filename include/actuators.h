#ifndef SIGAS_RT_ACTUATORS_H
#define SIGAS_RT_ACTUATORS_H

#include <Arduino.h>

namespace sigas {

struct ActuatorTaskContext {
  QueueHandle_t actuatorQueue;
};

void configureActuatorOutputs();
void taskActuator(void *parameters);

}  // namespace sigas

#endif  // SIGAS_RT_ACTUATORS_H
