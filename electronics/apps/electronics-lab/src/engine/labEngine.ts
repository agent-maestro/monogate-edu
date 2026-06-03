export const SOURCE = "mgelectronics_lab_sim";
export const SCHEMA_VERSION = "monogate-electronics.trace-frame.v0";

export const thresholdParams = {
  threshold: 0.55,
  width: 0.1,
  maxStep: 0.2,
  safeOutputLimit: 0.85
};

export const analogDecisionParams = {
  onThreshold: 0.6,
  offThreshold: 0.52,
  safeOutputLimit: 0.85
};

export type WireId =
  | "esp32_gnd_to_ground_rail"
  | "esp32_3v3_to_power_rail"
  | "pot_high_to_power_rail"
  | "pot_low_to_ground_rail"
  | "pot_wiper_to_gpio34"
  | "ldr_high_to_power_rail"
  | "ldr_sense_to_gpio35"
  | "ldr_sense_to_divider_resistor"
  | "divider_resistor_to_ground_rail"
  | "gpio25_to_resistor"
  | "resistor_to_led_anode"
  | "led_cathode_to_ground_rail"
  | "gpio27_to_button"
  | "button_to_ground_rail"
  | "gpio26_to_buzzer_resistor"
  | "buzzer_resistor_to_buzzer_positive"
  | "gpio26_to_buzzer_positive"
  | "buzzer_negative_to_ground_rail";

export type FaultId =
  | "rail_short"
  | "pot_to_vin"
  | "pot_wiper_wrong_pin"
  | "ldr_divider_incomplete"
  | "led_no_resistor"
  | "led_reversed"
  | "led_wrong_gpio"
  | "missing_common_ground"
  | "buzzer_enabled"
  | "button_miswire";

export type LabState = {
  wires: Record<WireId, boolean>;
  faults: Record<FaultId, boolean>;
  potRaw: number;
  powered: boolean;
};

export type FaultReport = {
  id: FaultId | "incomplete_wiring";
  severity: "warning" | "stop";
  title: string;
  detail: string;
  recovery: string;
};

export type ReflexResult = {
  centered: number;
  target: number;
  requestedOutput: number;
  safeOutput: number;
  safetyMargin: number;
  guardAction: "pass_through" | "clamp_to_safe_output";
};

export type AnalogDecisionResult = {
  normalizedInput: number;
  decisionOn: boolean;
  requestedOutput: number;
  safeOutput: number;
  guardAction: "pass_through" | "deadband_hold" | "clamp_to_safe_output";
  thresholdState: "below_off" | "deadband" | "above_on";
};

export type TraceFrame = {
  schema_version: typeof SCHEMA_VERSION;
  kernel_id: "threshold_reflex_v0";
  source: typeof SOURCE;
  mode: "reflexcourse_reflex";
  simulated: true;
  hardware_observed: false;
  live_serial_capture_performed: false;
  certified_safety_claim: false;
  production_controller_claim: false;
  sample_index: number;
  timestamp_ms: number;
  pot_raw: number;
  input: { pot_raw: number };
  request: { centered: number; target: number; requested_output: number };
  outputs: {
    requested_output: number;
    safe_output: number;
    led: number;
    buzzer: number;
    stepper: number;
  };
  guard: {
    guard_action: ReflexResult["guardAction"];
    requested_output: number;
    safe_output: number;
    safety_margin: number;
    bottleneck: "output_duty_margin";
    simulated: true;
  };
};

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

const optionalWires: WireId[] = [
  "ldr_high_to_power_rail",
  "ldr_sense_to_gpio35",
  "ldr_sense_to_divider_resistor",
  "divider_resistor_to_ground_rail",
  "gpio27_to_button",
  "button_to_ground_rail",
  "gpio26_to_buzzer_resistor",
  "buzzer_resistor_to_buzzer_positive",
  "gpio26_to_buzzer_positive",
  "buzzer_negative_to_ground_rail"
];

const allWires: WireId[] = [...requiredWires, ...optionalWires];

