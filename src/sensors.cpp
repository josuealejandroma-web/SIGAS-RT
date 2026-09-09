#include "sensors.h"

#include "config.h"
#include "system_app.h"
#include "system_types.h"

#include <esp_timer.h>

namespace sigas {

void configureSensorInputs() {
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2_ZONE_1_ADC, ADC_11db);
  analogSetPinAttenuation(PIN_MQ2_ZONE_2_ADC, ADC_11db);
  pinMode(PIN_RESET_BUTTON, INPUT_PULLUP);
}

void taskSensors(void *parameters) {
  auto *context = static_cast<SensorTaskContext *>(parameters);
  waitForSystemRuntimeActivation();
  TickType_t lastWake = xTaskGetTickCount();
  uint32_t sequence = 0;
  uint64_t maxObservedExecutionUs = 0;
#ifdef SIGAS_RT_SENSOR_TIMEOUT_TEST
  bool timeoutStimulusActive = false;
#endif

  Serial.println("[TASK][TaskSensors] CREATED PERIOD_MS=100");

  for (;;) {
#ifdef SIGAS_RT_INITIAL_SENSOR_TIMEOUT_TEST
    vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
    continue;
#endif

#ifdef SIGAS_RT_SENSOR_TIMEOUT_TEST
    if (timeoutStimulusActive) {
      vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
      continue;
    }
#endif

    const uint64_t taskStartUs = static_cast<uint64_t>(esp_timer_get_time());
    SensorSample sample{
        static_cast<uint16_t>(analogRead(PIN_MQ2_ZONE_1_ADC)),
        static_cast<uint16_t>(analogRead(PIN_MQ2_ZONE_2_ADC)),
        digitalRead(PIN_RESET_BUTTON) == LOW,
        static_cast<uint64_t>(esp_timer_get_time()),
        ++sequence,
    };

    xQueueOverwrite(context->sensorQueue, &sample);
    xQueueOverwrite(context->diagnosticsSampleQueue, &sample);

    const uint64_t taskEndUs = static_cast<uint64_t>(esp_timer_get_time());
    const uint64_t executionUs = taskEndUs - taskStartUs;
    if (executionUs > maxObservedExecutionUs) {
      maxObservedExecutionUs = executionUs;
      Serial.printf("[WCET_OBSERVED] TASK=TaskSensors DURATION_US=%llu SEQ=%lu\r\n",
                    static_cast<unsigned long long>(executionUs),
                    static_cast<unsigned long>(sample.sequence));
    }

#ifdef SIGAS_RT_SENSOR_TIMEOUT_TEST
    if (sequence >= 1) {
      timeoutStimulusActive = true;
      vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
      continue;
    }
#endif

    vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
  }
}

}  // namespace sigas
