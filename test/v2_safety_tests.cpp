#include <cmath>
#include <cstdlib>
#include <iostream>
#include "v2/safety.h"

using namespace sigas_v2;
static unsigned checks = 0;
static void check(bool ok, const char* label) {
  ++checks;
  if (!ok) { std::cerr << "FAIL: " << label << '\n'; std::exit(1); }
}
struct Rig {
  uint64_t now = 1000000;
  Snapshot sample{};
  ZoneSafetyEvaluator safety{now};
  Decision result{};
  Rig() {
    sample.gas.validMask = 7;
    for (auto& adc : sample.gas.adc) adc = 410;
    for (size_t p = 0; p < PRESSURES; ++p) {
      sample.pressure[p].valid = true;
      sample.pressure[p].raw = p < 2 ? 2000 : 1900;
    }
  }
  Decision step(bool gas = true) {
    now += 50000;
    ++sample.sequence;
    if (gas) { ++sample.gas.sequence; sample.gas.timestampUs = now; }
    for (auto& p : sample.pressure) { ++p.sequence; p.timestampUs = now; }
    result = safety.evaluate(sample, now);
    return result;
  }
  void gasCycle() { step(false); step(true); }
  void boot() {
    for (int i = 0; i < 3; ++i) gasCycle();
    check(result.state == State::Normal && result.closedMask == 0, "safe boot");
  }
  void high(size_t zone) {
    sample.gas.adc[zone] = 3600;
    for (int i = 0; i < 3; ++i) gasCycle();
  }
};

