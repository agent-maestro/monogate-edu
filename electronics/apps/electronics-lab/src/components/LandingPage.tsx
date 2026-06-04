import {
  ArrowRight,
  BookOpen,
  Cpu,
  FileText,
  Github,
  MonitorPlay,
  ShieldCheck,
  TerminalSquare,
  X
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { evidenceBridge } from "../data/evidenceBridge";

export type LandingTarget =
  | "electronics"
  | "esp32"
  | "course"
  | "reflexGuard"
  | "analogCourse"
  | "lab"
  | "analogLab"
  | "environmentCourse"
  | "environmentLab"
  | "boundaryHardwareCourse"
  | "physical"
  | "glossary"
  | "courseGlossary"
  | "arty"
  | "other"
  | "boundary"
  | "boundarySoftware"
  | "boundarySimulator";

const githubHref = "https://github.com/agent-maestro/monogate-electronics/tree/main/apps/electronics-lab";

const reflexKernel = {
  id: "threshold_reflex_v0",
  threshold: 0.55,
  width: 0.1,
  maxStep: 0.2,
  safeOutputLimit: 0.85
};

const reflexTrace = [
  { sample_index: 0, pot_raw: 0.0, requested_output: 0.0, safe_output: 0.0, guard_action: "pass_through" },
  { sample_index: 1, pot_raw: 0.35, requested_output: 0.0, safe_output: 0.0, guard_action: "pass_through" },
  { sample_index: 2, pot_raw: 0.55, requested_output: 0.2, safe_output: 0.2, guard_action: "pass_through" },
  { sample_index: 3, pot_raw: 0.65, requested_output: 0.4, safe_output: 0.4, guard_action: "pass_through" },
  { sample_index: 4, pot_raw: 0.85, requested_output: 0.6, safe_output: 0.6, guard_action: "pass_through" },
  { sample_index: 5, pot_raw: 1.0, requested_output: 0.8, safe_output: 0.8, guard_action: "pass_through" },
  { sample_index: 6, pot_raw: 1.0, requested_output: 1.0, safe_output: 0.85, guard_action: "clamp_to_safe_output" }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function format(value: number) {
  return value.toFixed(2);
}

function replayFrame(potRaw: number, previousOutput: number) {
  const centered = potRaw - reflexKernel.threshold;
  const rawRequest = centered <= 0 ? 0 : clamp(centered / reflexKernel.width, 0, 1);
  const requestedOutput = clamp(
    previousOutput + clamp(rawRequest - previousOutput, -reflexKernel.maxStep, reflexKernel.maxStep),
    0,
    1
  );
  const safeOutput = Math.min(requestedOutput, reflexKernel.safeOutputLimit);
  const guardAction = requestedOutput > reflexKernel.safeOutputLimit ? "clamp_to_safe_output" : "pass_through";

  return {
    potRaw,
    requestedOutput,
    safeOutput,
    guardAction,
    safetyMargin: Math.max(0, reflexKernel.safeOutputLimit - safeOutput)
  };
}

export function LandingPage({ onNavigate }: { onNavigate: (target: LandingTarget) => void }) {
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  return (
    <main className="landing-shell" aria-label="Monogate Electronics landing page">
      <section className="electronics-home">
        <header className="electronics-hero">
          <div className="electronics-hero-copy">
            <p>Monogate Electronics Lab</p>
            <h1>Choose your hardware path.</h1>
            <span>
              Start with a small, inspectable control loop. Each path turns an input into a guarded decision, a visible output, and a replayable trace.
            </span>
            <div className="electronics-hero-actions">
              <button type="button" onClick={() => setQuickStartOpen(true)}>
                <BookOpen aria-hidden="true" /> Quick Start
              </button>
              <button
                type="button"
                onClick={() => setMethodOpen(true)}
              >
                <ShieldCheck aria-hidden="true" /> How It Works
              </button>
              <button
                type="button"
                onClick={() => onNavigate("glossary")}
              >
                <FileText aria-hidden="true" /> Glossary
              </button>
              <a href={githubHref} target="_blank" rel="noreferrer">
                <Github aria-hidden="true" /> Source
              </a>
            </div>
          </div>

          <div className="electronics-hero-visual" aria-label="Electronics lab signal preview">
            <div className="signal-board-visual">
              <span className="signal-rail rail-power">3V3</span>
              <span className="signal-rail rail-ground">GND</span>
              <span className="signal-node signal-pot">POT</span>
              <span className="signal-node signal-kernel">EML</span>
              <span className="signal-node signal-guard">GUARD</span>
              <span className="signal-node signal-output">LED</span>
              <i className="signal-wire wire-input" />
              <i className="signal-wire wire-safe" />
              <i className="signal-wire wire-return" />
            </div>
            <dl className="hero-boundary-strip" aria-label="Current evidence boundary">
              <div>
                <dt>mode</dt>
                <dd>simulated courseware</dd>
              </div>
              <div>
                <dt>hardware observed</dt>
                <dd>false</dd>
              </div>
              <div>
                <dt>live serial</dt>
                <dd>false</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="electronics-method-strip" id="electronics-method" aria-label="Monogate Electronics course method">
          <div>
            <span>1</span>
            <strong>Simulate</strong>
            <p>Run the kernel against a known trace before touching hardware.</p>
          </div>
          <div>
            <span>2</span>
            <strong>Build</strong>
            <p>Wire the smallest circuit that can show the decision safely.</p>
          </div>
          <div>
            <span>3</span>
            <strong>Capture</strong>
            <p>Record serial frames, graph behavior, photos, and session logs.</p>
          </div>
          <div>
            <span>4</span>
            <strong>Constrain</strong>
            <p>State what the evidence proves, and what it does not claim.</p>
          </div>
        </section>

        <section className="hardware-family-grid is-two-up" aria-label="Hardware path categories">
          <button
            type="button"
            className="hardware-family-card is-ready"
            aria-label="Open ESP32 / Arduino path"
            onClick={() => onNavigate("esp32")}
          >
            <div className="family-card-topline">
              <Cpu aria-hidden="true" />
              <span>ready now</span>
            </div>
            <h2>ESP32 / Arduino</h2>
            <p>
              Breadboard labs for pots, LEDs, buzzers, buttons, serial traces, and guarded starter kernels.
            </p>
            <ul>
              <li>Reflex Lab 01</li>
              <li>Analog Decisions</li>
              <li>Boundary and environment simulators</li>
            </ul>
            <span className="hardware-card-action">
              Open path <ArrowRight aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className="hardware-family-card"
            aria-label="Preview FPGA / Arty A7 path"
            onClick={() => onNavigate("arty")}
          >
            <div className="family-card-topline">
              <TerminalSquare aria-hidden="true" />
              <span>roadmap</span>
            </div>
            <h2>FPGA / Arty A7</h2>
            <p>
              Forge Logic lessons for signal demos, Pmods, VGA, audio, keypad input, and replayable FPGA evidence.
            </p>
            <ul>
              <li>Arty A7 overview</li>
              <li>Threshold reflex on fabric</li>
              <li>Signal Weaver preview</li>
            </ul>
            <span className="hardware-card-action">
              Preview path <ArrowRight aria-hidden="true" />
            </span>
          </button>

        </section>

        <SimulatedEvidencePackets />
      </section>
      {quickStartOpen ? (
        <div className="quick-start-backdrop" role="presentation" onClick={() => setQuickStartOpen(false)}>
          <section
            className="quick-start-lightbox"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-start-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="quick-start-header">
              <div>
                <p>Reflex Lab 01</p>
                <h2 id="quick-start-title">Quick Start</h2>
              </div>
              <button type="button" aria-label="Close quick start" onClick={() => setQuickStartOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="quick-start-loop">
              <span>potentiometer</span>
              <ArrowRight aria-hidden="true" />
              <span>guard kernel</span>
              <ArrowRight aria-hidden="true" />
              <span>LED + button + buzzer</span>
              <ArrowRight aria-hidden="true" />
              <span>trace replay</span>
            </div>

            <div className="quick-start-grid">
              <section>
                <h3>Parts</h3>
                <ul>
                  <li>ESP32 DevKit or ESP32 ESP-32S breakout</li>
                  <li>Breadboard, jumper wires, USB data cable</li>
                  <li>10K potentiometer, LED, 220R or 330R resistor</li>
                  <li>Tactile button, passive piezo buzzer, 1K series resistor</li>
                </ul>
              </section>
              <section>
                <h3>Wire</h3>
                <ol>
                  <li>ESP32 3V3 and GND to the breadboard rails.</li>
                  <li>Pot outer legs to 3V3/GND, wiper to GPIO34.</li>
                  <li>GPIO25 through the LED resistor to LED anode.</li>
                  <li>Program 01A, disconnect USB, then add GPIO27 button and GPIO26 buzzer.</li>
                </ol>
              </section>
              <section>
                <h3>Run</h3>
                <ul>
                  <li>Validate `threshold_reflex_v0` before hardware.</li>
                  <li>Upload firmware and monitor serial at 115200 baud.</li>
                  <li>Capture JSONL, graph replay, photos, and findings.</li>
                </ul>
              </section>
              <section>
                <h3>Boundary</h3>
                <ul>
                  <li>Use 3.3V logic only.</li>
                  <li>Never connect the potentiometer to VIN/5V.</li>
                  <li>No motors, relays, solenoids, coils, or high-current parts in Lab 01.</li>
                </ul>
              </section>
            </div>

            <footer className="quick-start-actions">
              <button type="button" onClick={() => onNavigate("reflexGuard")}>
                <Cpu aria-hidden="true" /> Open Reflex Guard
              </button>
              <button type="button" onClick={() => setQuickStartOpen(false)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      {methodOpen ? (
        <div className="quick-start-backdrop" role="presentation" onClick={() => setMethodOpen(false)}>
          <section
            className="quick-start-lightbox method-lightbox"
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="quick-start-header">
              <div>
                <p>Monogate Electronics method</p>
                <h2 id="method-title">Simulate. Build. Capture. Constrain.</h2>
              </div>
              <button type="button" aria-label="Close how it works" onClick={() => setMethodOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="method-card-grid" aria-label="Course method stages">
              <section>
                <span>1</span>
                <h3>Simulate</h3>
                <p>Start with a known kernel and trace so the expected behavior is inspectable before hardware enters the loop.</p>
              </section>
              <section>
                <span>2</span>
                <h3>Build</h3>
                <p>Wire the smallest safe circuit that can show the input, guarded decision, and output.</p>
              </section>
              <section>
                <span>3</span>
                <h3>Capture</h3>
                <p>Save serial frames, replay exports, screenshots, photos, and notes from the actual bench run.</p>
              </section>
              <section>
                <span>4</span>
                <h3>Constrain</h3>
                <p>Turn the run into an evidence packet: what happened, what was observed, and which claims stay blocked.</p>
              </section>
            </div>

            <footer className="quick-start-actions">
              <button type="button" onClick={() => onNavigate("esp32")}>
                <Cpu aria-hidden="true" /> Open ESP32 courses
              </button>
              <button type="button" onClick={() => setMethodOpen(false)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SimulatedEvidencePackets() {
  return (
    <section className="evidence-packets-section" aria-label="Simulated Evidence Packets">
      <div className="evidence-packets-header">
        <div>
          <p>Evidence bridge</p>
          <h2>Simulated Evidence Packets</h2>
        </div>
        <span>{evidenceBridge.boundary}</span>
      </div>

      <div className="evidence-packet-grid">
        {evidenceBridge.entries.map((entry) => (
          <article className="evidence-packet-card" key={entry.kernel}>
            <div className="evidence-packet-title">
              <ShieldCheck aria-hidden="true" />
              <div>
                <h3>{entry.title}</h3>
                <span>{entry.kernel}</span>
              </div>
            </div>
            <dl className="evidence-packet-metrics">
              <div>
                <dt>frames</dt>
                <dd>{entry.frames}</dd>
              </div>
              <div>
                <dt>validator</dt>
                <dd>{entry.validatorStatus}</dd>
              </div>
              <div>
                <dt>replay</dt>
                <dd>{entry.replayStatus}</dd>
              </div>
            </dl>
            <div className="evidence-guard-actions" aria-label={`${entry.title} guard actions`}>
              {Object.entries(entry.guardActions).map(([action, count]) => (
                <span key={action}>
                  {action}: {count}
                </span>
              ))}
            </div>
            <div className="evidence-claim-flags" aria-label={`${entry.title} claim flags`}>
              <span>simulated: {String(entry.claimFlags.simulated)}</span>
              <span>hardware_observed: {String(entry.claimFlags.hardware_observed)}</span>
              <span>live_serial_capture_performed: {String(entry.claimFlags.live_serial_capture_performed)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Esp32CourseLanding({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="ESP32 and Arduino course landing">
      <section className="course-select-page other-systems-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="course-select-copy">
          <p>ESP32 / Arduino Courses</p>
          <h1>Choose an ESP32 course.</h1>
          <span>
            A small course family for learning guarded control loops: each course gets its own preview, simulator path, trace language, and evidence boundary.
          </span>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="ESP32 course family loop">
          <li>preview</li>
          <li>simulate</li>
          <li>wire safely</li>
          <li>capture trace</li>
          <li>bound claims</li>
        </ol>

        <div className="other-systems-grid esp32-course-grid" aria-label="ESP32 and Arduino course list">
          <article className="course-mode-card other-system-course-card is-primary esp32-course-card">
            <MonitorPlay aria-hidden="true" />
            <p>ready now</p>
            <h2>Reflex Guard</h2>
            <span>
              Start with the first visible Monogate loop: potentiometer input, `threshold_reflex_v0`, guard clamp, LED output, and replayable trace.
            </span>
            <div className="course-card-actions" aria-label="Reflex Guard launch options">
              <button type="button" onClick={() => onNavigate("reflexGuard")}>
                Preview <ArrowRight aria-hidden="true" />
              </button>
              <a href="/learn/eml/intro">
                EML Intro <ArrowRight aria-hidden="true" />
              </a>
              <button type="button" onClick={() => onNavigate("lab")}>
                Simulator <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("physical")}>
                Physical <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </article>

          <article className="course-mode-card other-system-course-card esp32-course-card">
            <Cpu aria-hidden="true" />
            <p>simulator ready</p>
            <h2>Analog Decisions</h2>
            <span>
              Add a light sensor, threshold knob, deadband, and response-error alerting so two analog inputs become one guarded decision.
            </span>
            <div className="course-card-actions" aria-label="Analog Decisions launch options">
              <button type="button" onClick={() => onNavigate("analogCourse")}>
                Preview <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("analogLab")}>
                Simulator <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </article>

          <article className="course-mode-card other-system-course-card esp32-course-card">
            <ShieldCheck aria-hidden="true" />
            <p>simulated demo</p>
            <h2>Boundary Hardware Demo</h2>
            <span>
              A scaled ESP32 proxy for Optimization Boundary: virtual pot dimension input, guarded LED behavior, serial-style trace, and no full-optimizer hardware claim.
            </span>
            <div className="course-card-actions" aria-label="Boundary Hardware Demo launch options">
              <button type="button" onClick={() => onNavigate("boundaryHardwareCourse")}>
                Preview <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("boundarySimulator")}>
                Simulator <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </article>

          <article className="course-mode-card other-system-course-card esp32-course-card">
            <FileText aria-hidden="true" />
            <p>simulator ready</p>
            <h2>Environmental Guard Node</h2>
            <span>
              Practice stale-sensor handling and alert thresholds with an environmental node shell before claiming any live sensor capture.
            </span>
            <div className="course-card-actions" aria-label="Environmental Guard Node launch options">
              <button type="button" onClick={() => onNavigate("environmentCourse")}>
                Preview <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("environmentLab")}>
                Simulator <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>

        <section className="course-context-panel" aria-label="ESP32 course family context">
          <div>
            <BookOpen aria-hidden="true" />
            <strong>Course previews</strong>
            <span>Each card opens a course page with its own simulator, learning path, and evidence boundary.</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Evidence boundary</strong>
            <span>Browser simulations do not claim live serial capture, ESP32 flashing, or hardware observation unless a reviewed packet says so.</span>
          </div>
          <div>
            <FileText aria-hidden="true" />
            <strong>Beginner order</strong>
            <span>Reflex Guard is the recommended first course, then Analog Decisions, then environment and boundary demos.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function ReflexGuardCourseSelect({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Reflex Guard course preview">
      <section className="course-select-page other-systems-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="course-select-copy">
          <p>ESP32 / Arduino Course</p>
          <h1>Reflex Guard</h1>
          <span>
            Lab 01 teaches the first guarded loop: read a potentiometer, pass it through `threshold_reflex_v0`, clamp the output, and make the decision visible on an LED.
          </span>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="Reflex Guard course loop">
          <li>pot input</li>
          <li>ESP32 adapter</li>
          <li>EML kernel</li>
          <li>guard clamp</li>
          <li>LED output</li>
          <li>trace replay</li>
        </ol>

        <ReflexReplayPreview onNavigate={onNavigate} />

        <div className="course-mode-grid lab-choice-grid" aria-label="Reflex Guard launch cards">
          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>available now</p>
            <h2>Simulator</h2>
            <span>Place components, follow highlighted holes, inspect the trace, and export the simulated packet.</span>
            <button type="button" onClick={() => onNavigate("lab")}>
              Open simulator <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article className="course-mode-card lab-choice-card is-primary">
            <Cpu aria-hidden="true" />
            <p>breadboard path</p>
            <h2>Physical Build</h2>
            <span>Use the cautious bench guide after reviewing the simulator and wiring checklist.</span>
            <button type="button" onClick={() => onNavigate("physical")}>
              Open build <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article className="course-mode-card lab-choice-card">
            <FileText aria-hidden="true" />
            <p>after Lab 01</p>
            <h2>EML Intro</h2>
            <span>Write the guard function, inspect the C adapter shape, and see the proof obligation.</span>
            <a href="/learn/eml/intro">
              Open lesson <ArrowRight aria-hidden="true" />
            </a>
          </article>
          <article className="course-mode-card lab-choice-card">
            <BookOpen aria-hidden="true" />
            <p>course terms</p>
            <h2>Glossary</h2>
            <span>Review pin names, packet fields, evidence terms, and beginner-friendly circuit language.</span>
            <button type="button" onClick={() => onNavigate("courseGlossary")}>
              Open glossary <ArrowRight aria-hidden="true" />
            </button>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Reflex Guard context">
          <div>
            <FileText aria-hidden="true" />
            <strong>Canonical lab packet</strong>
            <span>courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/lab-packet.md</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Evidence boundary</strong>
            <span>Lab 01 wiring has local breadboard notes. Browser replay still stays simulated unless operator-approved live serial capture is attached.</span>
          </div>
          <div>
            <BookOpen aria-hidden="true" />
            <strong>Recommended first</strong>
            <span>Use this course before Analog Decisions so the guard, trace, and claim-boundary habits are already familiar.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function AnalogDecisionsCourseSelect({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Analog Decisions course preview">
      <section className="course-select-page lab-choice-page optimization-choice-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="lab-choice-hero">
          <div className="course-select-copy">
            <p>ESP32 / Arduino Course</p>
            <h1>Analog Decisions</h1>
            <span>
              Turn threshold and light readings into one guarded decision, then inspect deadband, response error, alert state, and simulated evidence output.
            </span>
          </div>
          <div className="lab-choice-hero-actions" aria-label="Analog Decisions launch options">
            <button type="button" onClick={() => onNavigate("analogLab")}>
              <MonitorPlay aria-hidden="true" /> Simulator
            </button>
          </div>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="Analog Decisions course loop">
          <li>threshold pot</li>
          <li>light sensor</li>
          <li>deadband</li>
          <li>alert output</li>
          <li>trace replay</li>
          <li>evidence</li>
        </ol>

        <section className="optimization-course-preview" aria-label="Analog Decisions simulator preview">
          <div>
            <p>simulated courseware</p>
            <h2>Two analog inputs, one guarded output</h2>
            <span>
              The simulator uses a virtual ESP32 bench with a threshold knob, LDR-style light input, status LED, serial-style frames, and no live hardware claim.
            </span>
          </div>
          <div className="optimization-preview-metrics" aria-label="Analog Decisions preview readouts">
            <span>inputs</span>
            <strong>2</strong>
            <span>guard</span>
            <strong>deadband</strong>
            <span>capture</span>
            <strong>sim</strong>
          </div>
        </section>

        <div className="course-mode-grid lab-choice-grid">
          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>available now</p>
            <h2>Simulator</h2>
            <span>Run the capstone controls, compare analog readings, and export the simulated packet.</span>
            <button type="button" onClick={() => onNavigate("analogLab")}>
              Open simulator <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article className="course-mode-card lab-choice-card is-disabled" aria-disabled="true">
            <BookOpen aria-hidden="true" />
            <p>bench packet pending</p>
            <h2>Physical</h2>
            <span>Physical wiring remains a future packet until an operator-approved bench capture exists.</span>
            <button type="button" disabled>
              Physical pending
            </button>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Analog Decisions context">
          <div>
            <FileText aria-hidden="true" />
            <strong>Course folder</strong>
            <span>courses/002-analog-decisions</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Boundary</strong>
            <span>No live sensor capture, hardware observation, or validated ESP32 flash is claimed from the browser simulator.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function EnvironmentalGuardCourseSelect({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Environmental Guard Node course preview">
      <section className="course-select-page lab-choice-page optimization-choice-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="lab-choice-hero">
          <div className="course-select-copy">
            <p>ESP32 / Arduino Course</p>
            <h1>Environmental Guard Node</h1>
            <span>
              Practice environmental alert logic with stale-sensor handling, display status, and trace replay before moving toward a reviewed sensor packet.
            </span>
          </div>
          <div className="lab-choice-hero-actions" aria-label="Environmental Guard Node launch options">
            <button type="button" onClick={() => onNavigate("environmentLab")}>
              <MonitorPlay aria-hidden="true" /> Simulator
            </button>
          </div>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="Environmental Guard Node course loop">
          <li>humidity proxy</li>
          <li>freshness check</li>
          <li>alert guard</li>
          <li>display state</li>
          <li>trace replay</li>
          <li>evidence</li>
        </ol>

        <section className="optimization-course-preview" aria-label="Environmental Guard Node simulator preview">
          <div>
            <p>simulated courseware</p>
            <h2>Stale data is part of the lesson</h2>
            <span>
              The simulator makes freshness visible: a node can alert because the value is high, or because the reading is too stale to trust.
            </span>
          </div>
          <div className="optimization-preview-metrics" aria-label="Environmental Guard preview readouts">
            <span>sensor</span>
            <strong>proxy</strong>
            <span>stale guard</span>
            <strong>on</strong>
            <span>capture</span>
            <strong>sim</strong>
          </div>
        </section>

        <div className="course-mode-grid lab-choice-grid">
          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>available now</p>
            <h2>Simulator</h2>
            <span>Run the virtual node, inspect stale readings, and keep the evidence boundary explicit.</span>
            <button type="button" onClick={() => onNavigate("environmentLab")}>
              Open simulator <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article className="course-mode-card lab-choice-card is-disabled" aria-disabled="true">
            <BookOpen aria-hidden="true" />
            <p>sensor packet pending</p>
            <h2>Physical</h2>
            <span>Live I2C sensor capture needs a reviewed runbook and operator approval before public claims.</span>
            <button type="button" disabled>
              Physical pending
            </button>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Environmental Guard Node context">
          <div>
            <FileText aria-hidden="true" />
            <strong>Course folder</strong>
            <span>courses/003-environmental-guard-node</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Boundary</strong>
            <span>No live environmental sensor observation, ESP32 flash, or serial capture is claimed by this preview.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function BoundaryHardwareDemoCourseSelect({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Boundary Hardware Demo course preview">
      <section className="course-select-page lab-choice-page optimization-choice-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="lab-choice-hero">
          <div className="course-select-copy">
            <p>ESP32 / Arduino Course</p>
            <h1>Boundary Hardware Demo</h1>
            <span>
              A hardware-style proxy for the Optimization Boundary idea: use a virtual ESP32 bench to make dimension stress, guard mode, and boundary readouts inspectable.
            </span>
          </div>
          <div className="lab-choice-hero-actions" aria-label="Boundary Hardware Demo launch options">
            <button type="button" onClick={() => onNavigate("boundarySimulator")}>
              <MonitorPlay aria-hidden="true" /> Simulator
            </button>
          </div>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="Boundary Hardware Demo course loop">
          <li>dimension knob</li>
          <li>guard mode</li>
          <li>stress LED</li>
          <li>OLED readout</li>
          <li>trace replay</li>
          <li>claim flags</li>
        </ol>

        <section className="optimization-course-preview" aria-label="Boundary Hardware Demo simulator preview">
          <div>
            <p>simulated ESP32 proxy</p>
            <h2>Hardware feel, software-bounded claim</h2>
            <span>
              This demo does not claim a full optimizer running on hardware. It teaches the boundary behavior with virtual controls and explicit simulated evidence flags.
            </span>
          </div>
          <div className="optimization-preview-metrics" aria-label="Boundary Hardware Demo preview readouts">
            <span>hardware observed</span>
            <strong>false</strong>
            <span>live serial</span>
            <strong>false</strong>
            <span>mode</span>
            <strong>sim</strong>
          </div>
        </section>

        <div className="course-mode-grid lab-choice-grid">
          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>available now</p>
            <h2>Simulator</h2>
            <span>Use the shared breadboard lab shell to inspect virtual controls, dashboard readouts, and simulated evidence.</span>
            <button type="button" onClick={() => onNavigate("boundarySimulator")}>
              Open simulator <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article className="course-mode-card lab-choice-card is-disabled" aria-disabled="true">
            <BookOpen aria-hidden="true" />
            <p>hardware not approved</p>
            <h2>Physical</h2>
            <span>A physical proxy requires a reviewed runbook; this page only claims the browser simulator.</span>
            <button type="button" disabled>
              Physical locked
            </button>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Boundary Hardware Demo context">
          <div>
            <FileText aria-hidden="true" />
            <strong>Related software course</strong>
            <span>Other Systems / Optimization Boundary remains the software-first simulator and analysis path.</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Boundary</strong>
            <span>No hardware observation, serial capture, ESP32 flash, or full-optimizer hardware claim is made here.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

function ReflexReplayPreview({ onNavigate }: { onNavigate: (target: LandingTarget) => void }) {
  const [potRaw, setPotRaw] = useState(0.85);
  const [previousOutput, setPreviousOutput] = useState(0.6);
  const frame = useMemo(() => replayFrame(potRaw, previousOutput), [potRaw, previousOutput]);
  const isClamped = frame.guardAction === "clamp_to_safe_output";

  return (
    <section className="reflex-preview" aria-label="Reflex Lab 01 interactive replay preview">
      <div className="reflex-preview-header">
        <div>
          <p>breadboard-tested circuit, simulated replay</p>
          <h2>Reflex Lab 01 replay preview</h2>
        </div>
        <div className="reflex-preview-header-actions">
          <span>No hardware observation or live serial capture.</span>
          <button type="button" onClick={() => onNavigate("lab")}>
            Open simulator <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="reflex-flow-band" aria-label="Lab flow">
        {["potentiometer", reflexKernel.id, "guard clamp", "LED", "trace", "replay"].map((item, index) => (
          <span key={item} className={index === 1 ? "is-kernel" : ""}>
            {item}
          </span>
        ))}
      </div>

      <div className="reflex-preview-grid">
        <div className="reflex-control-panel">
          <label>
            <span>pot_raw</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={potRaw}
              onChange={(event) => setPotRaw(Number(event.target.value))}
            />
            <strong>{format(potRaw)}</strong>
          </label>
          <label>
            <span>previous_output</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={previousOutput}
              onChange={(event) => setPreviousOutput(Number(event.target.value))}
            />
            <strong>{format(previousOutput)}</strong>
          </label>
          <div className={`reflex-guard-readout${isClamped ? " is-clamped" : ""}`}>
            <span>{frame.guardAction}</span>
            <strong>{format(frame.safeOutput)}</strong>
          </div>
        </div>

        <div className="reflex-board-panel" aria-label="Reflex Course replay diagram">
          <div className="reflex-board">
            <div className="reflex-rail rail-top">3V3</div>
            <div className="reflex-rail rail-bottom">GND</div>
            <div className="reflex-part pot" style={{ "--level": potRaw } as CSSProperties}>
              POT
            </div>
            <div className="reflex-part kernel">EML</div>
            <div className={`reflex-part guard-chip${isClamped ? " active" : ""}`}>GUARD</div>
            <div className="reflex-part resistor">R</div>
            <div className="reflex-part led" style={{ "--glow": frame.safeOutput } as CSSProperties}>
              LED
            </div>
            <svg aria-hidden="true" viewBox="0 0 620 300" className="reflex-wires">
              <path d="M82 160 H202" />
              <path d="M268 160 H338" />
              <path d="M402 160 H472" />
              <path d="M512 160 H555" />
              <path d="M555 160 V238 H80" />
              <path d="M80 238 V160" />
            </svg>
          </div>
        </div>

        <div className="reflex-trace-panel">
          <h3>Golden trace</h3>
          <div className="reflex-trace-table" role="table" aria-label="Golden trace frames">
            <div className="trace-row trace-head" role="row">
              <span>#</span>
              <span>pot</span>
              <span>request</span>
              <span>safe</span>
              <span>guard</span>
            </div>
            {reflexTrace.map((row) => (
              <div className="trace-row" role="row" key={row.sample_index}>
                <span>{row.sample_index}</span>
                <span>{format(row.pot_raw)}</span>
                <span>{format(row.requested_output)}</span>
                <span>{format(row.safe_output)}</span>
                <span className={row.guard_action === "clamp_to_safe_output" ? "warn" : "ok"}>{row.guard_action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="reflex-boundary-panel">
          <h3>Boundary flags</h3>
          <div>
            <span>hardware_observed: false</span>
            <span>simulated: true</span>
            <span>live_serial_capture_performed: false</span>
            <span>certified_safety_claim: false</span>
            <span>production_controller_claim: false</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OtherSystemsLanding({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Other Systems electronics courses">
      <section className="course-select-page other-systems-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="course-select-copy">
          <p>Other Systems</p>
          <h1>Software labs with lab-bench habits.</h1>
          <span>
            Start with simulated systems where the controls feel tactile, the claims stay bounded, and every run leaves replayable evidence.
          </span>
        </div>

        <div className="other-systems-grid" aria-label="Other Systems course list">
          <button
            type="button"
            className="course-mode-card other-system-course-card is-primary"
            aria-label="Open Optimization Boundary course"
            onClick={() => onNavigate("boundary")}
          >
            <ShieldCheck aria-hidden="true" />
            <p>ready now</p>
            <h2>Optimization Boundary</h2>
            <span>
              Use a hardware-style control surface to compare raw, guarded, log-domain, and auto-rescue sampling around high-dimensional boundaries.
            </span>
            <strong>
              Open course <ArrowRight aria-hidden="true" />
            </strong>
          </button>

          <article className="course-mode-card other-system-course-card is-muted">
            <FileText aria-hidden="true" />
            <p>planned</p>
            <h2>Field Sensor Tracks</h2>
            <span>
              Future software-first labs for replaying field-data decisions without claiming live instrument capture.
            </span>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Other Systems evidence boundary">
          <div>
            <MonitorPlay aria-hidden="true" />
            <strong>Simulated courseware</strong>
            <span>These labs do not claim serial capture, flashing, FPGA programming, or physical observation.</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Evidence first</strong>
            <span>Each module exports a packet that states what was simulated and what was not performed.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function OptimizationBoundaryCourseSelect({
  onNavigate,
  onBack
}: {
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Optimization Boundary course options">
      <section className="course-select-page lab-choice-page optimization-choice-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="lab-choice-hero">
          <div className="course-select-copy">
            <p>Other Systems Path</p>
            <h1>Optimization Boundary</h1>
            <span>
              Explore the boundary-concentration idea in software now, then treat the physical Trainer Board proxy as a planned path until a reviewed hardware runbook exists.
            </span>
          </div>
          <div className="lab-choice-hero-actions" aria-label="Optimization Boundary launch options">
            <button type="button" onClick={() => onNavigate("boundarySoftware")}>
              <MonitorPlay aria-hidden="true" /> Software
            </button>
            <button type="button" onClick={() => onNavigate("boundarySimulator")}>
              <MonitorPlay aria-hidden="true" /> Simulator
            </button>
            <button type="button" disabled aria-disabled="true">
              <BookOpen aria-hidden="true" /> Physical
            </button>
          </div>
        </div>

        <ol className="landing-pipeline is-compact" aria-label="Optimization Boundary course loop">
          <li>virtual knob</li>
          <li>EML sampler</li>
          <li>guard switch</li>
          <li>OLED/LED output</li>
          <li>trace replay</li>
          <li>evidence</li>
        </ol>

        <section className="optimization-course-preview" aria-label="Optimization Boundary simulator preview">
          <div>
            <p>simulated courseware</p>
            <h2>Simulated hardware loop</h2>
            <span>
              The board is virtual: knob, mode switches, status LEDs, OLED readouts, trace frames, and a packet that states no hardware was observed.
            </span>
          </div>
          <div className="optimization-preview-metrics" aria-label="Preview boundary readouts">
            <span>boundary_hits</span>
            <strong>244</strong>
            <span>center_hits</span>
            <strong>12</strong>
            <span>finite_survival_rate</span>
            <strong>1.00</strong>
          </div>
        </section>

        <div className="course-mode-grid lab-choice-grid">
          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>available now</p>
            <h2>Software Simulator</h2>
            <span>
              Drive the virtual control surface, replay boundary frames, and export the simulated evidence packet.
            </span>
            <button type="button" onClick={() => onNavigate("boundarySoftware")}>
              Open software <ArrowRight aria-hidden="true" />
            </button>
          </article>

          <article className="course-mode-card lab-choice-card is-primary">
            <MonitorPlay aria-hidden="true" />
            <p>shared bench</p>
            <h2>Simulator</h2>
            <span>
              Use the same breadboard, camera, inventory, course menu, dashboard, and replay shell as the Trainer Board lab.
            </span>
            <button type="button" onClick={() => onNavigate("boundarySimulator")}>
              Open simulator <ArrowRight aria-hidden="true" />
            </button>
          </article>

          <article className="course-mode-card lab-choice-card is-disabled" aria-disabled="true">
            <BookOpen aria-hidden="true" />
            <p>not approved yet</p>
            <h2>Physical</h2>
            <span>
              Planned scaled demo only: ESP32 pot selects dimension, LED shows boundary stress, and serial emits comparable trace frames after approval.
            </span>
            <button type="button" disabled>
              Physical planned
            </button>
          </article>
        </div>

        <section className="course-context-panel" aria-label="Optimization Boundary context">
          <div>
            <FileText aria-hidden="true" />
            <strong>Canonical module</strong>
            <span>courses/006-ee-math-kernels/lesson-05-optimization-boundary.md</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Boundary</strong>
            <span>No hardware observation, serial capture, ESP32 flash, or FPGA programming is claimed.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export function ArtyA7Preview({ onBack }: { onBack: () => void }) {
  return (
    <main className="landing-shell" aria-label="Arty A7 electronics roadmap">
      <section className="course-select-page roadmap-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>
        <div className="course-select-copy">
          <p>FPGA / Forge Logic</p>
          <h1>Arty A7</h1>
          <span>
            The FPGA track is available as an advanced roadmap preview. The suggested path starts with Reflex Lab, but experienced FPGA users can inspect this lane directly.
          </span>
        </div>

        <div className="roadmap-grid">
          <article className="course-mode-card roadmap-card">
            <Cpu aria-hidden="true" />
            <h2>EML Signal Weaver</h2>
            <p>
              A procedural media demo where one EML definition drives audio, visuals, controls, and replayable traces.
            </p>
          </article>
          <article className="course-mode-card roadmap-card">
            <BookOpen aria-hidden="true" />
            <h2>Planned Pmods</h2>
            <p>
              OLEDrgb, keypad, seven-segment display, light/color sensors, encoder, VGA, I2S2 audio, and 8LD output.
            </p>
          </article>
        </div>

        <div className="roadmap-note">
          <strong>Suggested order:</strong>
          <span>Reflex Lab Series first for the smoothest path. Experienced users can jump into Forge Logic readiness notes without unlocking anything.</span>
        </div>
      </section>
    </main>
  );
}