export const defaultLabState = (): LabState => ({
  wires: Object.fromEntries(allWires.map((wire) => [wire, false])) as Record<WireId, boolean>,
  faults: {
    rail_short: false,
    pot_to_vin: false,
    pot_wiper_wrong_pin: false,
    ldr_divider_incomplete: false,
    led_no_resistor: false,
    led_reversed: false,
    led_wrong_gpio: false,
    missing_common_ground: false,
    buzzer_enabled: false,
    button_miswire: false
  },
  potRaw: 0.55,
  powered: false
});

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function runThresholdReflex(potRaw: number, previousOutput: number): ReflexResult {
  const centered = (clamp(potRaw) - thresholdParams.threshold) / thresholdParams.width;
  const target = clamp(centered + 0.5);
  const delta = clamp(target - previousOutput, -thresholdParams.maxStep, thresholdParams.maxStep);
  const requestedOutput = clamp(previousOutput + delta);
  const safeOutput = Math.min(requestedOutput, thresholdParams.safeOutputLimit);
  const safetyMargin = clamp(thresholdParams.safeOutputLimit - safeOutput, 0, thresholdParams.safeOutputLimit);
  return {
    centered,
    target,
    requestedOutput,
    safeOutput,
    safetyMargin,
    guardAction: requestedOutput > thresholdParams.safeOutputLimit ? "clamp_to_safe_output" : "pass_through"
  };
}

export function runThresholdReflexSteady(potRaw: number): ReflexResult {
  const centered = (clamp(potRaw) - thresholdParams.threshold) / thresholdParams.width;
  const target = clamp(centered + 0.5);
  const requestedOutput = target;
  const safeOutput = Math.min(requestedOutput, thresholdParams.safeOutputLimit);
  const safetyMargin = clamp(thresholdParams.safeOutputLimit - safeOutput, 0, thresholdParams.safeOutputLimit);
  return {
    centered,
    target,
    requestedOutput,
    safeOutput,
    safetyMargin,
    guardAction: requestedOutput > thresholdParams.safeOutputLimit ? "clamp_to_safe_output" : "pass_through"
  };
}

export function wiringComplete(state: LabState): boolean {
  return requiredWires.every((wire) => state.wires[wire]);
}

export function runAnalogDecision(rawInput: number, previousDecisionOn: boolean): AnalogDecisionResult {
  const normalizedInput = clamp(rawInput);
  const thresholdState =
    normalizedInput >= analogDecisionParams.onThreshold
      ? "above_on"
      : normalizedInput <= analogDecisionParams.offThreshold
        ? "below_off"
        : "deadband";
  const decisionOn =
    thresholdState === "above_on" ? true : thresholdState === "below_off" ? false : previousDecisionOn;
  const requestedOutput = decisionOn ? 1 : 0;
  const safeOutput = Math.min(requestedOutput, analogDecisionParams.safeOutputLimit);
  return {
    normalizedInput,
    decisionOn,
    requestedOutput,
    safeOutput,
    guardAction:
      requestedOutput > analogDecisionParams.safeOutputLimit
        ? "clamp_to_safe_output"
        : thresholdState === "deadband"
          ? "deadband_hold"
          : "pass_through",
    thresholdState
  };
}

