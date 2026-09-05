#include "sensors.h"

#include "config.h"
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
  TickType_t lastWake = xTaskGetTickCount();
  uint32_t sequence = 0;

  Serial.println("[TASK][TaskSensors] CREATED PERIOD_MS=100");

  for (;;) {
    SensorSample sample{
        static_cast<uint16_t>(analogRead(PIN_MQ2_ZONE_1_ADC)),
        static_cast<uint16_t>(analogRead(PIN_MQ2_ZONE_2_ADC)),
        digitalRead(PIN_RESET_BUTTON) == LOW,
        static_cast<uint64_t>(esp_timer_get_time()),
        ++sequence,
    };

    xQueueOverwrite(context->sensorQueue, &sample);
    xQueueOverwrite(context->diagnosticsSampleQueue, &sample);

    vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
  }
}

}  // namespace sigas
