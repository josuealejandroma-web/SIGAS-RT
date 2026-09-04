#ifndef SIGAS_RT_CONFIG_H
#define SIGAS_RT_CONFIG_H

#include <Arduino.h>

namespace sigas {

constexpr uint8_t PIN_MQ2_ZONE_1_ADC = 34;
constexpr uint8_t PIN_MQ2_ZONE_2_ADC = 35;
constexpr uint8_t PIN_VALVE_SERVO = 18;
constexpr uint8_t PIN_BUZZER = 19;
constexpr uint8_t PIN_LED_GREEN = 21;
constexpr uint8_t PIN_LED_RED = 22;
constexpr uint8_t PIN_RESET_BUTTON = 23;

constexpr uint8_t VALVE_OPEN_ANGLE = 20;
constexpr uint8_t VALVE_CLOSED_ANGLE = 110;

constexpr TickType_t SENSOR_TEST_PERIOD = pdMS_TO_TICKS(500);
constexpr TickType_t ACTUATOR_TEST_PERIOD = pdMS_TO_TICKS(750);
constexpr TickType_t RESET_TEST_PERIOD = pdMS_TO_TICKS(50);

constexpr UBaseType_t SENSOR_TEST_PRIORITY = 3;
constexpr UBaseType_t ACTUATOR_TEST_PRIORITY = 2;
constexpr UBaseType_t RESET_TEST_PRIORITY = 2;

}  // namespace sigas

#endif  // SIGAS_RT_CONFIG_H
