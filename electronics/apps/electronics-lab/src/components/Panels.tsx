import { ChangeEvent, FormEvent, useRef, useState } from "react";
import {
  AlertTriangle,
  Box,
  Camera,
  Check,
  Download,
  Play,
  RotateCcw,
  TerminalSquare,
  Zap
} from "lucide-react";
import { useLabStore } from "../store";
import { analyzeLab, faultLabels, wireLabels, WireId, FaultId, wiringComplete } from "../engine/labEngine";
import { exportSimulatedPacket } from "../engine/packet";

const steps: { label: string; done: (wires: Record<WireId, boolean>) => boolean }[] = [
  { label: "ESP32 GND reaches a ground bus", done: (wires) => wires.esp32_gnd_to_ground_rail },
  { label: "ESP32 3V3 reaches a power bus", done: (wires) => wires.esp32_3v3_to_power_rail },
  {
    label: "Potentiometer outer legs reach 3V3 and GND",
    done: (wires) => wires.pot_high_to_power_rail && wires.pot_low_to_ground_rail
  },
  { label: "Potentiometer wiper reaches GPIO34", done: (wires) => wires.pot_wiper_to_gpio34 },
  {
    label: "GPIO25 drives LED through resistor",
    done: (wires) => wires.gpio25_to_resistor && wires.resistor_to_led_anode
  },
  { label: "LED cathode returns to ground", done: (wires) => wires.led_cathode_to_ground_rail }
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ControlPanel() {
  const lab = useLabStore((state) => state.lab);
  const frames = useLabStore((state) => state.frames);
  const setPotRaw = useLabStore((state) => state.setPotRaw);
  const setPowered = useLabStore((state) => state.setPowered);
  const setCameraPreset = useLabStore((state) => state.setCameraPreset);
  const runCommand = useLabStore((state) => state.runCommand);
  const toggleFault = useLabStore((state) => state.toggleFault);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const reports = analyzeLab(lab);
  const hasStop = reports.some((report) => report.severity === "stop");
  const ready = wiringComplete(lab) && !hasStop;

  function snapshotCanvas() {
    canvasRef.current = document.querySelector("canvas");
    return canvasRef.current?.toDataURL("image/png") ?? null;
  }

  async function exportPacket() {
    if (frames.length === 0) {
      runCommand("export packet");
      return;
    }
    const blob = await exportSimulatedPacket(frames, lab, snapshotCanvas());
    downloadBlob(blob, "mgelectronics_reflexcourse_sim_packet.zip");
    runCommand("export packet");
  }

  return (
    <aside className="left-panel" aria-label="Guided lab checklist">
      <div className="brand-row">
        <div>
          <p className="eyebrow">MGElectronics Lab</p>
          <h1>Reflex Course</h1>
        </div>
        <Box aria-hidden="true" />
      </div>

      <section className="panel-section">
        <h2>Guided Checklist</h2>
        <ol className="checklist">
          {steps.map((step) => {
            const done = step.done(lab.wires);
            return (
              <li key={step.label} className={done ? "done" : ""}>
                <Check aria-hidden="true" />
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel-section">
        <h2>Bench Controls</h2>
        <label className="range-row">
          <span>Potentiometer</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={lab.potRaw}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPotRaw(Number(event.target.value))}
          />
          <strong>{lab.potRaw.toFixed(2)}</strong>
        </label>
        <div className="button-grid">
          <button type="button" title="Toggle simulated 3.3V bench power" onClick={() => setPowered(!lab.powered)}>
            <Zap aria-hidden="true" /> {lab.powered ? "Power Off" : "Power On"}
          </button>
          <button type="button" title="Run threshold_reflex_v0" onClick={() => runCommand("run")}>
            <Play aria-hidden="true" /> Run
          </button>
          <button type="button" title="Reset the guided lab" onClick={() => runCommand("reset")}>
            <RotateCcw aria-hidden="true" /> Reset
          </button>
          <button type="button" title="Download simulated evidence packet" onClick={exportPacket}>
            <Download aria-hidden="true" /> Packet
          </button>
        </div>
        <div className={ready ? "status-chip ok" : hasStop ? "status-chip bad" : "status-chip warn"}>
          {ready ? "Ready for simulated trace" : hasStop ? "Stop condition active" : "Wiring in progress"}
        </div>
        {reports.length > 0 ? (
          <div className="inline-reports" aria-live="polite">
            {reports.map((report) => (
              <article key={`inline-${report.id}-${report.title}`} className={`fault-report ${report.severity}`}>
                <strong>{report.title}</strong>
                <p>{report.detail}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel-section">
        <h2>Camera</h2>
        <div className="preset-row">
          {(["overview", "wiring", "esp32", "led", "terminal"] as const).map((preset) => (
            <button key={preset} type="button" title={`Camera: ${preset}`} onClick={() => setCameraPreset(preset)}>
              <Camera aria-hidden="true" /> {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h2>Fault Lab</h2>
        <div className="fault-grid">
          {(Object.keys(faultLabels) as FaultId[]).map((fault) => (
            <button
              key={fault}
              type="button"
              className={lab.faults[fault] ? "fault-active" : ""}
              title={faultLabels[fault]}
              onClick={() => toggleFault(fault)}
            >
              <AlertTriangle aria-hidden="true" /> {faultLabels[fault]}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function RightPanel() {
  const lab = useLabStore((state) => state.lab);
  const frames = useLabStore((state) => state.frames);
  const reports = analyzeLab(lab);
  const latest = frames[frames.length - 1];

  return (
    <aside className="right-panel" aria-label="Monogate state inspector">
      <section className="panel-section">
        <h2>Monogate Loop</h2>
        <div className="flow-line">
          <span>potentiometer</span>
          <span>threshold_reflex_v0</span>
          <span>guard clamp</span>
          <span>LED</span>
          <span>trace</span>
        </div>
      </section>

      <section className="panel-section telemetry">
        <h2>Guard Inspector</h2>
        <dl>
          <div>
            <dt>source</dt>
            <dd>mgelectronics_lab_sim</dd>
          </div>
          <div>
            <dt>hardware_observed</dt>
            <dd>false</dd>
          </div>
          <div>
            <dt>simulated</dt>
            <dd>true</dd>
          </div>
          <div>
            <dt>live_serial_capture_performed</dt>
            <dd>false</dd>
          </div>
          <div>
            <dt>certified_safety_claim</dt>
            <dd>false</dd>
          </div>
          <div>
            <dt>production_controller_claim</dt>
            <dd>false</dd>
          </div>
          <div>
            <dt>requested_output</dt>
            <dd>{latest ? latest.outputs.requested_output.toFixed(3) : "pending"}</dd>
          </div>
          <div>
            <dt>safe_output</dt>
            <dd>{latest ? latest.outputs.safe_output.toFixed(3) : "pending"}</dd>
          </div>
          <div>
            <dt>guard_action</dt>
            <dd>{latest ? latest.guard.guard_action : "pending"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section">
        <h2>Fault Reports</h2>
        <div className="fault-report-list">
          {reports.length === 0 ? <p className="quiet">No faults detected.</p> : null}
          {reports.map((report) => (
            <article key={`${report.id}-${report.title}`} className={`fault-report ${report.severity}`}>
              <strong>{report.title}</strong>
              <p>{report.detail}</p>
              <small>{report.recovery}</small>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function TerminalPanel() {
  const lines = useLabStore((state) => state.terminal);
  const runCommand = useLabStore((state) => state.runCommand);
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    runCommand(value || "help");
    setValue("");
  }

  return (
    <section className="terminal-panel" aria-label="Simulated terminal">
      <div className="terminal-title">
        <TerminalSquare aria-hidden="true" />
        <span>Simulated Terminal</span>
      </div>
      <div className="terminal-lines">
        {lines.map((line, index) => (
          <pre key={`${line.text}-${index}`} className={`line-${line.kind}`}>
            {line.text}
          </pre>
        ))}
      </div>
      <form onSubmit={submit} className="terminal-input-row">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="help, status, validate, run, replay, trace, export packet"
          aria-label="Terminal command"
        />
        <button type="submit">Enter</button>
      </form>
    </section>
  );
}
