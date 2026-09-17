#pragma once

#include "v2/pressure.h"

namespace sigas_v2 {
class ZoneSafetyEvaluator {
 public:
  explicit ZoneSafetyEvaluator(uint64_t startedUs) : startedUs_(startedUs) {}

  Decision evaluate(const Snapshot& sample, uint64_t now) {
    Decision out = last_;
    out.sequence = sample.sequence;
    out.decisionUs = now;
    out.timingEvent = false;
    out.resetAccepted = false;
    bool fault = false;
    bool allValid = true;
    bool gasNew = false;
    bool pressureNew[PRESSURES]{};
    bool pressureGap[PRESSURES]{};
    if (!gasCursor_.seen && sample.gas.timestampUs == 0 && now - startedUs_ < config::INITIAL_TIMEOUT_US) {
      allValid = false;
    } else {
      const auto update = gasCursor_.observe(sample.gas.sequence, sample.gas.timestampUs, now, config::SENSOR_TIMEOUT_US);
      fault = update == SampleUpdate::Invalid || sample.gas.validMask != 7;
      gasNew = update == SampleUpdate::New || update == SampleUpdate::Gap;
      if (update == SampleUpdate::Gap) { clearGasCandidates(); safeCount_ = 0; resetCount_ = 0; releaseObserved_ = false; }
      for (size_t z = 0; z < ZONES; ++z) if (sample.gas.adc[z] > 4095) fault = true;
    }
    for (size_t p = 0; p < PRESSURES; ++p) {
      const auto& reading = sample.pressure[p];
      if (!pressureCursor_[p].seen && reading.timestampUs == 0 && now - startedUs_ < config::INITIAL_TIMEOUT_US) {
        allValid = false;
        continue;
      }
      const auto update = pressureCursor_[p].observe(reading.sequence, reading.timestampUs, now, config::PRESSURE_TIMEOUT_US);
      if (!reading.valid || !validPressureRaw(reading.raw) || update == SampleUpdate::Invalid) fault = true;
      pressureNew[p] = update == SampleUpdate::New || update == SampleUpdate::Gap;
      pressureGap[p] = update == SampleUpdate::Gap;
    }
    if (fault) {
      clearGasCandidates();
      for (auto& pressure : branches_) pressure.clear();
      supply_.clear(); manifold_.clear(); highPressure_.clear(); inconsistent_.clear();
      safeCount_ = 0;
      resetCount_ = 0;
      releaseObserved_ = false;
      latch(out, Event::SensorFault, 0, true, now);
      out.state = State::Fault;
      return finish(out);
    }
    if (!allValid) return finish(out);

    if (gasNew) {
      for (size_t z = 0; z < ZONES; ++z) {
        const auto raw = sample.gas.adc[z];
        out.levels[z] = raw >= config::GAS_HIGH_ADC_SIMULATION_ONLY ? Level::High :
            raw >= config::GAS_WARNING_ENTER_ADC_SIMULATION_ONLY ||
            (out.levels[z] != Level::Normal && raw >= config::GAS_WARNING_EXIT_ADC_SIMULATION_ONLY) ? Level::Warning : Level::Normal;
        gas_[z].observe(out.levels[z] == Level::High, sample.gas.timestampUs, now, config::GAS_CONFIRM_SAMPLES);
      }
    }
    const int32_t p0 = sample.pressure[0].raw;
    const int32_t p1 = sample.pressure[1].raw;
    if (pressureNew[0]) {
      if (pressureGap[0]) { supply_.clear(); highPressure_.clear(); }
      supply_.observe(p0 < config::PRESSURE_SUPPLY_LOW_RAW_SIMULATION_ONLY, sample.pressure[0].timestampUs, now, config::PRESSURE_CONFIRM_SAMPLES);
      highPressure_.observe(p0 > config::PRESSURE_HIGH_RAW_SIMULATION_ONLY, sample.pressure[0].timestampUs, now, config::PRESSURE_CONFIRM_SAMPLES);
    }
    if (pressureNew[1] && pressureNew[0]) {
      if (pressureGap[1] || pressureGap[0]) manifold_.clear();
      // A closed master can legitimately leave downstream pressure low.
      manifold_.observe(!(out.closedMask & MASTER_BIT) && p0 >= config::PRESSURE_LOW_RAW_SIMULATION_ONLY &&
          p1 < config::PRESSURE_LOW_RAW_SIMULATION_ONLY && p0 - p1 >= config::PRESSURE_DELTA_RAW_SIMULATION_ONLY,
          sample.pressure[1].timestampUs, now, config::PRESSURE_CONFIRM_SAMPLES);
    }
    bool inconsistent = false;
    bool allPressureNew = true;
    for (size_t p = 0; p < PRESSURES; ++p) allPressureNew &= pressureNew[p];
    for (size_t z = 0; z < ZONES; ++z) {
      const auto& reading = sample.pressure[branchNode(z)];
      if (pressureNew[branchNode(z)] && pressureNew[1]) {
        // Once isolated, low residual pressure alone is not a new rupture.
        if (out.closedMask & valveBit(z)) {
          branches_[z].observeBaseline(reading.raw, reading.timestampUs);
        }
        else branches_[z].observe(p1, reading.raw, reading.timestampUs, now,
                                  pressureGap[branchNode(z)] || pressureGap[1]);
      }
      inconsistent |= !(out.closedMask & valveBit(z)) && reading.raw - p1 > config::PRESSURE_REVERSE_DELTA_RAW_SIMULATION_ONLY;
    }
    if (allPressureNew) {
      bool gap = false;
      for (bool value : pressureGap) gap |= value;
      if (gap) inconsistent_.clear();
      inconsistent_.observe(inconsistent, sample.pressure[1].timestampUs, now, config::PRESSURE_CONFIRM_SAMPLES);
    }

    uint8_t confirmedGas = 0;
    uint8_t confirmedPressure = 0;
    bool severe = false;
    for (size_t z = 0; z < ZONES; ++z) {
      if (gas_[z].confirmed) {
        confirmedGas |= zoneBit(z);
        severe |= sample.gas.adc[z] >= config::GAS_SEVERE_ADC_SIMULATION_ONLY;
      }
      if (branches_[z].candidate.confirmed) confirmedPressure |= zoneBit(z);
    }
    if (supply_.confirmed) latch(out, Event::SupplyLoss, 0, true, supply_.confirmed);
    else if (highPressure_.confirmed) latch(out, Event::Overpressure, 0, true, highPressure_.confirmed);
    else if (manifold_.confirmed || inconsistent_.confirmed) latch(out, Event::Unlocalized, 0, true, now);
    else if (multiple(static_cast<uint8_t>(confirmedGas | out.affectedZones)) || multiple(confirmedPressure)) {
      latch(out, Event::MultiZone, static_cast<uint8_t>(confirmedGas | confirmedPressure | out.affectedZones), true, now);
    } else if (confirmedGas) {
      for (size_t z = 0; z < ZONES; ++z) if (confirmedGas & zoneBit(z)) {
        const auto& pressure = branches_[z].candidate;
        const bool rupture = pressure.confirmed && branches_[z].rapidDuringCandidate;
        const auto oldMask = out.closedMask;
        latch(out, severe ? Event::Unlocalized : rupture ? Event::PipeRupture : Event::GasLeak,
              zoneBit(z), severe, gas_[z].confirmed);
        if (out.closedMask != oldMask || out.timingEvent) {
          out.gasFirstUs = gas_[z].first;
          out.gasConfirmedUs = gas_[z].confirmed;
          out.pressureFirstUs = pressure.first;
          out.pressureConfirmedUs = pressure.confirmed;
        }
      }
    } else {
      for (size_t z = 0; z < ZONES; ++z) {
        const auto& candidate = branches_[z].candidate;
        if (candidate.confirmed && now - candidate.first >= config::UNLOCALIZED_PERSISTENCE_US_SIMULATION_ONLY) {
          latch(out, Event::Unlocalized, zoneBit(z), true, now);
          break;
        }
      }
    }

    bool safe = p0 >= config::PRESSURE_LOW_RAW_SIMULATION_ONLY && p0 <= config::PRESSURE_HIGH_RAW_SIMULATION_ONLY &&
                p1 >= config::PRESSURE_LOW_RAW_SIMULATION_ONLY && p1 <= config::PRESSURE_HIGH_RAW_SIMULATION_ONLY &&
                p0 - p1 < config::PRESSURE_DELTA_RAW_SIMULATION_ONLY;
    for (size_t z = 0; z < ZONES; ++z) {
      const auto raw = sample.pressure[branchNode(z)].raw;
      safe &= sample.gas.adc[z] < config::GAS_REARM_ADC_SIMULATION_ONLY && raw >= config::PRESSURE_LOW_RAW_SIMULATION_ONLY &&
              raw <= config::PRESSURE_HIGH_RAW_SIMULATION_ONLY && p1 - raw < config::PRESSURE_DELTA_RAW_SIMULATION_ONLY &&
              raw - p1 <= config::PRESSURE_REVERSE_DELTA_RAW_SIMULATION_ONLY;
    }
    if (!safe) safeCount_ = 0;
    if (gasNew) {
      if (safe && safeCount_ < config::REARM_SAFE_SAMPLES) ++safeCount_;
      if (latched_) {
        if (!sample.gas.resetPressed) { releaseObserved_ = true; resetCount_ = 0; }
        else if (releaseObserved_) {
          if (resetCount_ < config::RESET_DEBOUNCE_SAMPLES) ++resetCount_;
          if (resetCount_ >= config::RESET_DEBOUNCE_SAMPLES) {
            releaseObserved_ = false;
            resetCount_ = 0;
            if (safeCount_ >= config::REARM_SAFE_SAMPLES && safe) {
              latched_ = false;
              out = Decision{};
              out.sequence = sample.sequence;
              out.decisionUs = now;
              out.closedMask = 0;
              out.state = State::Normal;
              out.event = Event::ResetAccepted;
              out.resetAccepted = true;
              clearGasCandidates();
            }
          }
        }
      } else if (out.state == State::Startup && safeCount_ >= config::REARM_SAFE_SAMPLES) {
        out.state = State::Normal;
        out.closedMask = 0;
      }
    }
    if (!latched_ && out.state != State::Startup) {
      bool warning = confirmedPressure != 0;
      for (auto level : out.levels) warning |= level != Level::Normal;
      out.state = warning ? State::Warning : State::Normal;
      if (!out.resetAccepted) out.event = confirmedPressure ? Event::PressureAnomaly : Event::None;
      out.affectedZones = confirmedPressure;
    }
    return finish(out);
  }

