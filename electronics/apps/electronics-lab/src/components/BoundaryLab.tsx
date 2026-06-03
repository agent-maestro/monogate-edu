import { ArrowLeft, Download, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import {
  type BoundaryMode,
  dimensionFromPot,
  runBoundaryExperiment
} from "../engine/boundaryEngine";

const modes: BoundaryMode[] = ["raw", "guarded", "log-domain candidate", "auto rescue"];
const sampleCounts = [64, 256, 1024];

export function BoundaryLab({ onBack }: { onBack: () => void }) {
  const [potRaw, setPotRaw] = useState(0.62);
  const [treeDepth, setTreeDepth] = useState(8);
  const [sampleCount, setSampleCount] = useState(256);
  const [mode, setMode] = useState<BoundaryMode>("guarded");
  const [seed, setSeed] = useState(1701);
  const dimension = dimensionFromPot(potRaw);
  const packet = useMemo(
    () => runBoundaryExperiment({ dimension, treeDepth, sampleCount, mode, seed }),
    [dimension, treeDepth, sampleCount, mode, seed]
  );
  const boundaryRatio = packet.boundary_hits / packet.sample_count;
  const survivalPct = Math.round(packet.finite_survival_rate * 100);

  function downloadPacket() {
    const blob = new Blob([JSON.stringify(packet, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `optimization-boundary-d${dimension}-${mode.replace(/ /g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="boundary-lab-shell" aria-label="Optimization Boundary Lab simulator">
      <header className="boundary-lab-header">
        <button className="landing-back-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Back
        </button>
        <div>
          <p>Simulated instrument bench</p>
          <h1>Optimization Boundary Lab</h1>
          <span>
            Drive a high-dimensional EML search model with Trainer Board-style controls, then inspect the guard decisions and replay packet.
          </span>
        </div>
      </header>

      <section className="boundary-lab-grid">
        <div className="boundary-instrument" aria-label="Trainer Board style boundary controls">
          <div className="instrument-topline">
            <ShieldCheck aria-hidden="true" />
            <span>simulated courseware</span>
          </div>
          <div className="boundary-board-face">
            <div className="boundary-oled" aria-label="Boundary OLED readout">
              <span>EML boundary run</span>
              <strong>d={dimension} depth={treeDepth}</strong>
              <dl>
                <div><dt>mode</dt><dd>{mode}</dd></div>
                <div><dt>boundary</dt><dd>{Math.round(boundaryRatio * 100)}%</dd></div>
                <div><dt>survive</dt><dd>{survivalPct}%</dd></div>
              </dl>
            </div>
            <div className="boundary-leds" aria-label="Boundary status LEDs">
              <span className="boundary-led is-green" style={{ "--level": packet.finite_survival_rate } as CSSProperties}>finite</span>
              <span className={packet.domain_failures > 0 ? "boundary-led is-red is-active" : "boundary-led is-red"}>domain</span>
              <span className={packet.saturation_events > 0 ? "boundary-led is-amber is-active" : "boundary-led is-amber"}>clamp</span>
            </div>
            <label className="boundary-knob">
              <span>pot / dimension</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={potRaw}
                onChange={(event) => setPotRaw(Number(event.target.value))}
              />
              <strong>{dimension}</strong>
            </label>
            <div className="mode-switches" aria-label="Optimizer mode">
              {modes.map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  className={mode === nextMode ? "is-selected" : ""}
                  onClick={() => setMode(nextMode)}
                >
                  {nextMode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="boundary-controls" aria-label="Run controls">
          <h2>Run Controls</h2>
          <label>
            <span>tree_depth</span>
            <input type="number" min="2" max="12" value={treeDepth} onChange={(event) => setTreeDepth(Number(event.target.value))} />
          </label>
          <label>
            <span>sample_count</span>
            <select value={sampleCount} onChange={(event) => setSampleCount(Number(event.target.value))}>
              {sampleCounts.map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label>
            <span>seed</span>
            <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
          </label>
          <div className="boundary-actions">
            <button type="button" onClick={() => setSeed((current) => current + 1)}>
              <RotateCcw aria-hidden="true" /> Next seed
            </button>
            <button type="button" onClick={downloadPacket}>
              <Download aria-hidden="true" /> Export JSON
            </button>
          </div>
        </aside>
      </section>

      <section className="boundary-dashboard" aria-label="Boundary run dashboard">
        <div className="boundary-metrics">
          <Metric label="center_hits" value={packet.center_hits} />
          <Metric label="boundary_hits" value={packet.boundary_hits} />
          <Metric label="domain_failures" value={packet.domain_failures} />
          <Metric label="saturation_events" value={packet.saturation_events} />
        </div>
        <div className="boundary-bars" aria-label="Boundary metric bars">
          <Bar label="center" value={packet.center_hits / packet.sample_count} />
          <Bar label="boundary" value={boundaryRatio} />
          <Bar label="finite survival" value={packet.finite_survival_rate} />
          <Bar label="transition entropy" value={Math.min(1, packet.transition_entropy / 4)} />
        </div>
        <div className="boundary-event-panel" aria-label="Boundary event taxonomy">
          <h2>Event Timeline</h2>
          <p>
            dominant transition: <strong>{packet.dominant_transition ?? "none"}</strong> · entropy:{" "}
            <strong>{packet.transition_entropy.toFixed(2)}</strong>
          </p>
          <div className="boundary-event-legend">
            {Object.entries(packet.event_counts).map(([eventClass, count]) => (
              <span key={eventClass} className={`event-chip event-${eventClass}`}>
                {eventClass}: {count}
              </span>
            ))}
          </div>
          <div className="boundary-transition-list" aria-label="Boundary transition graph">
            {Object.entries(packet.transition_counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([transition, count]) => (
                <span key={transition}>{transition}: {count}</span>
              ))}
          </div>
          <div className="boundary-event-timeline">
            {packet.trace_preview.map((frame) => (
              <span
                key={frame.sample_index}
                className={`event-frame event-${frame.event_class}`}
                title={`${frame.sample_index}: ${frame.event_class}`}
              >
                {frame.sample_index}
              </span>
            ))}
          </div>
        </div>
        <pre>{JSON.stringify(packet, null, 2)}</pre>
      </section>

      <section className="boundary-course-steps" aria-label="Optimization Boundary Lab course steps">
        {[
          "Choose dimension/depth",
          "Run raw sampler",
          "Observe boundary concentration",
          "Enable guard",
          "Compare log-domain candidate",
          "Export evidence packet",
        ].map((step, index) => (
          <span key={step}><b>{index + 1}</b>{step}</span>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="boundary-bar">
      <span>{label}</span>
      <i><b style={{ width: `${Math.max(2, Math.round(value * 100))}%` }} /></i>
    </div>
  );
}