export function analyzeLab(state: LabState): FaultReport[] {
  const reports: FaultReport[] = [];
  const incomplete = requiredWires.filter((wire) => !state.wires[wire]);
  const missingCommonGroundRecovery = (() => {
    if (!state.wires.esp32_gnd_to_ground_rail) return "Connect ESP32 GND to any rail you are using as the ground bus.";
    const missingGroundPaths: string[] = [];
    if (!state.wires.pot_low_to_ground_rail) missingGroundPaths.push("pot GND outer leg to the ground bus");
    if (!state.wires.led_cathode_to_ground_rail) missingGroundPaths.push("LED cathode to the ground bus");
    if (missingGroundPaths.length === 0) return "Re-check the ground jumpers; one component is not sharing the ESP32 ground net.";
    return `ESP32 GND is on the rail. Now connect ${missingGroundPaths.join(" and ")}.`;
  })();

  if (incomplete.length > 0) {
    reports.push({
      id: "incomplete_wiring",
      severity: "warning",
      title: "Reflex Course wiring is incomplete",
      detail: `${incomplete.length} required connection${incomplete.length === 1 ? "" : "s"} still need to be made before a valid reflex trace can run.`,
      recovery: "Follow the checklist in order: rails, potentiometer, resistor, LED, then LED cathode back to ground."
    });
  }

  if (state.faults.rail_short) {
    reports.push({
      id: "rail_short",
      severity: "stop",
      title: "3V3 is shorted to GND",
      detail: "The power rail and ground rail are directly connected. A real supply would current-limit or the board could reset.",
      recovery: "Remove the jumper between the red/+ rail and blue/- rail, then reset the simulated supply."
    });
  }

  if (state.faults.pot_to_vin) {
    reports.push({
      id: "pot_to_vin",
      severity: "stop",
      title: "Potentiometer is tied to VIN/5V",
      detail: "GPIO34 is an ESP32 ADC input and must not see more than 3.3V in this lab.",
      recovery: "Move the potentiometer high side back to the 3V3 rail."
    });
  }

  if (state.faults.pot_wiper_wrong_pin) {
    reports.push({
      id: "pot_wiper_wrong_pin",
      severity: "stop",
      title: "Potentiometer wiper is not on GPIO34",
      detail: "The reflex kernel reads `pot_raw` from GPIO34. A wrong pin leaves the input untrusted.",
      recovery: "Reconnect the middle potentiometer leg to GPIO34."
    });
  }

  if (state.faults.led_no_resistor) {
    reports.push({
      id: "led_no_resistor",
      severity: "stop",
      title: "LED path is missing the series resistor",
      detail: "The LED must not be driven directly from GPIO25 to ground.",
      recovery: "Place a 330 ohm resistor between GPIO25 and the LED anode."
    });
  }

  if (state.faults.led_reversed) {
    reports.push({
      id: "led_reversed",
      severity: "stop",
      title: "LED polarity is reversed",
      detail: "The LED cathode and anode are swapped, so the guarded output has no visible light.",
      recovery: "Put the long LED leg on the resistor side and the short leg on ground."
    });
  }

  if (state.faults.led_wrong_gpio) {
    reports.push({
      id: "led_wrong_gpio",
      severity: "stop",
      title: "LED is not on GPIO25",
      detail: "The firmware adapter maps `safe_output` to GPIO25 for the first reflex demo.",
      recovery: "Move the resistor input back to GPIO25."
    });
  }

  if (state.faults.missing_common_ground) {
    reports.push({
      id: "missing_common_ground",
      severity: "stop",
      title: "Common ground is missing",
      detail: "The potentiometer and LED need the same ESP32 ground reference.",
      recovery: missingCommonGroundRecovery
    });
  }

  if (state.faults.buzzer_enabled) {
    reports.push({
      id: "buzzer_enabled",
      severity: "warning",
      title: "Buzzer path is optional",
      detail: "GPIO26 is present for the next bench upgrade. The base LED reflex trace can still run without audible output.",
      recovery: "Disconnect USB before adding or moving the buzzer."
    });
  }

  if (state.faults.button_miswire) {
    reports.push({
      id: "button_miswire",
      severity: "warning",
      title: "Button is tied to a power net",
      detail: "The Lab 01B button should pull GPIO27 toward ground, not 3V3 or VIN.",
      recovery: "Move one button side to GPIO27 and the other side to the ESP32 ground net."
    });
  }

  if (state.faults.ldr_divider_incomplete) {
    reports.push({
      id: "ldr_divider_incomplete",
      severity: "warning",
      title: "LDR divider is incomplete",
      detail: "The Analog Decisions light input needs an LDR high side, ADC sense node, and 10K return to ground.",
      recovery: "Wire LDR to 3V3 and GPIO35, then tie the same GPIO35 sense row through the 10K divider resistor to GND."
    });
  }

  return reports;
}

export function canRunTrace(state: LabState): boolean {
  const reports = analyzeLab(state);
  return wiringComplete(state) && reports.every((report) => report.severity !== "stop");
}

export function generateTrace(state: LabState, frameCount = 18): TraceFrame[] {
  const frames: TraceFrame[] = [];
  let previous = 0;
  const inputPath = Array.from({ length: frameCount }, (_, index) => {
    if (frameCount <= 1) return state.potRaw;
    return clamp(index / (frameCount - 1));
  });

  inputPath.forEach((potRaw, index) => {
    const result = runThresholdReflex(potRaw, previous);
    previous = result.safeOutput;
    frames.push({
      schema_version: SCHEMA_VERSION,
      kernel_id: "threshold_reflex_v0",
      source: SOURCE,
      mode: "reflexcourse_reflex",
      simulated: true,
      hardware_observed: false,
      live_serial_capture_performed: false,
      certified_safety_claim: false,
      production_controller_claim: false,
      sample_index: index,
      timestamp_ms: index * 50,
      pot_raw: round(potRaw),
      input: { pot_raw: round(potRaw) },
      request: {
        centered: round(result.centered),
        target: round(result.target),
        requested_output: round(result.requestedOutput)
      },
      outputs: {
        requested_output: round(result.requestedOutput),
        safe_output: round(result.safeOutput),
        led: state.faults.led_reversed ? 0 : round(result.safeOutput),
        buzzer: 0,
        stepper: 0
      },
      guard: {
        guard_action: result.guardAction,
        requested_output: round(result.requestedOutput),
        safe_output: round(result.safeOutput),
        safety_margin: round(result.safetyMargin),
        bottleneck: "output_duty_margin",
        simulated: true
      }
    });
  });

  return frames;
}

