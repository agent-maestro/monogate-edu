import {
  ArrowRight,
  BookOpen,
  CircuitBoard,
  Cpu,
  FileText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench
} from "lucide-react";
import { useMemo, useState } from "react";
import type { LandingTarget } from "./LandingPage";

type GlossaryCategory = "Monogate" | "Circuits" | "Components" | "Tools" | "Math" | "Course 001";

export type GlossaryTerm = {
  id: string;
  term: string;
  category: GlossaryCategory;
  definition: string;
  monogateContext: string;
  courseExample: string;
  related: string[];
  courseIds?: string[];
};

const categoryOptions: Array<"All" | GlossaryCategory> = [
  "All",
  "Monogate",
  "Circuits",
  "Components",
  "Tools",
  "Math",
  "Course 001"
];

const categoryIcons: Record<GlossaryCategory, typeof BookOpen> = {
  Monogate: ShieldCheck,
  Circuits: CircuitBoard,
  Components: Cpu,
  Tools: Wrench,
  Math: SlidersHorizontal,
  "Course 001": FileText
};

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "claim-flag",
    term: "Claim Flag",
    category: "Monogate",
    definition: "A clear true, false, or blocked label that says what a lab result is allowed to support.",
    monogateContext: "Claim flags keep course language humble. They separate observed behavior from plans, simulations, and open questions.",
    courseExample: "Lab 02 can mark hardware_observed true only after a real capture is attached.",
    related: ["Evidence Packet", "Hardware Observed", "Non-Claim"],
    courseIds: ["001"]
  },
  {
    id: "evidence-packet",
    term: "Evidence Packet",
    category: "Monogate",
    definition: "A bundle of trace data, metadata, comparison results, notes, and claim flags for one lab run.",
    monogateContext: "The packet is the handoff shape for review. It should show what happened and what remains unsupported.",
    courseExample: "Course 001 uses the packet to connect Reflex Lab 01 wiring, serial frames, replay, and blocked safety claims.",
    related: ["Trace", "Replay", "Claim Flag"],
    courseIds: ["001"]
  },
  {
    id: "golden-trace",
    term: "Golden Trace",
    category: "Monogate",
    definition: "A known-good sample trace used to validate the expected kernel behavior before live hardware work.",
    monogateContext: "It gives reviewers a stable baseline before a course adds captured bench data.",
    courseExample: "threshold_reflex_v0 includes a JSONL golden trace that shows the guard clamping at the safe output limit.",
    related: ["Trace", "Replay", "Guard Clamp"],
    courseIds: ["001"]
  },
  {
    id: "guard",
    term: "Guard",
    category: "Monogate",
    definition: "A rule that constrains a requested output before it reaches the visible or physical output.",
    monogateContext: "Guards are where Monogate courses make the boundary explicit instead of assuming a requested output is safe.",
    courseExample: "The Reflex Guard limits the LED and buzzer behavior to the allowed safe output range.",
    related: ["Guard Clamp", "Safe Output", "Requested Output"],
    courseIds: ["001"]
  },
  {
    id: "guard-clamp",
    term: "Guard Clamp",
    category: "Monogate",
    definition: "A guard action that caps a requested output at a configured maximum.",
    monogateContext: "A clamp is easy to inspect because the packet can show both the request and the constrained output.",
    courseExample: "When requested_output rises above 0.85, safe_output stays at 0.85.",
    related: ["Guard", "Safe Output", "Threshold Reflex v0"],
    courseIds: ["001"]
  },
  {
    id: "hardware-observed",
    term: "Hardware Observed",
    category: "Monogate",
    definition: "A claim flag meaning the behavior was seen on physical hardware with supporting capture context.",
    monogateContext: "A simulator screenshot is useful, but it does not make hardware_observed true.",
    courseExample: "Course 001 can become hardware observed only when the actual ESP32 run has serial rows and notes attached.",
    related: ["Live Capture", "Evidence Packet", "Claim Flag"],
    courseIds: ["001"]
  },
  {
    id: "kernel",
    term: "Kernel",
    category: "Monogate",
    definition: "The small decision rule or model under test.",
    monogateContext: "A course kernel should be inspectable enough that learners can compare it with trace frames.",
    courseExample: "threshold_reflex_v0 maps pot_raw to requested_output, applies step limits, then lets the guard cap output.",
    related: ["Trace", "Threshold Reflex v0", "Replay"],
    courseIds: ["001"]
  },
  {
    id: "live-capture",
    term: "Live Capture",
    category: "Monogate",
    definition: "Data recorded from a real running device during a specific bench session.",
    monogateContext: "Live capture needs device identity, tool, timestamp, context notes, and raw rows.",
    courseExample: "A Lab 02 live capture comes from the ESP32 serial monitor or dashboard, not from the browser simulator.",
    related: ["Hardware Observed", "Serial Monitor", "Evidence Packet"],
    courseIds: ["001"]
  },
  {
    id: "non-claim",
    term: "Non-Claim",
    category: "Monogate",
    definition: "An explicit statement that a lab does not prove a broader or higher-risk result.",
    monogateContext: "Non-claims protect the course from implying certification, production readiness, or broad performance conclusions.",
    courseExample: "Reflex Lab 01 is not a certified safety controller.",
    related: ["Claim Flag", "Evidence Packet", "Guard"],
    courseIds: ["001"]
  },
  {
    id: "replay",
    term: "Replay",
    category: "Monogate",
    definition: "A way to inspect saved trace frames after the run has ended.",
    monogateContext: "Replay makes the evidence reviewable without asking someone to trust a memory of the bench session.",
    courseExample: "Lab 02 replays captured JSONL frames and compares them with expected kernel behavior.",
    related: ["Trace", "Golden Trace", "Evidence Packet"],
    courseIds: ["001"]
  },
  {
    id: "trace",
    term: "Trace",
    category: "Monogate",
    definition: "A sequence of frames showing inputs, outputs, guard action, and timing for a run.",
    monogateContext: "Trace rows are the bridge between a circuit action and a reviewer-readable packet.",
    courseExample: "A Reflex Lab 01 trace includes pot_raw, requested_output, safe_output, button state, and buzzer state.",
    related: ["Replay", "JSONL", "Golden Trace"],
    courseIds: ["001"]
  },
  {
    id: "requested-output",
    term: "Requested Output",
    category: "Monogate",
    definition: "The output level the kernel asks for before the guard applies the final limit.",
    monogateContext: "Keeping requested and safe output separate makes guard behavior reviewable.",
    courseExample: "In Reflex Lab 01, requested_output can rise above the allowed limit before safe_output is clamped.",
    related: ["Safe Output", "Guard Clamp", "Trace"],
    courseIds: ["001"]
  },
  {
    id: "3v3-rail",
    term: "3V3 Rail",
    category: "Circuits",
    definition: "The breadboard rail connected to the ESP32 3.3 V supply.",
    monogateContext: "Low-voltage rails make the first course repeatable and easier to inspect.",
    courseExample: "The potentiometer high side connects to the 3V3 rail, never VIN or 5V.",
    related: ["Ground Rail", "Breadboard", "Voltage"],
    courseIds: ["001"]
  },
  {
    id: "adc",
    term: "ADC",
    category: "Circuits",
    definition: "Analog-to-digital conversion; the MCU process that turns a voltage into a number.",
    monogateContext: "ADC values are often normalized before a kernel uses them.",
    courseExample: "GPIO34 reads the potentiometer voltage and turns it into pot_raw.",
    related: ["GPIO34", "Pot Raw", "Voltage Divider"],
    courseIds: ["001"]
  },
  {
    id: "breadboard",
    term: "Breadboard",
    category: "Circuits",
    definition: "A reusable board for temporary circuits without soldering.",
    monogateContext: "Courses use breadboards so learners can inspect and rebuild the loop step by step.",
    courseExample: "Reflex Lab 01 uses the side rails for 3V3 and GND and the middle rows for components.",
    related: ["Jumper Wire", "3V3 Rail", "Ground Rail"],
    courseIds: ["001"]
  },
  {
    id: "current",
    term: "Current",
    category: "Circuits",
    definition: "The flow of electric charge through a circuit.",
    monogateContext: "Current limits are part of keeping learner circuits modest and inspectable.",
    courseExample: "The LED resistor limits current from GPIO25 through the LED.",
    related: ["Voltage", "Resistor", "Ohm's Law"],
    courseIds: ["001"]
  },
  {
    id: "gpio",
    term: "GPIO",
    category: "Circuits",
    definition: "General-purpose input/output pin on a microcontroller.",
    monogateContext: "GPIO pins are the boundary between the kernel adapter and the circuit.",
    courseExample: "Course 001 uses GPIO34 for analog input, GPIO25 for LED PWM, GPIO27 for the button, and GPIO26 for the buzzer.",
    related: ["GPIO34", "GPIO25", "GPIO26", "GPIO27"],
    courseIds: ["001"]
  },
  {
    id: "ground",
    term: "Ground",
    category: "Circuits",
    definition: "The shared 0 V reference point for a circuit.",
    monogateContext: "Without a shared ground, signal readings and output behavior can become meaningless.",
    courseExample: "The ESP32 GND pin ties to the breadboard negative rail.",
    related: ["Ground Rail", "3V3 Rail", "Voltage"],
    courseIds: ["001"]
  },
  {
    id: "ground-rail",
    term: "Ground Rail",
    category: "Circuits",
    definition: "The breadboard rail tied to the ESP32 GND pin.",
    monogateContext: "A shared ground is required before inputs and outputs can be interpreted correctly.",
    courseExample: "The pot low side, LED return, buzzer return, and ESP32 GND all share the ground rail.",
    related: ["Ground", "3V3 Rail", "Breadboard"],
    courseIds: ["001"]
  },
  {
    id: "jumper-wire",
    term: "Jumper Wire",
    category: "Circuits",
    definition: "A removable wire used to connect breadboard rows, rails, and module pins.",
    monogateContext: "Jumper wires make the circuit easy to rebuild and audit one connection at a time.",
    courseExample: "Course 001 uses jumpers from ESP32 3V3, GND, GPIO34, GPIO25, GPIO26, and GPIO27.",
    related: ["Breadboard", "GPIO", "3V3 Rail"],
    courseIds: ["001"]
  },
  {
    id: "pwm",
    term: "PWM",
    category: "Circuits",
    definition: "Pulse-width modulation; rapid on/off switching used to create an average output level.",
    monogateContext: "PWM is a simple way to make a guarded output visible without needing an analog output pin.",
    courseExample: "The ESP32 uses PWM on GPIO25 so the LED brightness follows safe_output.",
    related: ["LED", "Safe Output", "GPIO25"],
    courseIds: ["001"]
  },
  {
    id: "voltage-divider",
    term: "Voltage Divider",
    category: "Circuits",
    definition: "A resistor network that produces a fraction of an input voltage.",
    monogateContext: "Many sensor courses start by turning a physical condition into a measurable voltage.",
    courseExample: "The Course 001 potentiometer acts like an adjustable divider between 3V3 and GND.",
    related: ["Potentiometer", "ADC", "Ohm's Law"],
    courseIds: ["001"]
  },
  {
    id: "voltage",
    term: "Voltage",
    category: "Circuits",
    definition: "Electrical potential difference between two points.",
    monogateContext: "Voltage is what the ESP32 ADC samples when a sensor or knob creates an input level.",
    courseExample: "GPIO34 reads the pot wiper voltage relative to ground.",
    related: ["Current", "Ground", "Voltage Divider"],
    courseIds: ["001"]
  },
  {
    id: "buzzer",
    term: "Buzzer",
    category: "Components",
    definition: "A small sound output device. Course 001 uses a passive piezo buzzer.",
    monogateContext: "The buzzer makes output behavior obvious, but it must stay low-current and learner-safe.",
    courseExample: "Lab 01B drives the buzzer from GPIO26 through a 1 kOhm resistor, and the button mutes it.",
    related: ["GPIO26", "Button Mute", "Safe Output"],
    courseIds: ["001"]
  },
  {
    id: "button",
    term: "Button",
    category: "Components",
    definition: "A switch that changes circuit state when pressed.",
    monogateContext: "Buttons are useful for teaching explicit operator intent and override behavior.",
    courseExample: "The Lab 01B tactile button uses INPUT_PULLUP and mutes the buzzer when pressed.",
    related: ["Button Mute", "Pull-Up", "GPIO27"],
    courseIds: ["001"]
  },
  {
    id: "pull-up",
    term: "Pull-Up",
    category: "Components",
    definition: "A resistor connection that holds an input high when a switch is open.",
    monogateContext: "Pull-ups keep digital inputs from floating between states.",
    courseExample: "GPIO27 uses INPUT_PULLUP, so pressing the button pulls the input toward ground.",
    related: ["Button", "GPIO27", "Ground"],
    courseIds: ["001"]
  },
  {
    id: "led",
    term: "LED",
    category: "Components",
    definition: "A diode that emits light when current flows in the correct direction.",
    monogateContext: "An LED is the first visible output because it is low power and easy to inspect.",
    courseExample: "The Course 001 LED brightness follows safe_output through GPIO25 PWM.",
    related: ["PWM", "Resistor", "Safe Output"],
    courseIds: ["001"]
  },
  {
    id: "potentiometer",
    term: "Potentiometer",
    category: "Components",
    definition: "A three-terminal adjustable resistor commonly used as a knob input.",
    monogateContext: "It gives learners a smooth human-controlled input before sensors are introduced.",
    courseExample: "The pot outer legs connect to 3V3 and GND; the wiper goes to GPIO34.",
    related: ["Voltage Divider", "Pot Raw", "ADC"],
    courseIds: ["001"]
  },
  {
    id: "resistor",
    term: "Resistor",
    category: "Components",
    definition: "A component that resists current flow.",
    monogateContext: "Resistors set limits, divide voltage, and make outputs safer to test.",
    courseExample: "Course 001 uses a resistor in series with the LED and a 1 kOhm resistor in the buzzer path.",
    related: ["Ohm's Law", "LED", "Buzzer"],
    courseIds: ["001"]
  },
  {
    id: "arduino-ide",
    term: "Arduino IDE",
    category: "Tools",
    definition: "A beginner-friendly editor and uploader for Arduino-compatible firmware.",
    monogateContext: "It is the easiest route for learners flashing the ESP32 firmware.",
    courseExample: "Course 001 firmware is opened in the Arduino IDE, uploaded to the ESP32, and observed at 115200 baud.",
    related: ["Firmware", "Serial Monitor", "ESP32"],
    courseIds: ["001"]
  },
  {
    id: "dashboard",
    term: "Dashboard",
    category: "Tools",
    definition: "The shared Monogate viewer for course-specific serial data, logs, and evidence-friendly state.",
    monogateContext: "The dashboard should remain reusable while course schemas define the signals and labels.",
    courseExample: "The Reflex dashboard profile displays pot_raw, button state, safe_output, LED level, and buzzer state.",
    related: ["Live Capture", "Trace", "Schema"],
    courseIds: ["001"]
  },
  {
    id: "schema",
    term: "Schema",
    category: "Tools",
    definition: "A structured description of the fields, names, and expected shape of course data.",
    monogateContext: "Schemas let the shared dashboard stay stable while individual courses define their own signals.",
    courseExample: "The Reflex dashboard schema names fields like pot_raw, safe_output, button_pressed, and buzzer_on.",
    related: ["Dashboard", "Trace", "Evidence Packet"],
    courseIds: ["001"]
  },
  {
    id: "esp32",
    term: "ESP32",
    category: "Tools",
    definition: "A low-cost microcontroller board with analog input, digital IO, PWM, and serial over USB.",
    monogateContext: "It is the first public hardware path because learners can build useful loops with common parts.",
    courseExample: "Reflex Lab 01 uses an ESP32 DevKit or ESP32 ESP-32S breakout.",
    related: ["GPIO", "Arduino IDE", "Serial Monitor"],
    courseIds: ["001"]
  },
  {
    id: "firmware",
    term: "Firmware",
    category: "Tools",
    definition: "Code that runs directly on the microcontroller.",
    monogateContext: "Firmware adapts physical pins to the course kernel and trace format.",
    courseExample: "The Reflex firmware reads the pot and button, computes safe output, drives LED/buzzer, and emits serial frames.",
    related: ["ESP32", "Trace", "Dashboard"],
    courseIds: ["001"]
  },
  {
    id: "serial-monitor",
    term: "Serial Monitor",
    category: "Tools",
    definition: "A tool for reading text sent over USB serial from a microcontroller.",
    monogateContext: "It is the simplest path from a bench run to raw trace rows.",
    courseExample: "Course 001 documents 115200 baud as the expected serial monitor speed.",
    related: ["Live Capture", "Trace", "Arduino IDE"],
    courseIds: ["001"]
  },
  {
    id: "clamp",
    term: "Clamp",
    category: "Math",
    definition: "A math operation that restricts a value to a minimum and maximum range.",
    monogateContext: "Clamping makes guard behavior explicit and easy to compare.",
    courseExample: "safe_output is clamped so it never exceeds 0.85 in the Course 001 kernel.",
    related: ["Guard Clamp", "Safe Output", "Threshold"],
    courseIds: ["001"]
  },
  {
    id: "normalization",
    term: "Normalization",
    category: "Math",
    definition: "Converting values into a consistent range, often 0.0 to 1.0.",
    monogateContext: "Normalization lets traces compare behavior without depending on raw ADC counts.",
    courseExample: "pot_raw is normalized before it enters threshold_reflex_v0.",
    related: ["ADC", "Pot Raw", "Threshold"],
    courseIds: ["001"]
  },
  {
    id: "ohms-law",
    term: "Ohm's Law",
    category: "Math",
    definition: "The relationship between voltage, current, and resistance: V = I * R.",
    monogateContext: "It is the first calculation behind safe LED and resistor choices.",
    courseExample: "The LED resistor limits current when GPIO25 drives the output.",
    related: ["Resistor", "Voltage", "Current"],
    courseIds: ["001"]
  },
  {
    id: "threshold",
    term: "Threshold",
    category: "Math",
    definition: "A boundary value where behavior changes.",
    monogateContext: "Thresholds make simple decisions inspectable in traces.",
    courseExample: "The Course 001 kernel starts requesting output when pot_raw rises above 0.55.",
    related: ["Threshold Reflex v0", "Pot Raw", "Guard"],
    courseIds: ["001"]
  },
  {
    id: "button-mute",
    term: "Button Mute",
    category: "Course 001",
    definition: "The Lab 01B behavior where pressing the tactile button silences the buzzer.",
    monogateContext: "This teaches an operator-controlled digital input without adding high-current hardware.",
    courseExample: "GPIO27 reads the button. The firmware suppresses buzzer output while the button is pressed.",
    related: ["Button", "Buzzer", "GPIO27"],
    courseIds: ["001"]
  },
  {
    id: "gpio25",
    term: "GPIO25",
    category: "Course 001",
    definition: "The ESP32 output pin used for the guarded LED channel in Course 001.",
    monogateContext: "Naming the pin makes the circuit, firmware, simulator, and evidence packet line up.",
    courseExample: "GPIO25 drives the LED through a current-limiting resistor.",
    related: ["LED", "PWM", "Safe Output"],
    courseIds: ["001"]
  },
  {
    id: "gpio26",
    term: "GPIO26",
    category: "Course 001",
    definition: "The ESP32 output pin used for the passive piezo buzzer in Course 001.",
    monogateContext: "The buzzer output extends the same guarded decision into sound.",
    courseExample: "Lab 01B wires GPIO26 through 1 kOhm to the passive piezo buzzer.",
    related: ["Buzzer", "Button Mute", "Safe Output"],
    courseIds: ["001"]
  },
  {
    id: "gpio27",
    term: "GPIO27",
    category: "Course 001",
    definition: "The ESP32 input pin used for the tactile button in Course 001.",
    monogateContext: "The button gives the lab one clear digital input in addition to the analog pot.",
    courseExample: "The firmware configures GPIO27 with INPUT_PULLUP.",
    related: ["Button", "Pull-Up", "Button Mute"],
    courseIds: ["001"]
  },
  {
    id: "gpio34",
    term: "GPIO34",
    category: "Course 001",
    definition: "The ESP32 analog input pin used for the potentiometer wiper in Course 001.",
    monogateContext: "This is the first analog input in the public electronics path.",
    courseExample: "GPIO34 reads the pot wiper and feeds pot_raw.",
    related: ["ADC", "Pot Raw", "Potentiometer"],
    courseIds: ["001"]
  },
  {
    id: "jsonl",
    term: "JSONL",
    category: "Course 001",
    definition: "JSON Lines; a text format where each row is one JSON object.",
    monogateContext: "JSONL is easy to append, inspect, validate, and replay.",
    courseExample: "The Course 001 trace rows are emitted as JSONL frames.",
    related: ["Trace", "Replay", "Evidence Packet"],
    courseIds: ["001"]
  },
  {
    id: "pot-raw",
    term: "Pot Raw",
    category: "Course 001",
    definition: "The normalized potentiometer input value used by threshold_reflex_v0.",
    monogateContext: "It is the learner-facing input variable for the first control loop.",
    courseExample: "Turning the knob changes pot_raw from near 0.0 toward 1.0.",
    related: ["Potentiometer", "ADC", "Threshold"],
    courseIds: ["001"]
  },
  {
    id: "safe-output",
    term: "Safe Output",
    category: "Course 001",
    definition: "The guarded output value after limits and clamps have been applied.",
    monogateContext: "Reviewers compare requested output with safe output to see the guard boundary.",
    courseExample: "The LED brightness and buzzer intensity follow safe_output, not the unconstrained request.",
    related: ["Requested Output", "Guard Clamp", "PWM"],
    courseIds: ["001"]
  },
  {
    id: "threshold-reflex-v0",
    term: "Threshold Reflex v0",
    category: "Course 001",
    definition: "The first public Monogate Electronics kernel used by Reflex Lab 01.",
    monogateContext: "It is intentionally small so learners can inspect every decision frame.",
    courseExample: "The kernel maps pot_raw through a threshold, step limit, and safe output clamp.",
    related: ["Kernel", "Golden Trace", "Guard Clamp"],
    courseIds: ["001"]
  }
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getGlossaryTerm(termName: string): GlossaryTerm | undefined {
  const normalizedTermName = normalize(termName);
  return glossaryTerms.find((term) => normalize(term.term) === normalizedTermName);
}

