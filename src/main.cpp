#include <Arduino.h>

#include "boot_guard.h"
#include "hardware_smoke_test.h"
#include "system_app.h"

void setup() {
  if (sigas::configuredBootMode() == sigas::BootMode::kHardwareSmokeTest) {
    sigas::setupHardwareSmokeTest();
    return;
  }

  Serial.begin(115200);
  sigas::setupFreeRtosIntegration();
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