int main() {
  check(validPressureRaw(0) && validPressureRaw(4000) && !validPressureRaw(-1) && !validPressureRaw(4001), "pressure ranges");
  check(std::abs(pressureMbar(1950) - 19.5) < .001, "central conversion");
  uint8_t bytes[8] = {0x07, 0xd0, 0, 0, 0, 1, 0, 0};
  for (int i = 0; i < 7; ++i) bytes[7] ^= bytes[i];
  int32_t raw = 0; uint32_t seq = 0;
  check(decodePressure(bytes, 8, raw, seq) && raw == 2000 && seq == 1, "pressure frame");
  check(!decodePressure(bytes, 7, raw, seq), "truncated pressure");
  bytes[2] ^= 1;
  check(!decodePressure(bytes, 8, raw, seq), "pressure checksum");
  SampleCursor cursor;
  check(cursor.observe(0xffffffffU, 100, 100, 50) == SampleUpdate::New, "first sequence");
  check(cursor.observe(0, 120, 120, 50) == SampleUpdate::New, "rollover valid");
  check(cursor.observe(0, 120, 120, 50) == SampleUpdate::Repeat, "duplicate not new");
  check(cursor.observe(0, 121, 121, 50) == SampleUpdate::Invalid, "duplicate timestamp changed");
  check(cursor.observe(4, 130, 130, 50) == SampleUpdate::Gap, "gap detected");
  check(cursor.observe(3, 135, 135, 50) == SampleUpdate::Invalid, "backwards sequence");
  check(!fresh(200, 201, 50) && !fresh(200, 150, 50), "future and stale boundary");
  {
    ZoneSafetyEvaluator safety(100);
    Snapshot empty;
    check(safety.evaluate(empty, 101).state == State::Startup, "initial grace closed");
    const auto d = safety.evaluate(empty, 350100);
    check(d.state == State::Fault && d.closedMask == ALL_CLOSED, "initial timeout");
  }
  for (size_t z = 0; z < ZONES; ++z) {
    Rig r; r.boot(); r.high(z);
    check(r.result.state == State::SafeLatched && r.result.closedMask == valveBit(z), "local gas isolation");
    check(r.result.affectedZones == zoneBit(z) && r.result.event == Event::GasLeak, "zone identity");
    check(r.result.gasConfirmedUs - r.result.gasFirstUs == 200000, "gas timing semantic");
    r.sample.gas.adc[z] = 410;
    for (int i = 0; i < 6; ++i) r.gasCycle();
    check(r.result.closedMask == valveBit(z), "no automatic reopen");
    r.sample.gas.resetPressed = true;
    r.gasCycle(); r.gasCycle();
    check(r.result.state == State::Normal && r.result.closedMask == 0 && r.result.resetAccepted, "manual safe rearm");
  }
  {
    Rig r; r.boot(); r.sample.gas.adc[0] = 3600;
    r.gasCycle(); r.step(false); r.step(false);
    check(r.result.closedMask == 0, "repeated gas frame cannot confirm");
    r.sample.gas.sequence += 2;
    r.step(); r.gasCycle();
    check(r.result.closedMask == 0, "gap resets gas confirmation");
    r.gasCycle(); check(r.result.closedMask == valveBit(0), "new consecutive sequence confirms");
  }
  {
    Rig r; r.boot(); r.sample.pressure[4].raw = 500;
    r.step(); r.sample.pressure[4].raw = 1900;
    for (int i = 0; i < 6; ++i) r.gasCycle();
    check(r.result.state == State::Normal && r.result.closedMask == 0, "A transient pressure spike");
  }
  {
    Rig r; r.boot(); r.sample.pressure[4].raw = 500;
    r.step(); r.step(); r.step();
    check(r.result.state == State::Warning && r.result.event == Event::PressureAnomaly, "B persistent anomaly no rupture");
    r.high(2);
    if (r.result.event != Event::PipeRupture || r.result.closedMask != valveBit(2)) {
      std::cerr << "LIVING_RUPTURE_CONTEXT event=" << name(r.result.event)
                << " state=" << name(r.result.state)
                << " closedMask=" << static_cast<unsigned>(r.result.closedMask)
                << " affectedZones=" << static_cast<unsigned>(r.result.affectedZones)
                << " pressureFirstUs=" << r.result.pressureFirstUs
                << " pressureConfirmedUs=" << r.result.pressureConfirmedUs
                << " gasFirstUs=" << r.result.gasFirstUs
                << " gasConfirmedUs=" << r.result.gasConfirmedUs << '\n';
    }
    check(r.result.event == Event::PipeRupture && r.result.closedMask == valveBit(2), "C correlated living rupture");
    check(r.result.pressureConfirmedUs > r.result.pressureFirstUs, "pressure timestamps");
    r.sample.pressure[1].raw = 500;
    r.step(); r.step(); r.step();
    check(r.result.closedMask == ALL_CLOSED, "upstream loss after local isolation escalates");
  }
  {
    Rig r; r.boot(); r.sample.pressure[2].raw = 500; r.sample.pressure[4].raw = 500;
    r.step(); r.step(); r.step();
    check(r.result.event == Event::MultiZone && r.result.closedMask == ALL_CLOSED, "D multi pressure close");
  }
  {
    Rig r; r.boot(); for (auto& p : r.sample.pressure) p.raw = 500;
    r.step(); r.step(); r.step();
    check(r.result.event == Event::SupplyLoss && r.result.closedMask == ALL_CLOSED, "E supply loss not rupture");
  }
  {
    Rig r; r.boot(); const auto old = r.sample.pressure[4];
    for (int i = 0; i < 4; ++i) {
      r.step(); r.sample.pressure[4] = old;
      // Separate evaluator starts from latest real sample to test frozen sensor contract below.
    }
    SampleCursor frozen;
    frozen.observe(old.sequence, old.timestampUs, old.timestampUs, config::PRESSURE_TIMEOUT_US);
    check(frozen.observe(old.sequence, old.timestampUs, r.now, config::PRESSURE_TIMEOUT_US) == SampleUpdate::Invalid, "F PL stale");
  }
  {
    Rig r; r.boot(); r.high(0); r.high(2);
    check(r.result.closedMask == ALL_CLOSED && r.result.event == Event::MultiZone, "sequential multi zone escalates");
  }
  {
    Rig r; r.boot(); r.sample.gas.adc[0] = 4000;
    r.gasCycle(); r.gasCycle(); r.gasCycle();
    check(r.result.closedMask == ALL_CLOSED, "severe gas master");
  }
  {
    Rig r; r.sample.gas.adc[0] = 3600;
    r.gasCycle(); r.gasCycle(); r.gasCycle();
    check(r.result.closedMask == ALL_CLOSED, "startup high must not open other valves");
  }
  {
    Rig r; r.boot(); r.high(2);
    r.sample.gas.resetPressed = true;
    r.gasCycle(); r.gasCycle();
    r.sample.gas.adc[2] = 410;
    for (int i = 0; i < 6; ++i) r.gasCycle();
    check(r.result.closedMask == valveBit(2), "unsafe press held later safe never rearms");
  }
  for (int failure = 0; failure < 5; ++failure) {
    Rig r; r.boot();
    if (failure == 0) r.sample.pressure[4].valid = false;
    if (failure == 1) r.sample.pressure[4].raw = -1;
    if (failure == 2) r.sample.pressure[4].raw = 4001;
    if (failure == 3) r.sample.gas.validMask = 3;
    if (failure == 4) r.sample.gas.adc[2] = 5000;
    r.step();
    check(r.result.state == State::Fault && r.result.closedMask == ALL_CLOSED, "invalid sensor fail safe");
  }
  {
    Rig r; r.boot(); r.now += config::SENSOR_TIMEOUT_US;
    r.result = r.safety.evaluate(r.sample, r.now);
    check(r.result.state == State::Fault && r.result.closedMask == ALL_CLOSED, "all sensors stale");
  }
  {
    Rig r; r.boot(); r.sample.pressure[4].raw = 500;
    for (int i = 0; i < 12; ++i) r.gasCycle();
    check(r.result.event == Event::Unlocalized && r.result.closedMask == ALL_CLOSED, "persistent unlocalized closes master");
  }
  std::cout << "V2_HOST_SAFETY: PASS checks=" << checks << '\n';
}