 private:
  uint64_t startedUs_;
  SampleCursor gasCursor_{};
  SampleCursor pressureCursor_[PRESSURES]{};
  Candidate gas_[ZONES]{};
  PressureClassifier branches_[ZONES]{};
  Candidate supply_{}, manifold_{}, highPressure_{}, inconsistent_{};
  Decision last_{};
  bool latched_ = false;
  bool releaseObserved_ = false;
  uint8_t safeCount_ = 0;
  uint8_t resetCount_ = 0;
  uint32_t eventId_ = 0;
  static bool multiple(uint8_t bits) { return bits && (bits & (bits - 1)); }
  void clearGasCandidates() { for (auto& candidate : gas_) candidate.clear(); }
  void latch(Decision& out, Event event, uint8_t zones, bool master, uint64_t confirmed) {
    if (out.state == State::Startup) master = true;
    uint8_t mask = master ? ALL_CLOSED : 0;
    for (size_t z = 0; z < ZONES; ++z) if (zones & zoneBit(z)) mask |= valveBit(z);
    if (!latched_ || (mask & ~out.closedMask)) {
      // First event replaces the startup mask, subsequent events only add closes.
      out.closedMask = latched_ ? static_cast<uint8_t>(out.closedMask | mask) : mask;
      out.event = event;
      out.affectedZones = latched_ ? static_cast<uint8_t>(out.affectedZones | zones) : zones;
      out.eventId = ++eventId_;
      out.triggerConfirmedUs = confirmed;
      out.timingEvent = true;
      out.gasFirstUs = out.gasConfirmedUs = out.pressureFirstUs = out.pressureConfirmedUs = 0;
      safeCount_ = 0;
      resetCount_ = 0;
      releaseObserved_ = false;
    }
    latched_ = true;
    if (out.state != State::Fault) out.state = State::SafeLatched;
  }
  Decision finish(Decision out) {
    out.buzzer = latched_;
    out.green = !latched_ && out.state != State::Startup;
    out.red = out.state != State::Normal;
    last_ = out;
    return out;
  }
};
} // namespace sigas_v2
