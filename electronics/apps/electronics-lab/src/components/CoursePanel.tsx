import { CheckCircle2, ChevronRight, Eye, EyeOff, Lightbulb, Menu, Minimize2, Usb, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { WireId } from "../engine/labEngine";
import { publishLabEvent } from "../engine/liveEvents";
import { GlossaryHint } from "./GlossaryHint";
import type { TrainerPartId } from "./trainerPartCatalog";

export type CourseHighlightTarget =
  | "esp32-power"
  | "ground-rail"
  | "power-rail"
  | "potentiometer"
  | "resistor"
  | "ldr"
  | "dividerResistor"
  | "button"
  | "buzzer"
  | "led"
  | "usb";

export type SupplyPinMap = {
  positive: string | null;
  negative: string | null;
};

export type ComponentPinMap = Record<TrainerPartId, Record<string, string>>;
type BenchPanelId = "trainer" | "inventory" | "dashboard";
type BenchPanelState = "open" | "minimized" | "hidden";

export type CourseStep = {
  title: string;
  shortInstruction: string;
  goal: string;
  hint: string;
  highlight: CourseHighlightTarget;
  done: (state: CourseProgressState) => boolean;
};

export type CourseProgressState = {
  supplyPinMap: SupplyPinMap;
  componentPinMap: ComponentPinMap;
  placedPartIds: Set<TrainerPartId>;
  wireState: Partial<Record<WireId, boolean>>;
};

function hasPlacedPart(state: CourseProgressState, partId: TrainerPartId): boolean {
  return (
    state.placedPartIds.has(partId) ||
    Object.values(state.componentPinMap[partId]).every((label) => label !== "not placed")
  );
}

function hasSupply(state: CourseProgressState, kind: keyof SupplyPinMap): boolean {
  return Boolean(state.supplyPinMap[kind]);
}

export const trainerBoardV0Steps: CourseStep[] = [
  {
    title: "Start With Ground",
    shortInstruction: "Connect ESP32 GND (3V3 ground) to the power rail",
    goal: "Connect ESP32 GND to the rail you will use as the shared 3V3 ground.",
    hint: "Click the ESP32 GND pin, then place the jumper end in the highlighted target hole on the blue/- rail.",
    highlight: "ground-rail",
    done: (state) => hasSupply(state, "negative")
  },
  {
    title: "Add Safe 3V3",
    shortInstruction: "Connect 3V3 to a rail",
    goal: "Connect ESP32 3V3 to the rail you will use as power.",
    hint: "Click the ESP32 3V3 pin, then place the jumper end in the highlighted target hole on a red/+ rail that is not tied to ground.",
    highlight: "power-rail",
    done: (state) => hasSupply(state, "positive")
  },
  {
    title: "Place The Potentiometer",
    shortInstruction: "Place the potentiometer leads",
    goal: "Place the 10K potentiometer with GND outer, wiper, and 3V3 outer leads.",
    hint: "Select 10K potentiometer. Use the highlighted target hole as your next placement, then keep each leg in a separate row.",
    highlight: "potentiometer",
    done: (state) => hasPlacedPart(state, "potentiometer")
  },
  {
    title: "Place The Resistor",
    shortInstruction: "Place 330R in two rows",
    goal: "Place the 330 ohm resistor with each lead in a different breadboard row.",
    hint: "Select the resistor. Place one lead in the highlighted target hole, then place the other lead in a different empty row.",
    highlight: "resistor",
    done: (state) => hasPlacedPart(state, "resistor")
  },
  {
    title: "Place The LED",
    shortInstruction: "Place LED cathode and anode",
    goal: "Place the LED with anode toward the resistor and cathode toward ground.",
    hint: "Select LED. Put the long anode leg in the highlighted target row with the resistor path; the short cathode leg returns to ground.",
    highlight: "led",
    done: (state) => hasPlacedPart(state, "led")
  },
  {
    title: "USB Ready",
    shortInstruction: "Check board, then insert USB",
    goal: "Review the build. You are ready to plug in USB-C and open the dashboard stage.",
    hint: "In real hardware, this is where USB powers/programs the ESP32. In the sim, the dashboard and terminal will come next.",
    highlight: "usb",
    done: (state) =>
      hasSupply(state, "negative") &&
      hasSupply(state, "positive") &&
      hasPlacedPart(state, "potentiometer") &&
      hasPlacedPart(state, "resistor") &&
      hasPlacedPart(state, "led")
  }
];

function completedCount(state: CourseProgressState): number {
  return trainerBoardV0Steps.filter((step) => step.done(state)).length;
}

function firstOpenStep(state: CourseProgressState): number {
  const index = trainerBoardV0Steps.findIndex((step) => !step.done(state));
  return index === -1 ? trainerBoardV0Steps.length - 1 : index;
}

const glossaryTermsByHighlight: Record<CourseHighlightTarget, string[]> = {
  "esp32-power": ["ESP32", "3V3 Rail", "Ground"],
  "ground-rail": ["Ground Rail", "Ground", "Jumper Wire"],
  "power-rail": ["3V3 Rail", "Voltage", "Jumper Wire"],
  potentiometer: ["Potentiometer", "Voltage Divider", "Pot Raw"],
  resistor: ["Resistor", "Ohm's Law", "Current"],
  ldr: ["Voltage Divider", "ADC", "Schema"],
  dividerResistor: ["Resistor", "Voltage Divider", "ADC"],
  button: ["Button", "Pull-Up", "Button Mute"],
  buzzer: ["Buzzer", "GPIO26", "Button Mute"],
  led: ["LED", "PWM", "Safe Output"],
  usb: ["Dashboard", "Trace", "Evidence Packet"]
};

export function CoursePanel({
  placedPartIds,
  supplyPinMap,
  componentPinMap,
  wireState = {},
  selectedStep,
  open,
  steps = trainerBoardV0Steps,
  headerKicker = "Courses",
  headerTitle = "Reflex Lab Series",
  activeCardLabel = "Lab 01",
  activeCardTitle = "Pot to Guarded Output",
  upcomingCard,
  futureCards = [],
  previewKernel = "threshold_reflex_v0",
  previewTitle = "Reflex Lab 01: Pot to Guarded Output",
  usbNote = "Dashboard and simulated terminal attach after the USB-ready step.",
  onOpenChange,
  onInstructionChange,
  onStepChange,
  onStepCheck,
  onHighlightChange,
  panelStates,
  onPanelStateChange
}: {
  placedPartIds: Set<TrainerPartId>;
  supplyPinMap: SupplyPinMap;
  componentPinMap: ComponentPinMap;
  wireState?: Partial<Record<WireId, boolean>>;
  selectedStep: number;
  open: boolean;
  steps?: CourseStep[];
  headerKicker?: string;
  headerTitle?: string;
  activeCardLabel?: string;
  activeCardTitle?: string;
  upcomingCard?: { label: string; title: string; detail: string; ariaLabel?: string } | null;
  futureCards?: { label: string; title: string; detail: string }[];
  previewKernel?: string;
  previewTitle?: string;
  usbNote?: string;
  onOpenChange: (open: boolean) => void;
  onInstructionChange: (instruction: string) => void;
  onStepChange: (step: number) => void;
  onStepCheck: (step: { index: number; title: string; highlight: CourseHighlightTarget; complete: boolean }) => void;
  onHighlightChange: (target: CourseHighlightTarget | null) => void;
  panelStates: Record<BenchPanelId, BenchPanelState>;
  onPanelStateChange: (panel: BenchPanelId, state: BenchPanelState) => void;
}) {
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);
  const progressState = { placedPartIds, supplyPinMap, componentPinMap, wireState };
  const doneCount = steps.filter((step) => step.done(progressState)).length;
  const activeIndex = Math.min(selectedStep, steps.length - 1);
  const activeStep = steps[activeIndex];
  const activeDone = activeStep.done(progressState);
  const firstIncomplete = steps.findIndex((step) => !step.done(progressState));
  const suggestedIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
  const activeGlossaryTerms = glossaryTermsByHighlight[activeStep.highlight] ?? [];

  useEffect(() => {
    if (!open) setCourseDetailsOpen(false);
  }, [open]);

  useEffect(() => {
    onInstructionChange(activeStep.shortInstruction);
  }, [activeStep.shortInstruction, onInstructionChange]);

  useEffect(() => {
    if (activeDone && suggestedIndex !== activeIndex) {
      onStepChange(suggestedIndex);
    }
  }, [activeDone, activeIndex, onStepChange, suggestedIndex]);

  function showHint() {
    publishLabEvent("course_hint", {
      step: activeStep.title,
      target: activeStep.highlight,
      hint: activeStep.hint
    });
    onHighlightChange(activeStep.highlight);
    window.setTimeout(() => onHighlightChange(null), 3600);
  }

  return (
    <>
      <button
        type="button"
        className="course-menu-button"
        aria-label="Open course menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <aside className={open ? "course-panel is-open" : "course-panel"} aria-label="Course menu">
        <div className="course-panel-header">
          <p>{headerKicker}</p>
          <h2>{headerTitle}</h2>
          <span>
            {doneCount}/{steps.length} complete
          </span>
        </div>

        <button
          type="button"
          className={courseDetailsOpen ? "course-card is-active is-expanded" : "course-card is-active"}
          aria-expanded={courseDetailsOpen}
          onClick={() => {
            onOpenChange(true);
            setCourseDetailsOpen(true);
            onStepChange(suggestedIndex);
          }}
        >
          <span>{activeCardLabel}</span>
          <strong>{activeCardTitle}</strong>
          <ChevronRight aria-hidden="true" />
        </button>

        {upcomingCard === null ? null : (
          <button
            type="button"
            className="course-card course-card-upcoming"
            aria-label={upcomingCard?.ariaLabel ?? `Open ${upcomingCard?.label ?? "Lab 01.a"} live dashboard`}
            onClick={() => onPanelStateChange("dashboard", "open")}
          >
            <span>{upcomingCard?.label ?? "Lab 01.a"}</span>
            <strong>{upcomingCard?.title ?? "Live Dashboard Checkpoint"}</strong>
            <small>{upcomingCard?.detail ?? "Validate the board, inspect the dashboard, then continue the course."}</small>
          </button>
        )}

        {futureCards.length > 0 ? (
          <section className="course-next-builds" aria-label="Upcoming course builds">
            <span>Next Builds</span>
            {futureCards.map((card) => (
              <article key={`${card.label}-${card.title}`}>
                <div>
                  <small>{card.label}</small>
                  <strong>{card.title}</strong>
                </div>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>
        ) : null}

        {courseDetailsOpen ? (
          <div className="course-details">
            <section className="course-active-step" aria-live="polite">
              <div className="course-step-kicker">
                <span>Goal</span>
                {activeDone ? <CheckCircle2 aria-hidden="true" /> : null}
              </div>
              <h3>{activeStep.title}</h3>
              <p>{activeStep.goal}</p>
              <div className="course-glossary-strip" aria-label="Key terms for this course step">
                {activeGlossaryTerms.map((term) => (
                  <GlossaryHint key={term} term={term} compact />
                ))}
              </div>
              <div className="course-actions">
                <button type="button" onClick={showHint}>
                  <Lightbulb aria-hidden="true" /> Hint
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onStepCheck({
                      index: activeIndex,
                      title: activeStep.title,
                      highlight: activeStep.highlight,
                      complete: activeDone
                    })
                  }
                >
                  Check step
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(Math.min(activeIndex + 1, steps.length - 1))}
                  disabled={activeIndex === steps.length - 1}
                >
                  Next
                </button>
              </div>
              <p className="course-hint">{activeStep.hint}</p>
            </section>

            <ol className="course-step-list">
              {steps.map((step, index) => {
                const done = step.done(progressState);
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      aria-label={`Course step: ${step.title}`}
                      className={`${index === activeIndex ? "is-current" : ""}${done ? " is-done" : ""}`}
                      onClick={() => onStepChange(index)}
                    >
                      <span>{index + 1}</span>
                      <strong>{step.title}</strong>
                      {done ? <CheckCircle2 aria-hidden="true" /> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <section className="course-preview" aria-label="Selected course summary">
            <span>{previewKernel}</span>
            <strong>{previewTitle}</strong>
            <p>{doneCount} of {steps.length} build checks complete</p>
          </section>
        )}

        <details className="course-panel-options" aria-label="Bench panel visibility">
          <summary>
            <span>Bench Panels</span>
            <strong>show, minimize, or hide</strong>
          </summary>
          {([
            ["trainer", "Bench Controls"],
            ["inventory", "Inventory"],
            ["dashboard", "Dashboard"]
          ] as const).map(([panel, label]) => (
            <div className="course-panel-option" key={panel}>
              <span>{label}</span>
              <button
                type="button"
                aria-label={`${panelStates[panel] === "open" ? "Hide" : "Show"} ${label}`}
                onClick={() => onPanelStateChange(panel, panelStates[panel] === "open" ? "hidden" : "open")}
              >
                {panelStates[panel] === "open" ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
              <button
                type="button"
                aria-label={`Minimize ${label}`}
                onClick={() => onPanelStateChange(panel, "minimized")}
                disabled={panelStates[panel] === "minimized"}
              >
                <Minimize2 aria-hidden="true" />
              </button>
            </div>
          ))}
        </details>

        <div className="course-usb-note">
          <Usb aria-hidden="true" />
          <span>{usbNote}</span>
        </div>
      </aside>
    </>
  );
}
