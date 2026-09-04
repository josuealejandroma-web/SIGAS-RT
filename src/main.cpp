#include <Arduino.h>

#include "hardware_smoke_test.h"

void setup() {
  sigas::setupHardwareSmokeTest();
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
