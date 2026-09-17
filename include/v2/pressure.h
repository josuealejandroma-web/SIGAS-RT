#pragma once

#include "v2/config.h"
#include "v2/types.h"

namespace sigas_v2 {
inline bool validPressureRaw(int32_t raw) {
  return raw >= 0 && raw <= config::PRESSURE_MAX_RAW_SIMULATION_ONLY;
}
inline double pressureMbar(int32_t raw) {
  return static_cast<double>(raw) / config::PRESSURE_RAW_PER_MBAR;
}
inline bool fresh(uint64_t now, uint64_t timestamp, uint64_t timeout) {
  return timestamp > 0 && timestamp <= now && now - timestamp < timeout;
}

enum class SampleUpdate { New, Gap, Repeat, Invalid };
struct SampleCursor {
  bool seen = false;
  uint32_t sequence = 0;
  uint64_t timestamp = 0;
  SampleUpdate observe(uint32_t seq, uint64_t stamp, uint64_t now, uint64_t timeout) {
    if (!fresh(now, stamp, timeout)) return SampleUpdate::Invalid;
    if (!seen) { seen = true; sequence = seq; timestamp = stamp; return SampleUpdate::New; }
    const uint32_t delta = seq - sequence;
    if (delta == 0) return stamp == timestamp ? SampleUpdate::Repeat : SampleUpdate::Invalid;
    if (delta >= 0x80000000U || stamp <= timestamp) return SampleUpdate::Invalid;
    sequence = seq;
    timestamp = stamp;
    return delta == 1 ? SampleUpdate::New : SampleUpdate::Gap;
  }
};

struct Candidate {
  uint8_t count = 0;
  uint64_t first = 0;
  uint64_t confirmed = 0;
  void clear() { count = 0; first = 0; confirmed = 0; }
  void observe(bool condition, uint64_t sampleUs, uint64_t nowUs, uint8_t required) {
    if (!condition) { clear(); return; }
    if (!count) first = sampleUs;
    if (count < required) ++count;
    if (count == required && !confirmed) confirmed = nowUs;
  }
};

struct PressureClassifier {
  Candidate candidate{};
  int32_t previousRaw = 0;
  uint64_t previousUs = 0;
  int32_t deltaRaw = 0;
  int64_t dropRawPerSecond = 0;
  bool rapidDuringCandidate = false;
  void clear() { *this = PressureClassifier{}; }
  void observeBaseline(int32_t downstream, uint64_t stamp) {
    candidate.clear();
    previousRaw = downstream;
    previousUs = stamp;
    deltaRaw = 0;
    dropRawPerSecond = 0;
    rapidDuringCandidate = false;
  }
  void observe(int32_t upstream, int32_t downstream, uint64_t stamp, uint64_t now, bool gap) {
    if (gap) clear();
    deltaRaw = upstream - downstream;
    dropRawPerSecond = previousUs && stamp > previousUs
        ? static_cast<int64_t>(previousRaw - downstream) * 1000000 / static_cast<int64_t>(stamp - previousUs) : 0;
    previousRaw = downstream;
    previousUs = stamp;
    const bool anomaly = upstream >= config::PRESSURE_LOW_RAW_SIMULATION_ONLY &&
        downstream < config::PRESSURE_LOW_RAW_SIMULATION_ONLY &&
        deltaRaw >= config::PRESSURE_DELTA_RAW_SIMULATION_ONLY;
    candidate.observe(anomaly, stamp, now, config::PRESSURE_CONFIRM_SAMPLES);
    if (!anomaly) rapidDuringCandidate = false;
    else if (dropRawPerSecond >= config::PRESSURE_DROP_RAW_PER_SECOND_SIMULATION_ONLY) rapidDuringCandidate = true;
  }
};

// Academic I2C frame: signed centimbar BE, uint32 sequence BE, status, XOR check.
inline bool decodePressure(const uint8_t* bytes, size_t count, int32_t& raw, uint32_t& seq) {
  if (count != 8) return false;
  uint8_t checksum = 0;
  for (size_t i = 0; i < 7; ++i) checksum ^= bytes[i];
  if (checksum != bytes[7] || bytes[6] != 0) return false;
  const uint16_t packed = static_cast<uint16_t>((bytes[0] << 8) | bytes[1]);
  raw = packed < 0x8000 ? packed : static_cast<int32_t>(packed) - 65536;
  seq = (static_cast<uint32_t>(bytes[2]) << 24) | (static_cast<uint32_t>(bytes[3]) << 16) |
        (static_cast<uint32_t>(bytes[4]) << 8) | bytes[5];
  return validPressureRaw(raw);
}
} // namespace sigas_v2
