#pragma once

#include <stdint.h>

namespace sigas_v2 {
namespace config {
// Academic stimulus thresholds only; neither gas calibration nor ANH limits.
constexpr uint16_t GAS_WARNING_ENTER_ADC_SIMULATION_ONLY = 1400;
constexpr uint16_t GAS_WARNING_EXIT_ADC_SIMULATION_ONLY = 1000;
constexpr uint16_t GAS_HIGH_ADC_SIMULATION_ONLY = 3000;
constexpr uint16_t GAS_SEVERE_ADC_SIMULATION_ONLY = 3900;
constexpr uint16_t GAS_REARM_ADC_SIMULATION_ONLY = 1000;
constexpr uint8_t GAS_CONFIRM_SAMPLES = 3;
constexpr uint8_t PRESSURE_CONFIRM_SAMPLES = 3;
constexpr uint8_t REARM_SAFE_SAMPLES = 3;
constexpr uint8_t RESET_DEBOUNCE_SAMPLES = 2;
constexpr int32_t PRESSURE_RAW_PER_MBAR = 100;
constexpr int32_t PRESSURE_MAX_RAW_SIMULATION_ONLY = 4000;
constexpr int32_t PRESSURE_LOW_RAW_SIMULATION_ONLY = 1200;
constexpr int32_t PRESSURE_SUPPLY_LOW_RAW_SIMULATION_ONLY = 800;
constexpr int32_t PRESSURE_HIGH_RAW_SIMULATION_ONLY = 3000;
constexpr int32_t PRESSURE_DELTA_RAW_SIMULATION_ONLY = 400;
constexpr int32_t PRESSURE_REVERSE_DELTA_RAW_SIMULATION_ONLY = 200;
constexpr int32_t PRESSURE_DROP_RAW_PER_SECOND_SIMULATION_ONLY = 2000;
constexpr uint64_t UNLOCALIZED_PERSISTENCE_US_SIMULATION_ONLY = 1000000;
constexpr uint64_t SENSOR_TIMEOUT_US = 350000;
constexpr uint64_t PRESSURE_TIMEOUT_US = 175000;
constexpr uint64_t INITIAL_TIMEOUT_US = 350000;
constexpr uint64_t GAS_PERIOD_US = 100000;
constexpr uint64_t PRESSURE_PERIOD_US = 50000;
constexpr uint64_t POST_CONFIRMATION_DEADLINE_US_ACADEMIC = 500000;
constexpr uint32_t ACTUATOR_WATCHDOG_MS = 200;
constexpr uint32_t I2C_TIMEOUT_MS = 5;
constexpr uint32_t I2C_HZ = 100000;
constexpr uint8_t GAS_PINS[3] = {34, 35, 32}; // Z1 kitchen, Z2 technical, Z3 living.
constexpr uint8_t VALVE_PINS[4] = {18, 25, 26, 27}; // VM, VK, VT, VL.
constexpr uint8_t I2C_SDA_PIN = 16;
constexpr uint8_t I2C_SCL_PIN = 17;
constexpr uint8_t PRESSURE_ADDRESSES[5] = {0x30, 0x31, 0x32, 0x33, 0x34};
constexpr uint8_t BUZZER_PIN = 19;
constexpr uint8_t GREEN_PIN = 21;
constexpr uint8_t RED_PIN = 22;
constexpr uint8_t RESET_PIN = 23;
constexpr uint8_t SERVO_OPEN_DEGREES = 20;
constexpr uint8_t SERVO_CLOSED_DEGREES = 110;
} // namespace config
} // namespace sigas_v2
