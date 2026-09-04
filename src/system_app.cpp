#include "system_app.h"

#include <Arduino.h>

#include "actuators.h"
#include "config.h"
#include "diagnostics.h"
#include "safety.h"
#include "sensors.h"
#include "system_types.h"

namespace sigas {
namespace {

QueueHandle_t sensorQueue = nullptr;
QueueHandle_t actuatorQueue = nullptr;
QueueHandle_t diagnosticsSampleQueue = nullptr;
QueueHandle_t diagnosticsDecisionQueue = nullptr;

SensorTaskContext sensorContext{};
SafetyTaskContext safetyContext{};
ActuatorTaskContext actuatorContext{};
DiagnosticsTaskContext diagnosticsContext{};

void failBoot(const char *message) {
  Serial.printf("[BOOT][ERROR] %s\r\n", message);
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

void createTask(TaskFunction_t task, const char *name, uint32_t stackDepth,
                void *parameters, UBaseType_t priority) {
  const BaseType_t result =
      xTaskCreatePinnedToCore(task, name, stackDepth, parameters, priority,
                              nullptr, TASK_CORE);
  if (result != pdPASS) {
    Serial.printf("[BOOT][ERROR] No se pudo crear %s\r\n", name);
    failBoot("Fallo creando tarea FreeRTOS");
  }
}

}  // namespace

void setupFreeRtosIntegration() {
  configureSensorInputs();
  configureActuatorOutputs();

  sensorQueue = xQueueCreate(SENSOR_QUEUE_LENGTH, sizeof(SensorSample));
  actuatorQueue = xQueueCreate(ACTUATOR_QUEUE_LENGTH, sizeof(ActuatorCommand));
  diagnosticsSampleQueue =
      xQueueCreate(DIAGNOSTICS_QUEUE_LENGTH, sizeof(SensorSample));
  diagnosticsDecisionQueue =
      xQueueCreate(DIAGNOSTICS_QUEUE_LENGTH, sizeof(SafetyDecision));

  if (sensorQueue == nullptr || actuatorQueue == nullptr ||
      diagnosticsSampleQueue == nullptr || diagnosticsDecisionQueue == nullptr) {
    failBoot("No se pudieron crear las colas FreeRTOS");
  }

  sensorContext = SensorTaskContext{sensorQueue, diagnosticsSampleQueue};
  safetyContext =
      SafetyTaskContext{sensorQueue, actuatorQueue, diagnosticsDecisionQueue};
  actuatorContext = ActuatorTaskContext{actuatorQueue};
  diagnosticsContext =
      DiagnosticsTaskContext{diagnosticsSampleQueue, diagnosticsDecisionQueue};

  Serial.println("[BOOT][SIGAS-RT] FreeRTOS integration mode iniciado");
  Serial.println("[BOOT][SIGAS-RT] Flujo: Sensor -> ADC -> CPU -> TaskSafety -> TaskActuator");
  Serial.println("[BOOT][SIGAS-RT] Umbrales experimentales solo para Wokwi");
  Serial.printf("[BOOT][QUEUES] sensor=%u actuator=%u diagnostics=%u\r\n",
                SENSOR_QUEUE_LENGTH, ACTUATOR_QUEUE_LENGTH,
                DIAGNOSTICS_QUEUE_LENGTH);

  createTask(taskActuator, "TaskActuator", TASK_STACK_WORDS, &actuatorContext,
             PRIORITY_ACTUATOR);
  createTask(taskSafety, "TaskSafety", TASK_STACK_WORDS, &safetyContext,
             PRIORITY_SAFETY);
  createTask(taskSensors, "TaskSensors", TASK_STACK_WORDS, &sensorContext,
             PRIORITY_SENSORS);
  createTask(taskDiagnostics, "TaskDiagnostics", TASK_STACK_WORDS,
             &diagnosticsContext, PRIORITY_DIAGNOSTICS);
}

}  // namespace sigas
