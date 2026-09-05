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

constexpr uint16_t ADC_WARNING_ENTER_SIMULATION_ONLY = 1400;
constexpr uint16_t ADC_WARNING_EXIT_SIMULATION_ONLY = 1000;
constexpr uint16_t ADC_CRITICAL_SIMULATION_ONLY = 3000;
constexpr uint16_t ADC_SAFE_EXIT_SIMULATION_ONLY = 1000;
constexpr uint8_t CRITICAL_CONFIRMATION_SAMPLES = 3;
constexpr uint8_t SAFE_RESET_CONFIRMATION_SAMPLES = 3;
constexpr uint8_t RESET_DEBOUNCE_SAMPLES = 2;

constexpr TickType_t SENSOR_PERIOD = pdMS_TO_TICKS(100);
constexpr TickType_t DIAGNOSTICS_PERIOD = pdMS_TO_TICKS(500);
constexpr TickType_t SAFETY_QUEUE_TIMEOUT = pdMS_TO_TICKS(50);
constexpr uint32_t SENSOR_DATA_TIMEOUT_US = 350000;
constexpr TickType_t SENSOR_TEST_PERIOD = pdMS_TO_TICKS(500);
constexpr TickType_t ACTUATOR_TEST_PERIOD = pdMS_TO_TICKS(750);
constexpr TickType_t RESET_TEST_PERIOD = pdMS_TO_TICKS(50);

constexpr UBaseType_t PRIORITY_ACTUATOR = 5;
constexpr UBaseType_t PRIORITY_SAFETY = 4;
constexpr UBaseType_t PRIORITY_SENSORS = 3;
constexpr UBaseType_t PRIORITY_DIAGNOSTICS = 1;

constexpr UBaseType_t SENSOR_TEST_PRIORITY = 3;
constexpr UBaseType_t ACTUATOR_TEST_PRIORITY = 2;
constexpr UBaseType_t RESET_TEST_PRIORITY = 2;

constexpr UBaseType_t TASK_CORE = 1;
constexpr uint16_t SENSOR_QUEUE_LENGTH = 1;
constexpr uint16_t ACTUATOR_QUEUE_LENGTH = 1;
constexpr uint16_t DIAGNOSTICS_QUEUE_LENGTH = 1;
constexpr uint16_t TASK_STACK_WORDS = 4096;

}  // namespace sigas

#endif  // SIGAS_RT_CONFIG_H
