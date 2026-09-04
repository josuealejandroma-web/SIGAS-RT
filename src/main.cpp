#include <Arduino.h>

#include "config.h"
#include "hardware_smoke_test.h"
#include "system_app.h"

void setup() {
  Serial.begin(115200);
  pinMode(sigas::PIN_RESET_BUTTON, INPUT_PULLUP);
  delay(500);

  if (digitalRead(sigas::PIN_RESET_BUTTON) == LOW) {
    sigas::setupHardwareSmokeTest();
    return;
  }

  sigas::setupFreeRtosIntegration();
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