export function validateTrace(frames: TraceFrame[]): string {
  const invalid = frames.filter((frame) => {
    return (
      frame.schema_version !== SCHEMA_VERSION ||
      frame.kernel_id !== "threshold_reflex_v0" ||
      frame.source !== SOURCE ||
      frame.hardware_observed !== false ||
      frame.simulated !== true ||
      frame.live_serial_capture_performed !== false ||
      frame.certified_safety_claim !== false ||
      frame.production_controller_claim !== false ||
      frame.outputs.safe_output > thresholdParams.safeOutputLimit
    );
  });
  return `Trace validation: ${frames.length - invalid.length}/${frames.length} valid, ${invalid.length} invalid\nsource: ${SOURCE}\nsimulated: true\nhardware_observed: false\nlive_serial_capture_performed: false\ncertified_safety_claim: false\nproduction_controller_claim: false`;
}

export function replayTrace(frames: TraceFrame[]): string {
  const clampCount = frames.filter((frame) => frame.guard.guard_action === "clamp_to_safe_output").length;
  const last = frames[frames.length - 1];
  return [
    "Replay summary: threshold_reflex_v0",
    `frames: ${frames.length}`,
    `clamped frames: ${clampCount}`,
    `last pot_raw: ${last ? last.pot_raw.toFixed(3) : "n/a"}`,
    `last safe_output: ${last ? last.outputs.safe_output.toFixed(3) : "n/a"}`,
    "This is simulated remote-lab evidence, not live hardware evidence."
  ].join("\n");
}

export function traceToJsonl(frames: TraceFrame[]): string {
  return frames.map((frame) => JSON.stringify(frame)).join("\n") + "\n";
}

export function buildPacketManifest(frames: TraceFrame[]) {
  return {
    demo_id: "mgelectronics_reflexcourse_guided_reflex_sim",
    kernel_id: "threshold_reflex_v0",
    source: SOURCE,
    simulated: true,
    hardware_observed: false,
    live_serial_capture_performed: false,
    certified_safety_claim: false,
    production_controller_claim: false,
    frame_count: frames.length,
    artifacts: [
      "simulated_trace.jsonl",
      "validation_output.txt",
      "replay_output.txt",
      "FINDINGS.md",
      "PACKET_MANIFEST.json",
      "wiring_snapshot.json",
      "scene_snapshot.png"
    ],
    boundary:
      "Remote-lab simulation evidence only. This packet does not claim live hardware behavior, certified safety, or production readiness."
  };
}

export function round(value: number): number {
  return Number(value.toFixed(6));
}

export const wireLabels: Record<WireId, string> = {
  esp32_gnd_to_ground_rail: "ESP32 GND -> ground bus",
  esp32_3v3_to_power_rail: "ESP32 3V3 -> power bus",
  pot_high_to_power_rail: "Pot outer leg -> 3V3 bus",
  pot_low_to_ground_rail: "Pot outer leg -> ground bus",
  pot_wiper_to_gpio34: "Pot wiper -> GPIO34",
  ldr_high_to_power_rail: "LDR high side -> 3V3 bus",
  ldr_sense_to_gpio35: "LDR sense node -> GPIO35",
  ldr_sense_to_divider_resistor: "LDR sense node -> 10K divider resistor",
  divider_resistor_to_ground_rail: "10K divider resistor -> ground bus",
  gpio25_to_resistor: "GPIO25 -> resistor",
  resistor_to_led_anode: "Resistor -> LED anode",
  led_cathode_to_ground_rail: "LED cathode -> ground bus",
  gpio27_to_button: "GPIO27 -> tactile button",
  button_to_ground_rail: "Tactile button -> ground bus",
  gpio26_to_buzzer_resistor: "GPIO26 -> 1K buzzer resistor",
  buzzer_resistor_to_buzzer_positive: "1K buzzer resistor -> buzzer positive",
  gpio26_to_buzzer_positive: "GPIO26 -> buzzer positive",
  buzzer_negative_to_ground_rail: "Buzzer negative -> ground bus"
};

export const faultLabels: Record<FaultId, string> = {
  rail_short: "Short 3V3 to GND",
  pot_to_vin: "Move pot to VIN/5V",
  pot_wiper_wrong_pin: "Move wiper off GPIO34",
  ldr_divider_incomplete: "LDR divider incomplete",
  led_no_resistor: "Remove LED resistor",
  led_reversed: "Reverse LED",
  led_wrong_gpio: "Move LED off GPIO25",
  missing_common_ground: "Remove common ground",
  buzzer_enabled: "Buzzer path present",
  button_miswire: "Miswire button"
};
