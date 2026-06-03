import { create } from "zustand";
import {
  FaultId,
  LabState,
  TraceFrame,
  WireId,
  analyzeLab,
  canRunTrace,
  defaultLabState,
  generateTrace,
  replayTrace,
  traceToJsonl,
  validateTrace,
  wireLabels
} from "./engine/labEngine";
import { publishLabEvent } from "./engine/liveEvents";

export type TerminalLine = {
  kind: "input" | "info" | "ok" | "warn" | "error";
  text: string;
};

export type CameraPreset = "overview" | "wiring" | "esp32" | "led" | "terminal";

type LabStore = {
  lab: LabState;
  frames: TraceFrame[];
  terminal: TerminalLine[];
  cameraPreset: CameraPreset;
  connectWire: (wire: WireId) => void;
  toggleFault: (fault: FaultId) => void;
  setPotRaw: (value: number) => void;
  setPowered: (powered: boolean) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  syncVisualWires: (wires: Partial<Record<WireId, boolean>>) => void;
  syncVisualFaults: (faults: Partial<Record<FaultId, boolean>>) => void;
  runCommand: (command: string) => void;
};

const hello: TerminalLine[] = [
  { kind: "info", text: "MGElectronics Reflex Course remote lab" },
  {
    kind: "info",
    text:
      "source=mgelectronics_lab_sim simulated=true hardware_observed=false live_serial_capture_performed=false certified_safety_claim=false production_controller_claim=false"
  },
  { kind: "info", text: "Type `help`, then wire the checklist from rails to LED." }
];

function append(lines: TerminalLine[], line: TerminalLine): TerminalLine[] {
  return [...lines, line].slice(-90);
}

function trim(lines: TerminalLine[]): TerminalLine[] {
  return lines.slice(-90);
}

function statusLines(lab: LabState): TerminalLine[] {
  const reports = analyzeLab(lab);
  if (reports.length === 0) {
    return [{ kind: "ok", text: "status: wiring nominal, ready for simulated reflex trace" }];
  }
  return reports.map((report) => ({
    kind: report.severity === "stop" ? "error" : "warn",
    text: `${report.title}: ${report.detail} Recovery: ${report.recovery}`
  }));
}

