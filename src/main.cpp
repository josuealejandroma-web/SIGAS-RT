#include <Arduino.h>

namespace {
constexpr uint8_t LED_PIN = 2;
constexpr uint8_t BUTTON_PIN = 4;
constexpr TickType_t SENSOR_PERIOD = pdMS_TO_TICKS(250);
constexpr TickType_t CONTROL_PERIOD = pdMS_TO_TICKS(250);
constexpr TickType_t ACTUATOR_PERIOD = pdMS_TO_TICKS(250);

QueueHandle_t sensorQueue;
QueueHandle_t actuatorQueue;

struct SensorSample {
  bool buttonPressed;
  uint32_t timestampMs;
};

void taskSensor(void *parameters) {
  (void)parameters;

  SensorSample sample{};

  for (;;) {
    sample.buttonPressed = digitalRead(BUTTON_PIN) == LOW;
    sample.timestampMs = millis();
    xQueueOverwrite(sensorQueue, &sample);

    Serial.printf("[TaskSensor] Entrada fisica: boton=%s t=%lu ms\r\n",
                  sample.buttonPressed ? "PRESIONADO" : "LIBRE",
                  static_cast<unsigned long>(sample.timestampMs));

    vTaskDelay(SENSOR_PERIOD);
  }
}

void taskControl(void *parameters) {
  (void)parameters;

  SensorSample sample{};
  bool actuatorEnabled = false;

  for (;;) {
    if (xQueueReceive(sensorQueue, &sample, CONTROL_PERIOD) == pdTRUE) {
      actuatorEnabled = sample.buttonPressed;
      xQueueOverwrite(actuatorQueue, &actuatorEnabled);

      Serial.printf("[TaskControl] CPU/RT: salida=%s prioridad=%u\r\n",
                    actuatorEnabled ? "ON" : "OFF",
                    static_cast<unsigned>(uxTaskPriorityGet(nullptr)));
    }
  }
}

void taskActuator(void *parameters) {
  (void)parameters;

  bool actuatorEnabled = false;

  for (;;) {
    if (xQueueReceive(actuatorQueue, &actuatorEnabled, ACTUATOR_PERIOD) ==
        pdTRUE) {
      digitalWrite(LED_PIN, actuatorEnabled ? HIGH : LOW);

      Serial.printf("[TaskActuator] Actuador: LED=%s\r\n",
                    actuatorEnabled ? "ON" : "OFF");
    }
  }
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, LOW);

  sensorQueue = xQueueCreate(1, sizeof(SensorSample));
  actuatorQueue = xQueueCreate(1, sizeof(bool));

  if (sensorQueue == nullptr || actuatorQueue == nullptr) {
    Serial.println("[SIGAS-RT] Error creando colas FreeRTOS");
    return;
  }

  Serial.println("[SIGAS-RT] Prueba de entorno ESP32 + FreeRTOS iniciada");
  Serial.println("[SIGAS-RT] Flujo: Entrada fisica -> CPU/RT -> Actuador");

  xTaskCreatePinnedToCore(taskSensor, "TaskSensor", 4096, nullptr, 3, nullptr,
                          1);
  xTaskCreatePinnedToCore(taskControl, "TaskControl", 4096, nullptr, 2, nullptr,
                          1);
  xTaskCreatePinnedToCore(taskActuator, "TaskActuator", 4096, nullptr, 1,
                          nullptr, 1);
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
