import {
  ArrowLeft,
  BarChart3,
  Download,
  Gauge,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  ToggleRight
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  boundaryDimensions,
  boundaryModes,
  boundarySampleCounts,
  modeLabel,
  runOptimizationBoundary,
  type BoundaryDimension,
  type BoundaryMode,
  type BoundarySampleCount
} from "../engine/optimizationBoundary";

const courseSteps = [
  "Set the virtual knob",
  "Run unchecked baseline",
  "Read OLED and LEDs",
  "Enable guard switch",
  "Compare log-domain mode",
  "Run auto rescue",
  "Replay and export evidence"
];

function nextMode(mode: BoundaryMode): BoundaryMode {
  const index = boundaryModes.indexOf(mode);
  return boundaryModes[(index + 1) % boundaryModes.length];
}

function dimensionFromSlider(index: number): BoundaryDimension {
  return boundaryDimensions[Math.min(boundaryDimensions.length - 1, Math.max(0, index))];
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function packetText(packet: unknown): string {
  return JSON.stringify(packet, null, 2);
}

function stepCheckText(step: number, mode: BoundaryMode): string {
  if (step === 0) return "Knob maps to a dimension bucket and tree depth.";
  if (step === 1) return mode === "raw" ? "Raw baseline is selected." : "Select raw mode to see the unchecked baseline.";
  if (step === 2) return "OLED and LEDs are reading from the current software run.";
  if (step === 3) return mode === "guarded" ? "Guard switch is active." : "Select guarded mode to compare clamped behavior.";
  if (step === 4) return mode === "log-domain candidate" ? "Log-domain candidate is active." : "Select log-domain mode to compare numeric stability.";
  if (step === 5) return mode === "auto rescue" ? "Auto rescue mode is active." : "Select auto rescue to watch rescue events.";
  return "Replay frames and export stay simulated until physical approval.";
}

export function OptimizationBoundaryLab({
  onBack,
  onHome
}: {
  onBack: () => void;
  onHome: () => void;
}) {
  const [dimensionIndex, setDimensionIndex] = useState(4);
  const [sampleCount, setSampleCount] = useState<BoundarySampleCount>(256);
  const [mode, setMode] = useState<BoundaryMode>("guarded");
  const [seed, setSeed] = useState(1701);
  const [courseStep, setCourseStep] = useState(0);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const dimension = dimensionFromSlider(dimensionIndex);
  const run = useMemo(
    () => runOptimizationBoundary({ dimension, sampleCount, mode, seed }),
    [dimension, mode, sampleCount, seed]
  );
  const activeFrame = run.frames[Math.min(replayIndex, run.frames.length - 1)] ?? run.frames[0];
  const packetJson = packetText(run.packet);
  const boundaryRatio = run.packet.boundary_hits / run.packet.sample_count;
  const centerRatio = run.packet.center_hits / run.packet.sample_count;
  const finiteLedIntensity = Math.max(0.08, run.packet.finite_survival_rate);
  const warningActive = run.packet.domain_failures > 0 || run.packet.saturation_events > 0;
  const boundaryStress = Math.min(1, boundaryRatio + run.packet.saturation_events / run.packet.sample_count);
  const guardLabel =
    mode === "raw" ? "bypass" : mode === "guarded" ? "guarded" : mode === "auto rescue" ? "auto rescue" : "log-domain";
  const traceTerminalLines = [
    `software> replay boundary_demo_proxy frame=${activeFrame.frame_index}`,
    `sample=${activeFrame.sample_index} dim=${dimension} depth=${run.packet.tree_depth}`,
    `boundary=${activeFrame.boundary_hit ? "yes" : "no"} finite=${activeFrame.finite_survival_rate.toFixed(2)}`,
    `guard=${activeFrame.guard_status} intervention=${activeFrame.intervention}`
  ];

  useEffect(() => {
    setIsReplaying(false);
  }, [dimension, mode, sampleCount, seed]);

  useEffect(() => {
    if (!isReplaying) return;
    const interval = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= run.frames.length - 1) {
          window.clearInterval(interval);
          setIsReplaying(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(interval);
  }, [isReplaying, run.frames.length]);

  function runSampler(next: BoundaryMode = mode) {
    setIsReplaying(false);
    setMode(next);
    setReplayIndex(0);
    if (next === "raw") setCourseStep(Math.max(courseStep, 1));
    if (next === "guarded") setCourseStep(Math.max(courseStep, 3));
    if (next === "log-domain candidate") setCourseStep(Math.max(courseStep, 4));
    if (next === "auto rescue") setCourseStep(Math.max(courseStep, 5));
  }

  function exportPacket() {
    setCourseStep(6);
    const blob = new Blob([packetJson], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `optimization-boundary-${dimension}-${mode.replace(/\s+/g, "-")}-${seed}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  function replayTrace() {
    setCourseStep(Math.max(courseStep, 6));
    if (replayIndex >= run.frames.length - 1) {
      setReplayIndex(0);
    }
    setIsReplaying(true);
  }

  return (
    <main className="optimization-lab-shell" aria-label="Optimization Boundary software">
      <header className="optimization-lab-header">
        <button type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Course
        </button>
        <div>
          <p>Software simulator</p>
          <h1>Optimization Boundary Software</h1>
          <span>
            Trainer Board-style software lab for a scaled boundary proxy: virtual knob, guard switch, OLED/LED readouts, replay, and evidence.
          </span>
        </div>
        <button type="button" onClick={onHome}>
          Electronics
        </button>
      </header>

      <section className="optimization-boundary-strip" aria-label="Optimization lab evidence boundary">
        <span>simulated: true</span>
        <span>hardware_observed: false</span>
        <span>live_serial_capture_performed: false</span>
        <span>hardware_action_performed: false</span>
      </section>

      <section className="optimization-lab-layout">
        <aside className="optimization-course-panel" aria-label="Optimization Boundary course panel">
          <div className="optimization-panel-title">
            <p>Software course steps</p>
            <h2>{courseSteps[courseStep]}</h2>
          </div>
          <ol>
            {courseSteps.map((step, index) => (
              <li key={step}>
                <button
                  type="button"
                  className={`${index === courseStep ? "is-current" : ""}${index < courseStep ? " is-done" : ""}`}
                  onClick={() => setCourseStep(index)}
                >
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </button>
              </li>
            ))}
          </ol>
          <section className="optimization-step-check" aria-label="Optimization step check">
            <strong>Step check</strong>
            <span>{stepCheckText(courseStep, mode)}</span>
            <button type="button" onClick={() => setCourseStep(Math.min(courseSteps.length - 1, courseStep + 1))}>
              Check / next
            </button>
          </section>
          <section className="optimization-physical-lock" aria-label="Physical path status">
            <ShieldCheck aria-hidden="true" />
            <strong>Physical planned</strong>
            <span>ESP32 firmware and live serial capture are not part of this page yet.</span>
          </section>
          <div className="optimization-course-actions">
            <button type="button" onClick={exportPacket}>
              <Download aria-hidden="true" /> Export evidence
            </button>
          </div>
        </aside>

        <section className="optimization-trainer-surface" aria-label="Optimization Boundary Trainer controls">
          <div className="optimization-surface-title">
            <div>
              <p>Virtual bench</p>
              <h2>Boundary Proxy Control Surface</h2>
            </div>
            <span>physical: planned</span>
          </div>
          <div className="optimization-board-visual" aria-label="Optimization boundary signal path">
            <div className="optimization-rail rail-top">VIRTUAL 3V3</div>
            <div className="optimization-rail rail-bottom">TRACE RETURN</div>
            <div className="optimization-node node-pot">KNOB</div>
            <div className="optimization-node node-sampler">EML</div>
            <div className="optimization-node node-classifier">BOUNDARY</div>
            <div className="optimization-node node-guard">SWITCH</div>
            <div className="optimization-node node-evidence">OLED</div>
            <i className="optimization-wire wire-dim" />
            <i className="optimization-wire wire-classify" />
            <i className="optimization-wire wire-guard" />
            <i className="optimization-wire wire-packet" />
          </div>

          <div className="optimization-controls">
            <label className="dimension-control">
              <span>
                <Gauge aria-hidden="true" /> virtual knob: dimension / depth
              </span>
              <input
                aria-label="Dimension selector"
                type="range"
                min="0"
                max={boundaryDimensions.length - 1}
                step="1"
                value={dimensionIndex}
                onChange={(event) => {
                  setDimensionIndex(Number(event.currentTarget.value));
                  setReplayIndex(0);
                  setCourseStep(Math.max(courseStep, 0));
                }}
              />
              <strong>
                {dimension}D / depth {run.packet.tree_depth}
              </strong>
            </label>

            <div className="optimization-mode-bank" aria-label="Optimizer mode">
              {boundaryModes.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  className={candidate === mode ? "is-active" : ""}
                  onClick={() => runSampler(candidate)}
                >
                  {modeLabel(candidate)}
                </button>
              ))}
            </div>

            <div className="optimization-input-grid">
              <label>
                <span>sample count</span>
                <select
                  aria-label="Sample count"
                  value={sampleCount}
                  onChange={(event) => {
                    setSampleCount(Number(event.currentTarget.value) as BoundarySampleCount);
                    setReplayIndex(0);
                  }}
                >
                  {boundarySampleCounts.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>seed</span>
                <input
                  aria-label="Replay seed"
                  type="number"
                  value={seed}
                  onChange={(event) => {
                    setSeed(Number(event.currentTarget.value) || 0);
                    setReplayIndex(0);
                  }}
                />
              </label>
            </div>

            <div className="optimization-command-row">
              <button type="button" onClick={() => runSampler("raw")}>
                <Play aria-hidden="true" /> Run raw
              </button>
              <button type="button" onClick={() => runSampler(nextMode(mode))}>
                <ToggleRight aria-hidden="true" /> Cycle mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setSeed(1701);
                  setDimensionIndex(4);
                  setSampleCount(256);
                  setMode("guarded");
                  setReplayIndex(0);
                  setCourseStep(0);
                }}
              >
                <RotateCcw aria-hidden="true" /> Reset
              </button>
            </div>
          </div>

          <section className="optimization-oled" aria-label="OLED boundary readouts">
            <div>
              <span>OLED</span>
              <strong>software</strong>
            </div>
            <div>
              <span>boundary_hits</span>
              <strong>{run.packet.boundary_hits}</strong>
            </div>
            <div>
              <span>center_hits</span>
              <strong>{run.packet.center_hits}</strong>
            </div>
            <div>
              <span>domain_failures</span>
              <strong>{run.packet.domain_failures}</strong>
            </div>
            <div>
              <span>saturation_events</span>
              <strong>{run.packet.saturation_events}</strong>
            </div>
            <div>
              <span>rescue_events</span>
              <strong>{run.packet.rescue_events}</strong>
            </div>
            <div>
              <span>finite_survival_rate</span>
              <strong>{run.packet.finite_survival_rate.toFixed(2)}</strong>
            </div>
            <div>
              <span>guard status</span>
              <strong>{guardLabel}</strong>
            </div>
          </section>

          <div className="optimization-led-row" aria-label="Simulator LEDs">
            <span className="optimization-led is-finite" style={{ "--led": finiteLedIntensity } as CSSProperties}>
              finite
            </span>
            <span className="optimization-led is-stress" style={{ "--led": Math.max(0.08, boundaryStress) } as CSSProperties}>
              stress
            </span>
            <span className={warningActive ? "optimization-led is-warning is-on" : "optimization-led is-warning"}>
              warning
            </span>
            <span className={mode !== "raw" ? "optimization-led is-guarded is-on" : "optimization-led is-guarded"}>
              guard
            </span>
            <span className={mode === "auto rescue" ? "optimization-led is-rescue is-on" : "optimization-led is-rescue"}>
              rescue
            </span>
          </div>
        </section>

        <section className="optimization-dashboard" aria-label="Optimization Boundary dashboard">
          <div className="optimization-dashboard-header">
            <div>
              <p>Software dashboard</p>
              <h2>Trace and Evidence</h2>
            </div>
            <Radio aria-hidden="true" />
          </div>

          <div className="optimization-metrics" aria-label="Boundary run metrics">
            <div>
              <span>mode</span>
              <strong>{modeLabel(mode)}</strong>
            </div>
            <div>
              <span>boundary</span>
              <strong>{formatPercent(boundaryRatio)}</strong>
            </div>
            <div>
              <span>center</span>
              <strong>{formatPercent(centerRatio)}</strong>
            </div>
            <div>
              <span>finite</span>
              <strong>{formatPercent(run.packet.finite_survival_rate)}</strong>
            </div>
            <div>
              <span>rescues</span>
              <strong>{run.packet.rescue_events}</strong>
            </div>
          </div>

          <div className="optimization-boundary-bars" aria-label="Boundary versus center hit comparison">
            <div>
              <span>boundary</span>
              <i style={{ "--bar": boundaryRatio } as CSSProperties} />
            </div>
            <div>
              <span>center</span>
              <i style={{ "--bar": centerRatio } as CSSProperties} />
            </div>
          </div>

          <section className="optimization-replay-panel" aria-label="Trace replay controls">
            <div className="optimization-section-title">
              <TerminalSquare aria-hidden="true" />
              <span>virtual terminal replay</span>
            </div>
            <input
              aria-label="Replay frame"
              type="range"
              min="0"
              max={Math.max(0, run.frames.length - 1)}
              step="1"
              value={Math.min(replayIndex, run.frames.length - 1)}
              onChange={(event) => {
                setIsReplaying(false);
                setReplayIndex(Number(event.currentTarget.value));
                setCourseStep(Math.max(courseStep, 2));
              }}
            />
            <div className="optimization-frame-readout">
              <strong>#{activeFrame.frame_index}</strong>
              <span>sample {activeFrame.sample_index}</span>
              <span>max |x| {activeFrame.coordinate_max_abs.toFixed(2)}</span>
              <span>{activeFrame.intervention === "none" ? activeFrame.guard_status : activeFrame.intervention}</span>
            </div>
            <div className="optimization-terminal-lines" aria-label="Optimization replay terminal">
              {traceTerminalLines.map((line) => (
                <pre key={line}>{line}</pre>
              ))}
            </div>
            <div className="optimization-trace-list" role="table" aria-label="Optimization trace frames">
              <div role="row" className="trace-row trace-head">
                <span>#</span>
                <span>sample</span>
                <span>boundary</span>
                <span>finite</span>
                <span>guard</span>
                <span>intervention</span>
              </div>
              {run.frames.slice(0, 7).map((frame) => (
                <button
                  type="button"
                  role="row"
                  key={frame.frame_index}
                  className={frame.frame_index === activeFrame.frame_index ? "trace-row is-current" : "trace-row"}
                  onClick={() => {
                    setIsReplaying(false);
                    setReplayIndex(frame.frame_index);
                  }}
                >
                  <span>{frame.frame_index}</span>
                  <span>{frame.sample_index}</span>
                  <span>{frame.boundary_hit ? "yes" : "no"}</span>
                  <span>{frame.finite_survival_rate.toFixed(2)}</span>
                  <span>{frame.guard_status}</span>
                  <span>{frame.intervention}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="optimization-evidence-panel" aria-label="Evidence packet JSON">
            <div className="optimization-section-title">
              <BarChart3 aria-hidden="true" />
              <span>evidence packet JSON</span>
            </div>
            <pre>{packetJson}</pre>
            <div className="optimization-export-row">
              <button type="button" onClick={replayTrace}>
                <Play aria-hidden="true" /> {isReplaying ? "Replaying" : "Replay trace"}
              </button>
              <button type="button" onClick={exportPacket}>
                <Download aria-hidden="true" /> Export packet
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
