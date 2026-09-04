#include "diagnostics.h"

#include "config.h"
#include "system_types.h"

namespace sigas {

void taskDiagnostics(void *parameters) {
  auto *context = static_cast<DiagnosticsTaskContext *>(parameters);
  TickType_t lastWake = xTaskGetTickCount();
  SensorSample latestSample{};
  SafetyDecision latestDecision{};
  bool hasSample = false;
  bool hasDecision = false;

  Serial.println("[TASK][TaskDiagnostics] CREATED");

  for (;;) {
    SensorSample sample{};
    SafetyDecision decision{};

    while (xQueueReceive(context->sampleQueue, &sample, 0) == pdTRUE) {
      latestSample = sample;
      hasSample = true;
    }

    while (xQueueReceive(context->decisionQueue, &decision, 0) == pdTRUE) {
      latestDecision = decision;
      hasDecision = true;
    }

    if (hasSample) {
      Serial.printf("[SENSORS] SEQ=%lu Z1=%u Z2=%u RESET=%s T=%lu\r\n",
                    static_cast<unsigned long>(latestSample.sequence),
                    latestSample.adcZone1, latestSample.adcZone2,
                    latestSample.resetPressed ? "PRESSED" : "RELEASED",
                    static_cast<unsigned long>(latestSample.timestampMs));
    }

    if (hasDecision) {
      Serial.printf("[SAFETY] SEQ=%lu Z1=%s Z2=%s ACTION=%s SAMPLE_T=%lu DECISION_T=%lu\r\n",
                    static_cast<unsigned long>(latestDecision.sequence),
                    toString(latestDecision.zone1Level),
                    toString(latestDecision.zone2Level),
                    toString(latestDecision.requestedAction),
                    static_cast<unsigned long>(latestDecision.sampleTimestampMs),
                    static_cast<unsigned long>(
                        latestDecision.decisionTimestampMs));
    }

    vTaskDelayUntil(&lastWake, DIAGNOSTICS_PERIOD);
  }
}

}  // namespace sigas
