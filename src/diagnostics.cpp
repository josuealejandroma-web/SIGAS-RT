#include "diagnostics.h"

#include "config.h"
#include "system_app.h"
#include "system_types.h"

namespace sigas {
namespace {

void runControlledDiagnosticsLoad() {
#ifdef SIGAS_RT_DIAGNOSTICS_LOAD
  volatile uint32_t accumulator = 0;
  for (uint32_t i = 0; i < DIAGNOSTICS_LOAD_ITERATIONS_SIMULATION_ONLY; ++i) {
    accumulator += i ^ (accumulator << 1);
  }
  (void)accumulator;
#endif
}

#ifdef SIGAS_RT_VISUALIZATION
void publishVisualizationTelemetry(const SensorSample &sample,
                                   const SafetyDecision &decision,
                                   bool hasSample, bool hasDecision) {
  if (!hasSample || !hasDecision) {
    return;
  }

  Serial.printf("@SIGAS {\"type\":\"state\",\"seq\":%lu,\"state\":\"%s\",\"action\":\"%s\",\"reason\":\"%s\",\"zone1_adc\":%u,\"zone2_adc\":%u,\"zone1_level\":\"%s\",\"zone2_level\":\"%s\",\"reset\":%s,\"valve\":\"%s\",\"buzzer\":%s,\"green_led\":%s,\"red_led\":%s,\"sample_us\":%llu,\"decision_us\":%llu,\"deadline_us\":500000}\r\n",
                static_cast<unsigned long>(decision.sequence),
                toString(decision.systemState),
                toString(decision.requestedAction),
                toString(decision.reason),
                sample.adcZone1,
                sample.adcZone2,
                toString(decision.zone1Level),
                toString(decision.zone2Level),
                sample.resetPressed ? "true" : "false",
                decision.commandedValveAngle == VALVE_CLOSED_ANGLE ? "CLOSED"
                                                                   : "OPEN",
                decision.commandedBuzzerOn ? "true" : "false",
                decision.commandedGreenLedOn ? "true" : "false",
                decision.commandedRedLedOn ? "true" : "false",
                static_cast<unsigned long long>(sample.timestampUs),
                static_cast<unsigned long long>(decision.decisionTimestampUs));
}
#endif

}  // namespace

void taskDiagnostics(void *parameters) {
  auto *context = static_cast<DiagnosticsTaskContext *>(parameters);
  waitForSystemRuntimeActivation();
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

    runControlledDiagnosticsLoad();

    if (hasSample) {
      Serial.printf("[SENSORS] SEQ=%lu Z1=%u Z2=%u RESET=%s T=%lu\r\n",
                    static_cast<unsigned long>(latestSample.sequence),
                    latestSample.adcZone1, latestSample.adcZone2,
                    latestSample.resetPressed ? "PRESSED" : "RELEASED",
                    static_cast<unsigned long>(
                        latestSample.timestampUs / 1000ULL));
    }

    if (hasDecision) {
      Serial.printf("[SAFETY] SEQ=%lu STATE=%s Z1=%s Z2=%s ACTION=%s REASON=%s SAMPLE_T_US=%llu DECISION_T_US=%llu\r\n",
                    static_cast<unsigned long>(latestDecision.sequence),
                    toString(latestDecision.systemState),
                    toString(latestDecision.zone1Level),
                    toString(latestDecision.zone2Level),
                    toString(latestDecision.requestedAction),
                    toString(latestDecision.reason),
                    static_cast<unsigned long long>(
                        latestDecision.sampleTimestampUs),
                    static_cast<unsigned long long>(
                        latestDecision.decisionTimestampUs));
    }

#ifdef SIGAS_RT_VISUALIZATION
    publishVisualizationTelemetry(latestSample, latestDecision, hasSample,
                                  hasDecision);
#endif

    vTaskDelayUntil(&lastWake, DIAGNOSTICS_PERIOD);
  }
}

}  // namespace sigas
