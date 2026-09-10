#ifndef SIGAS_RT_ACTUATOR_POLICY_H
#define SIGAS_RT_ACTUATOR_POLICY_H

#include <stdint.h>

#include "system_types.h"

namespace sigas {

struct ActuatorOutputs {
  uint8_t valveAngle;
  bool buzzerOn;
  bool greenLedOn;
  bool redLedOn;
};

inline ActuatorOutputs outputsForAction(RequestedAction action,
                                        uint8_t valveOpenAngle,
                                        uint8_t valveClosedAngle) {
  if (action == RequestedAction::kSafeClose) {
    return ActuatorOutputs{valveClosedAngle, true, false, true};
  }
  if (action == RequestedAction::kWarning) {
    return ActuatorOutputs{valveOpenAngle, false, true, true};
  }
  return ActuatorOutputs{valveOpenAngle, false, true, false};
}

}  // namespace sigas

#endif  // SIGAS_RT_ACTUATOR_POLICY_H