export const useLabStore = create<LabStore>((set, get) => ({
  lab: defaultLabState(),
  frames: [],
  terminal: hello,
  cameraPreset: "overview",
  connectWire: (wire) => {
    publishLabEvent("wire_state_changed", { wire, label: wireLabels[wire], connected: true });
    set((state) => ({
      lab: { ...state.lab, wires: { ...state.lab.wires, [wire]: true } },
      terminal: append(state.terminal, { kind: "ok", text: `connected: ${wireLabels[wire]}` })
    }));
  },
  toggleFault: (fault) =>
    set((state) => {
      const active = !state.lab.faults[fault];
      publishLabEvent("fault_detected", { fault, active });
      return {
        lab: { ...state.lab, faults: { ...state.lab.faults, [fault]: active } },
        terminal: append(state.terminal, {
          kind: "warn",
          text: `${state.lab.faults[fault] ? "cleared" : "introduced"} fault: ${fault}`
        })
      };
    }),
  setPotRaw: (value) => {
    publishLabEvent("dashboard_status", { pot_raw: value });
    set((state) => ({ lab: { ...state.lab, potRaw: value } }));
  },
  setPowered: (powered) => {
    publishLabEvent("rail_powered", { powered, voltage: powered ? "3V3" : "off" });
    set((state) => ({
      lab: { ...state.lab, powered },
      terminal: append(state.terminal, {
        kind: powered ? "info" : "warn",
        text: powered ? "bench supply on: simulated 3.3V rail active" : "bench supply off"
      })
    }));
  },
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  syncVisualWires: (wires) => {
    const current = get().lab.wires;
    const changed = Object.entries(wires).filter(
      ([wire, connected]) => current[wire as WireId] !== connected
    ) as [WireId, boolean][];

    if (changed.length === 0) return;

    changed.forEach(([wire, connected]) => {
      publishLabEvent("wire_state_changed", { wire, label: wireLabels[wire], connected });
    });

    set((state) => ({
      lab: { ...state.lab, wires: { ...state.lab.wires, ...wires } }
    }));
  },
  syncVisualFaults: (faults) => {
    const current = get().lab.faults;
    const changed = Object.entries(faults).filter(
      ([fault, active]) => current[fault as FaultId] !== active
    ) as [FaultId, boolean][];

    if (changed.length === 0) return;

    changed.forEach(([fault, active]) => {
      publishLabEvent("fault_detected", { fault, active });
    });

    set((state) => ({
      lab: { ...state.lab, faults: { ...state.lab.faults, ...faults } }
    }));
  },
  runCommand: (raw) => {
    const command = raw.trim().toLowerCase();
    publishLabEvent("terminal_command", { command: raw, normalized: command || "help" });
    set((state) => ({ terminal: append(state.terminal, { kind: "input", text: `> ${raw}` }) }));
    const { lab } = get();

    if (!command || command === "help") {
      set((state) => ({
        terminal: trim([
          ...state.terminal,
          { kind: "info", text: "commands: help, status, validate, run, replay, trace, export packet, reset" }
        ])
      }));
      return;
    }

    if (command === "status") {
      set((state) => ({ terminal: [...state.terminal, ...statusLines(lab)].slice(-90) }));
      return;
    }

    if (command === "validate") {
      const lines = statusLines(lab);
      const ok = canRunTrace(lab);
      set((state) => ({
        terminal: trim([
          ...state.terminal,
          ...lines,
          { kind: ok ? "ok" : "error", text: ok ? "validation ready: simulated trace can run" : "validation blocked" }
        ] as TerminalLine[])
      }));
      return;
    }

    if (command === "run") {
      if (!canRunTrace(lab)) {
        set((state) => ({
          terminal: trim([...state.terminal, { kind: "error", text: "run blocked: fix stop-condition faults first" }])
        }));
        return;
      }
      const frames = generateTrace(lab);
      frames.forEach((frame) => publishLabEvent("trace_frame", frame as unknown as Record<string, unknown>));
      set((state) => ({
        frames,
        terminal: append(state.terminal, {
          kind: "ok",
          text: `ran threshold_reflex_v0: ${frames.length} simulated frames, source=mgelectronics_lab_sim`
        })
      }));
      return;
    }

    if (command === "replay") {
      const frames = get().frames;
      const text = frames.length ? replayTrace(frames) : "no trace yet; run `run` first";
      set((state) => ({ terminal: append(state.terminal, { kind: frames.length ? "ok" : "warn", text }) }));
      return;
    }

    if (command === "trace") {
      const frames = get().frames;
      const text = frames.length ? traceToJsonl(frames).split("\n").slice(0, 4).join(" | ") : "no trace yet; run `run` first";
      set((state) => ({ terminal: append(state.terminal, { kind: frames.length ? "info" : "warn", text }) }));
      return;
    }

    if (command === "export packet") {
      const frames = get().frames;
      const text = frames.length
        ? "packet ready: use the Export Packet button to download the simulated evidence zip"
        : "no trace yet; run `run` first";
      set((state) => ({ terminal: append(state.terminal, { kind: frames.length ? "ok" : "warn", text }) }));
      return;
    }

    if (command === "reset") {
      set({ lab: defaultLabState(), frames: [], terminal: hello });
      return;
    }

    if (command === "validate trace") {
      const frames = get().frames;
      set((state) => ({
        terminal: append(state.terminal, {
          kind: frames.length ? "ok" : "warn",
          text: frames.length ? validateTrace(frames) : "no trace yet; run `run` first"
        })
      }));
      return;
    }

    set((state) => ({ terminal: append(state.terminal, { kind: "warn", text: `unknown command: ${raw}` }) }));
  }
}));
