export type EvidenceBridgeEntry = {
  kernel: string;
  title: string;
  course: string;
  evidencePacket: string;
  frames: number;
  guardActions: Record<string, number>;
  validatorStatus: "pass";
  replayStatus: "pass";
  claimFlags: {
    simulated: true;
    hardware_observed: false;
    live_serial_capture_performed: false;
    certified_safety_claim: false;
    production_controller_claim: false;
  };
};

export const evidenceBridge = {
  date: "2026-05-27",
  status: "pass",
  boundary:
    "These packets are simulated evidence. They validate model, replay, and guard behavior. They are not hardware observations.",
  entries: [
    {
      kernel: "rc_transient_v0",
      title: "RC transient",
      course: "courses/006-ee-math-kernels/lesson-01-rc-transient-model.md",
      evidencePacket: "evidence/ee_math_kernels/rc_transient_v0_simulated_packet_2026_05_27/evidence_packet.json",
      frames: 8,
      guardActions: { pass_through: 8 },
      validatorStatus: "pass",
      replayStatus: "pass",
      claimFlags: {
        simulated: true,
        hardware_observed: false,
        live_serial_capture_performed: false,
        certified_safety_claim: false,
        production_controller_claim: false
      }
    },
    {
      kernel: "voltage_divider_v0",
      title: "Voltage divider",
      course: "courses/006-ee-math-kernels/lesson-02-voltage-divider.md",
      evidencePacket: "evidence/ee_math_kernels/voltage_divider_v0_simulated_packet_2026_05_27/evidence_packet.json",
      frames: 6,
      guardActions: { pass_through: 5, out_of_model_bounds: 1 },
      validatorStatus: "pass",
      replayStatus: "pass",
      claimFlags: {
        simulated: true,
        hardware_observed: false,
        live_serial_capture_performed: false,
        certified_safety_claim: false,
        production_controller_claim: false
      }
    },
    {
      kernel: "logic_guard_v0",
      title: "Logic guard",
      course: "courses/006-ee-math-kernels/lesson-03-boolean-interlock.md",
      evidencePacket: "evidence/ee_math_kernels/logic_guard_v0_simulated_packet_2026_05_27/evidence_packet.json",
      frames: 8,
      guardActions: { pass_through: 5, interlock_block: 3 },
      validatorStatus: "pass",
      replayStatus: "pass",
      claimFlags: {
        simulated: true,
        hardware_observed: false,
        live_serial_capture_performed: false,
        certified_safety_claim: false,
        production_controller_claim: false
      }
    }
  ] satisfies EvidenceBridgeEntry[]
};
