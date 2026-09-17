#pragma once

#include <stddef.h>
#include <stdint.h>

namespace sigas_v2 {
enum class Zone : uint8_t { Kitchen, Technical, Living, Count };
enum class PressureNode : uint8_t { P0, P1, PK, PT, PL, Count };
enum class Valve : uint8_t { Master, Kitchen, Technical, Living, Count };
enum class Level : uint8_t { Normal, Warning, High };
enum class State : uint8_t { Startup, Normal, Warning, SafeLatched, Fault };
enum class Event : uint8_t {
  None, GasLeak, PressureAnomaly, PipeRupture, SensorFault,
  MultiZone, SupplyLoss, Unlocalized, Overpressure, CommandTimeout, ResetAccepted
};
constexpr size_t ZONES = static_cast<size_t>(Zone::Count);
constexpr size_t PRESSURES = static_cast<size_t>(PressureNode::Count);
constexpr size_t VALVES = static_cast<size_t>(Valve::Count);
constexpr uint8_t ALL_CLOSED = 15;
constexpr uint8_t MASTER_BIT = 1;
constexpr uint8_t zoneBit(size_t z) { return static_cast<uint8_t>(1U << z); }
constexpr uint8_t valveBit(size_t z) { return static_cast<uint8_t>(1U << (z + 1)); }
constexpr size_t branchNode(size_t z) { return z + 2; }

struct GasSample {
  uint16_t adc[ZONES]{};
  uint8_t validMask = 0;
  bool resetPressed = false;
  uint32_t sequence = 0;
  uint64_t timestampUs = 0;
};
struct PressureReading {
  int32_t raw = 0;
  bool valid = false;
  uint32_t sequence = 0;
  uint64_t timestampUs = 0;
};
struct Snapshot {
  GasSample gas{};
  PressureReading pressure[PRESSURES]{};
  uint32_t sequence = 0;
};
struct Decision {
  State state = State::Startup;
  Event event = Event::None;
  uint8_t affectedZones = 0;
  uint8_t closedMask = ALL_CLOSED;
  Level levels[ZONES]{};
  bool buzzer = false;
  bool green = false;
  bool red = true;
  bool timingEvent = false;
  bool resetAccepted = false;
  uint32_t eventId = 0;
  uint32_t sequence = 0;
  uint64_t pressureFirstUs = 0;
  uint64_t pressureConfirmedUs = 0;
  uint64_t gasFirstUs = 0;
  uint64_t gasConfirmedUs = 0;
  uint64_t triggerConfirmedUs = 0;
  uint64_t decisionUs = 0;
};
struct Command {
  Snapshot snapshot{};
  Decision decision{};
  uint64_t sentUs = 0;
};
struct Applied {
  Command command{};
  uint64_t receivedUs = 0;
  uint64_t appliedUs = 0;
  uint8_t closedMask = ALL_CLOSED;
  bool watchdog = false;
};

inline const char* name(Level v) {
  switch (v) { case Level::Normal: return "NORMAL"; case Level::Warning: return "WARNING"; default: return "HIGH"; }
}
inline const char* name(State v) {
  switch (v) {
    case State::Startup: return "SYSTEM_STARTUP";
    case State::Normal: return "SYSTEM_NORMAL";
    case State::Warning: return "SYSTEM_WARNING";
    case State::SafeLatched: return "SYSTEM_SAFE_LATCHED";
    default: return "SYSTEM_FAULT";
  }
}
inline const char* name(Event v) {
  switch (v) {
    case Event::None: return "NONE";
    case Event::GasLeak: return "GAS_LEAK";
    case Event::PressureAnomaly: return "PRESSURE_ANOMALY";
    case Event::PipeRupture: return "PIPE_RUPTURE";
    case Event::SensorFault: return "SENSOR_FAULT";
    case Event::MultiZone: return "MULTI_ZONE";
    case Event::SupplyLoss: return "SUPPLY_LOSS";
    case Event::Unlocalized: return "UNLOCALIZED";
    case Event::Overpressure: return "OVERPRESSURE";
    case Event::CommandTimeout: return "COMMAND_TIMEOUT";
    default: return "RESET_ACCEPTED";
  }
}
} // namespace sigas_v2
