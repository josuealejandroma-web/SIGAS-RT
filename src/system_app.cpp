#include "system_app.h"

#include <Arduino.h>

#include "actuators.h"
#include "boot_guard.h"
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
BootGuard bootGuard{};

void failBoot(const char *message) {
  bootGuard.latchFailure();
  Serial.printf("[BOOT][ERROR] %s\r\n", message);
  for (;;) {
    applyBootSafeActuatorState(true);
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

bool createTask(TaskFunction_t task, const char *name, uint32_t stackDepth,
                void *parameters, UBaseType_t priority,
                TaskHandle_t *taskHandle) {
  const BaseType_t result =
      xTaskCreatePinnedToCore(task, name, stackDepth, parameters, priority,
                              taskHandle, TASK_CORE);
  if (result != pdPASS) {
    Serial.printf("[BOOT][ERROR] No se pudo crear %s\r\n", name);
    return false;
  }
  return true;
}

}  // namespace

void waitForSystemRuntimeActivation() {
  while (!bootGuard.runtimeEnabled()) {
    vTaskSuspend(nullptr);
  }
}

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

  TaskHandle_t taskHandles[4] = {nullptr, nullptr, nullptr, nullptr};
  const bool tasksCreated =
      createTask(taskActuator, "TaskActuator", TASK_STACK_WORDS,
                 &actuatorContext, PRIORITY_ACTUATOR, &taskHandles[0]) &&
      createTask(taskSafety, "TaskSafety", TASK_STACK_WORDS, &safetyContext,
                 PRIORITY_SAFETY, &taskHandles[1]) &&
      createTask(taskSensors, "TaskSensors", TASK_STACK_WORDS, &sensorContext,
                 PRIORITY_SENSORS, &taskHandles[2]) &&
      createTask(taskDiagnostics, "TaskDiagnostics", TASK_STACK_WORDS,
                 &diagnosticsContext, PRIORITY_DIAGNOSTICS, &taskHandles[3]);

  if (!tasksCreated || !bootGuard.completeInitialization()) {
    failBoot("Fallo creando tarea FreeRTOS");
  }

  for (TaskHandle_t taskHandle : taskHandles) {
    vTaskResume(taskHandle);
  }
}

}  // namespace sigas
