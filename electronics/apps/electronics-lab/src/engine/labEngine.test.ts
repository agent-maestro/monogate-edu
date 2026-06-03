import { describe, expect, it } from "vitest";
import {
  analyzeLab,
  buildPacketManifest,
  canRunTrace,
  defaultLabState,
  generateTrace,
  runThresholdReflex,
  traceToJsonl,
  validateTrace,
  WireId
} from "./labEngine";

const requiredWires: WireId[] = [
  "esp32_gnd_to_ground_rail",
  "esp32_3v3_to_power_rail",
  "pot_high_to_power_rail",
  "pot_low_to_ground_rail",
  "pot_wiper_to_gpio34",
  "gpio25_to_resistor",
  "resistor_to_led_anode",
  "led_cathode_to_ground_rail"
];

function wiredState() {
  const state = defaultLabState();
  requiredWires.forEach((wire) => {
    state.wires[wire] = true;
  });
  state.powered = true;
  return state;
}

describe("lab engine", () => {
  it("keeps the breadboard rails isolated until a fault is introduced", () => {
    const state = wiredState();
    expect(analyzeLab(state).some((report) => report.id === "rail_short")).toBe(false);
    state.faults.rail_short = true;
    expect(analyzeLab(state).find((report) => report.id === "rail_short")?.severity).toBe("stop");
  });

  it("detects every supported beginner fault", () => {
    const faultIds = [
      "rail_short",
      "pot_to_vin",
      "pot_wiper_wrong_pin",
      "led_no_resistor",
      "led_reversed",
      "led_wrong_gpio",
      "missing_common_ground",
      "buzzer_enabled",
      "button_miswire"
    ] as const;

    faultIds.forEach((fault) => {
      const state = wiredState();
      state.faults[fault] = true;
      expect(analyzeLab(state).map((report) => report.id)).toContain(fault);
    });
  });

  it("keeps missing common ground recovery specific after ESP32 GND reaches the rail", () => {
    const state = wiredState();
    state.wires.pot_low_to_ground_rail = false;
    state.faults.missing_common_ground = true;

    const report = analyzeLab(state).find((entry) => entry.id === "missing_common_ground");
    expect(report?.recovery).toContain("ESP32 GND is on the rail");
    expect(report?.recovery).toContain("pot GND outer leg");
  });

  it("matches threshold_reflex_v0 clamp behavior", () => {
    let previous = 0;
    const outputs = [0.55, 0.75, 1].map((potRaw) => {
      const result = runThresholdReflex(potRaw, previous);
      previous = result.safeOutput;
      return result;
    });

    expect(outputs[0].requestedOutput).toBeCloseTo(0.2);
    expect(outputs[1].requestedOutput).toBeCloseTo(0.4);
    expect(outputs[2].safeOutput).toBeLessThanOrEqual(0.85);
  });

  it("generates simulation-labeled JSONL frames and manifest", () => {
    const state = wiredState();
    expect(canRunTrace(state)).toBe(true);
    const frames = generateTrace(state, 12);
    const jsonl = traceToJsonl(frames);
    const manifest = buildPacketManifest(frames);

    expect(validateTrace(frames)).toContain("12/12 valid");
    expect(jsonl).toContain('"source":"mgelectronics_lab_sim"');
    expect(jsonl).toContain('"simulated":true');
    expect(jsonl).toContain('"hardware_observed":false');
    expect(jsonl).toContain('"live_serial_capture_performed":false');
    expect(jsonl).toContain('"certified_safety_claim":false');
    expect(jsonl).toContain('"production_controller_claim":false');
    expect(manifest.simulated).toBe(true);
    expect(manifest.hardware_observed).toBe(false);
    expect(manifest.live_serial_capture_performed).toBe(false);
    expect(manifest.certified_safety_claim).toBe(false);
    expect(manifest.production_controller_claim).toBe(false);
  });
});