function termMatches(term: GlossaryTerm, query: string) {
  if (!query) return true;
  const haystack = normalize(
    [
      term.term,
      term.category,
      term.definition,
      term.monogateContext,
      term.courseExample,
      term.related.join(" ")
    ].join(" ")
  );
  return haystack.includes(query);
}

export function ElectronicsGlossary({
  mode,
  onNavigate,
  onBack
}: {
  mode: "global" | "course001";
  onNavigate: (target: LandingTarget) => void;
  onBack: () => void;
}) {
  const isCourseMode = mode === "course001";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | GlossaryCategory>(isCourseMode ? "Course 001" : "All");
  const [expandedId, setExpandedId] = useState(isCourseMode ? "threshold-reflex-v0" : "evidence-packet");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const normalizedQuery = normalize(query);

  const availableTerms = useMemo(
    () => glossaryTerms.filter((term) => !isCourseMode || term.courseIds?.includes("001")),
    [isCourseMode]
  );

  const visibleTerms = useMemo(
    () =>
      availableTerms.filter((term) => {
        const categoryMatches = category === "All" || term.category === category;
        return categoryMatches && termMatches(term, normalizedQuery);
      }),
    [availableTerms, category, normalizedQuery]
  );

  const featuredTerms = isCourseMode
    ? ["Threshold Reflex v0", "Pot Raw", "Safe Output", "Button Mute"]
    : ["Evidence Packet", "Golden Trace", "Guard Clamp", "Hardware Observed"];
  const hoveredTerm = visibleTerms.find((term) => term.id === hoveredId) ?? null;

  function jumpToTerm(termName: string) {
    setQuery(termName);
    setCategory("All");
    const target = glossaryTerms.find((item) => item.term.toLowerCase() === termName.toLowerCase());
    if (target) {
      setExpandedId(target.id);
    }
  }

  return (
    <main className="landing-shell" aria-label={isCourseMode ? "Course 001 glossary" : "Monogate Electronics glossary"}>
      <section className="glossary-page">
        <button className="landing-back-button" type="button" onClick={onBack}>
          Back
        </button>

        <header className="glossary-hero">
          <div>
            <p>{isCourseMode ? "Course 001 terms" : "Parent glossary"}</p>
            <h1>{isCourseMode ? "Reflex Lab 01 Glossary" : "Electronics Glossary"}</h1>
            <span>
              {isCourseMode
                ? "Course-specific terms for the Reflex Guard build, dashboard, trace, and evidence packet."
                : "A living reference for Monogate Electronics terms across circuits, tools, kernels, traces, and evidence."}
            </span>
          </div>
          <div className="glossary-hero-actions">
            <button type="button" onClick={() => onNavigate(isCourseMode ? "glossary" : "courseGlossary")}>
              <BookOpen aria-hidden="true" />
              {isCourseMode ? "Global glossary" : "Course 001 glossary"}
            </button>
            <button type="button" onClick={() => onNavigate("course")}>
              <CircuitBoard aria-hidden="true" /> Reflex Course
            </button>
          </div>
        </header>

        <section className="glossary-feature-strip" aria-label="Featured glossary terms">
          {featuredTerms.map((termName) => (
            <button type="button" key={termName} onClick={() => jumpToTerm(termName)}>
              {termName}
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </section>

        <section className="glossary-controls" aria-label="Glossary search and filters">
          <label className="glossary-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search glossary</span>
            <input
              type="search"
              value={query}
              placeholder="Search terms, pins, tools, or evidence words"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="glossary-tabs" aria-label="Glossary categories">
            {categoryOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={category === option ? "is-active" : ""}
                onClick={() => setCategory(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <div className="glossary-layout">
          <aside className="glossary-summary" aria-label="Glossary scope">
            <section>
              <ShieldCheck aria-hidden="true" />
              <h2>Scope</h2>
              <p>
                The parent glossary defines shared words once. Course glossaries add the pin names, lab nicknames, and packet fields that only belong to that course.
              </p>
            </section>
            <section>
              <FileText aria-hidden="true" />
              <h2>Release Shape</h2>
              <p>
                Public learners can browse this route at /electronics/glossary. The exported repo also carries Markdown copies for offline ZIP use.
              </p>
            </section>
          </aside>

          <section className="glossary-results" aria-live="polite">
            <div className="glossary-results-header">
              <span>{visibleTerms.length} terms</span>
              <strong>{category === "All" ? "All categories" : category}</strong>
            </div>
            <div className="glossary-grid">
              {visibleTerms.map((term) => {
                const Icon = categoryIcons[term.category];
                const isExpanded = expandedId === term.id;
                return (
                  <article
                    className={`glossary-card${isExpanded ? " is-expanded" : ""}${hoveredId === term.id ? " is-hovered" : ""}`}
                    key={term.id}
                    onMouseEnter={() => setHoveredId(term.id)}
                    onMouseLeave={() => setHoveredId((current) => (current === term.id ? null : current))}
                    onFocus={() => setHoveredId(term.id)}
                    onBlur={() => setHoveredId((current) => (current === term.id ? null : current))}
                  >
                    <button type="button" onClick={() => setExpandedId(isExpanded ? "" : term.id)}>
                      <span>
                        <Icon aria-hidden="true" />
                        {term.category}
                      </span>
                      <strong>{term.term}</strong>
                      <em>{term.definition}</em>
                    </button>
                    {isExpanded ? (
                      <div className="glossary-card-details">
                        <p>
                          <b>Monogate context:</b> {term.monogateContext}
                        </p>
                        <p>
                          <b>Course example:</b> {term.courseExample}
                        </p>
                        <div className="glossary-related" aria-label={`Related terms for ${term.term}`}>
                          {term.related.map((related) => (
                            <button type="button" key={related} onClick={() => jumpToTerm(related)}>
                              {related}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {hoveredTerm ? (
          <aside
            className="glossary-hover-modal"
            aria-live="polite"
            onMouseEnter={() => setHoveredId(hoveredTerm.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span>{hoveredTerm.category}</span>
            <strong>{hoveredTerm.term}</strong>
            <p>{hoveredTerm.definition}</p>
            <p>
              <b>Monogate context:</b> {hoveredTerm.monogateContext}
            </p>
            <p>
              <b>Course example:</b> {hoveredTerm.courseExample}
            </p>
            <div className="glossary-related" aria-label={`Related terms for ${hoveredTerm.term}`}>
              {hoveredTerm.related.map((related) => (
                <button type="button" key={related} onClick={() => jumpToTerm(related)}>
                  {related}
                </button>
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
