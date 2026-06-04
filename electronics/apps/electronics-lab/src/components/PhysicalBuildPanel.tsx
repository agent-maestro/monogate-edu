import { ArrowRight, Download, FileText, Github, MonitorPlay } from "lucide-react";
import { GlossaryHint } from "./GlossaryHint";
import { reflexSimulatorCourse } from "./simulatorCourses";

const physicalBuildSteps = reflexSimulatorCourse.coursePanel.steps;
const publicEducationRepoUrl = "https://github.com/agent-maestro/monogate-edu";
const publicEducationZipUrl = `${publicEducationRepoUrl}/archive/refs/heads/main.zip`;

export function PhysicalBuildPanel({
  onLaunchLab,
  onBack
}: {
  onLaunchLab: () => void;
  onBack: () => void;
}) {
  return (
    <main className="landing-shell" aria-label="Reflex Lab 01 physical build instructions">
      <section className="physical-page">
        <div className="physical-page-header">
          <button className="landing-back-button" type="button" onClick={onBack}>
            Back
          </button>
          <div>
            <p>Physical build / Reflex Course</p>
            <h1>Reflex Lab 01: Breadboard Build</h1>
            <span>
              The release build is <GlossaryHint term="Breadboard" label="breadboard" compact /> only: no soldering, perfboard, or permanent assembly yet.
            </span>
          </div>
          <button className="physical-launch-button" type="button" onClick={onLaunchLab}>
            <MonitorPlay aria-hidden="true" /> Open simulator
          </button>
        </div>

        <section className="physical-download-card" aria-label="Student files download">
          <div>
            <p>Student files</p>
            <h2>Download the current course files from GitHub.</h2>
            <span>
              The ZIP comes from the public `monogate-edu` repo's `main` branch, so it stays current without hosting a static ZIP on this site.
            </span>
          </div>
          <div className="physical-download-actions">
            <a href={publicEducationZipUrl} target="_blank" rel="noreferrer">
              <Download aria-hidden="true" /> Download ZIP
            </a>
            <a href={publicEducationRepoUrl} target="_blank" rel="noreferrer">
              <Github aria-hidden="true" /> GitHub repo
            </a>
          </div>
        </section>

        <section className="physical-setup-card" aria-label="Windows and Mac setup guide">
          <div className="physical-setup-heading">
            <p>Computer setup</p>
            <h2>Windows | Mac install path</h2>
            <span>
              Use Chrome or Edge for the dashboard path. Safari is fine for reading docs, but Chrome or Edge is the supported serial workflow.
            </span>
          </div>
          <div className="physical-setup-grid">
            <article>
              <strong>Windows</strong>
              <ul>
                <li>Install Arduino IDE 2.x and the `esp32 by Espressif Systems` board package.</li>
                <li>Select the ESP32 port shown as `COM3`, `COM6`, or similar.</li>
                <li>Use the dashboard launcher when you want the local serial dashboard.</li>
              </ul>
            </article>
            <article>
              <strong>Mac</strong>
              <ul>
                <li>Install Arduino IDE 2.x and the `esp32 by Espressif Systems` board package.</li>
                <li>Select the ESP32 port shown as `/dev/cu.usbserial-*`, `/dev/cu.SLAB_USBtoUART`, or `/dev/cu.wchusbserial*`.</li>
                <li>Run the dashboard manually with `python3`; the Mac path follows the standard ESP32/macOS workflow.</li>
              </ul>
            </article>
          </div>
          <div className="physical-download-actions">
            <a href="/courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/setup-guide.md" target="_blank" rel="noreferrer">
              <FileText aria-hidden="true" /> Full setup guide
            </a>
            <a href="/courses/001-reflex-guard/lab-bundle/README.md" target="_blank" rel="noreferrer">
              <FileText aria-hidden="true" /> Dashboard notes
            </a>
          </div>
        </section>

        <div className="physical-layout">
          <section className="physical-card physical-resources">
            <h2>Resources</h2>
            <div className="resource-list">
              <a href="/courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/quick-start.pdf" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Printable Quick Start</strong>
                  <em>One-page Reflex Lab 01 bench checklist</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/lab-packet.md" download>
                <FileText aria-hidden="true" />
                <span>
                  <strong>Reflex Lab 01 Lab Packet</strong>
                  <em>First live lab demo packet</em>
                </span>
                <Download aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/setup-guide.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Computer Setup Guide</strong>
                  <em>Windows | Mac install, browser, serial port, and dashboard help</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/hardware/bom.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Bill Of Materials</strong>
                  <em>Parts list for the breadboard build</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/hardware/build-guide.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Build Guide</strong>
                  <em>01A LED path, then 01B button and buzzer</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/hardware/schematic.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Reference Schematic</strong>
                  <em>GPIO34, GPIO25, GPIO26, and GPIO27 wiring</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/evidence-packet-guide.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Evidence Packet Guide</strong>
                  <em>Trace, replay, photos, findings, and claim flags</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/lab-bundle/start-reflex-dashboard.bat" download>
                <Download aria-hidden="true" />
                <span>
                  <strong>Dashboard Launcher</strong>
                  <em>Download the Windows launcher for the local serial dashboard</em>
                </span>
                <Download aria-hidden="true" />
              </a>
              <a href="/courses/001-reflex-guard/lab-bundle/README.md" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Dashboard Bundle Notes</strong>
                  <em>COM port override and evidence export notes</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/electronics/esp32/reflex-guard/glossary" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Course 001 Glossary</strong>
                  <em>Reflex Guard pins, packet fields, and lab terms</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="/electronics/glossary" target="_blank" rel="noreferrer">
                <FileText aria-hidden="true" />
                <span>
                  <strong>Living Glossary</strong>
                  <em>Shared electronics, tools, and evidence terms</em>
                </span>
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </section>

          <section className="physical-card">
            <h2>Parts</h2>
            <ul>
              <li>ESP32 ESP-32S + 30P breakout</li>
              <li>25-row <GlossaryHint term="Breadboard" label="breadboard" compact /></li>
              <li>10K <GlossaryHint term="Potentiometer" label="potentiometer" compact /></li>
              <li><GlossaryHint term="LED" compact /></li>
              <li>330 ohm <GlossaryHint term="Resistor" label="resistor" compact /></li>
              <li>Tactile <GlossaryHint term="Button" label="button" compact /></li>
              <li>Passive piezo <GlossaryHint term="Buzzer" label="buzzer" compact /></li>
              <li>1K buzzer <GlossaryHint term="Resistor" label="resistor" compact /></li>
              <li><GlossaryHint term="Jumper Wire" label="Jumper wires" compact />: red for <GlossaryHint term="3V3 Rail" label="3V3" compact />, green or blue for <GlossaryHint term="Ground" label="ground" compact /></li>
            </ul>
          </section>

          <section className="physical-card">
            <h2>Quick Wiring Reference</h2>
            <ol>
              <li><span>ESP32 GND</span><strong><GlossaryHint term="Ground Rail" label="blue/- rail" compact /></strong></li>
              <li><span>ESP32 3V3</span><strong><GlossaryHint term="3V3 Rail" label="red/+ rail" compact /></strong></li>
              <li><span>Pot GND outer</span><strong><GlossaryHint term="Ground Rail" label="blue/- rail" compact /></strong></li>
              <li><span>Pot wiper</span><strong><GlossaryHint term="GPIO34" label="GPIO34 POT" compact /></strong></li>
              <li><span>Pot 3V3 outer</span><strong><GlossaryHint term="3V3 Rail" label="red/+ rail" compact /></strong></li>
              <li><span>GPIO25 LED</span><strong><GlossaryHint term="GPIO25" label="resistor GPIO side" compact /></strong></li>
              <li><span>resistor LED side</span><strong><GlossaryHint term="LED" label="LED anode +" compact /></strong></li>
              <li><span>LED cathode -</span><strong><GlossaryHint term="Ground Rail" label="blue/- rail" compact /></strong></li>
              <li><span>Stop / program 01A</span><strong>then disconnect USB</strong></li>
              <li><span>GPIO27 BUTTON</span><strong><GlossaryHint term="GPIO27" label="button to blue/- rail" compact /></strong></li>
              <li><span>GPIO26 BUZZ</span><strong><GlossaryHint term="GPIO26" label="1K resistor to piezo +" compact /></strong></li>
              <li><span>Piezo -</span><strong><GlossaryHint term="Ground Rail" label="blue/- rail" compact /></strong></li>
            </ol>
          </section>

          <section className="physical-card physical-steps">
            <h2>Build Path</h2>
            <ol>
              {physicalBuildSteps.map((step) => (
                <li key={step.title}>
                  <span>{step.title}</span>
                  <strong>{step.shortInstruction}</strong>
                  <p>{step.goal}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <button className="physical-next-button" type="button" onClick={onLaunchLab}>
          Check it in the simulator <ArrowRight aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
