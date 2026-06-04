import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clipboard, ListChecks, Minimize2, RefreshCw, Share2, Smartphone, Undo2, Upload, Volume2, VolumeX, X } from "lucide-react";
import {
  CoursePanel,
  type CourseProgressState,
  type ComponentPinMap,
  type CourseHighlightTarget,
  type SupplyPinMap
} from "./CoursePanel";
import {
  DashboardPanel,
  type DashboardCheckpointState,
  type DashboardCockpitMode,
  type DashboardCockpitPhase,
  type DashboardCockpitTab,
  type DashboardGhostPoint
} from "./DashboardPanel";
import { InventoryPanel } from "./InventoryPanel";
import { LabScene, type CourseTraceMode } from "./LabScene";
import { SchematicPanel } from "./SchematicPanel";
import {
  partLabelFor,
  partLeadLabelFor,
  trainerPartLeads,
  type TrainerPartLabelConfig,
  type TrainerPartId
} from "./trainerPartCatalog";
import type { SimulatorCourseConfig } from "./simulatorCourses";
import { publishLabEvent } from "../engine/liveEvents";
import {
  analyzeLab,
  analogDecisionParams,
  canRunTrace,
  runThresholdReflex,
  type AnalogDecisionResult,
  type FaultReport,
  type FaultId,
  type TraceFrame,
  type WireId
} from "../engine/labEngine";
import {
  boundaryDimensions,
  modeLabel,
  runOptimizationBoundary,
  type BoundaryMode
} from "../engine/optimizationBoundary";
import { useLabStore, type TerminalLine } from "../store";

type BenchPanelId = "trainer" | "inventory" | "dashboard";
type BenchPanelState = "open" | "minimized" | "hidden";
type SoundLevel = "low" | "medium" | "high";
type PanelSide = "left" | "right";
type ManagedPanelLayout = {
  side: PanelSide;
  y: number;
  width: number;
  height: number;
};
type VisualBenchState = {
  leadConnections?: Partial<Record<"positive" | "negative", string | null>>;
  componentConnections?: Record<string, string>;
  jumperConnections?: { from: string; to: string; color: string }[];
};
type PersistedBenchState = {
  version: 1;
  courseId: string;
  savedAt: string;
  potValue: number;
  sourceLedBrightness?: number;
  ldrValue?: number;
  ldrCoverAmount?: number;
  environmentSensorStale?: boolean;
  courseStep: number;
  boardCheckState: "idle" | "checking" | "passed" | "blocked";
  boardCheckMessage: string;
  panelStates: Record<BenchPanelId, BenchPanelState>;
  usbInserted: boolean;
  firmwareUploaded?: boolean;
  buzzerUnlocked?: boolean;
  boundaryMode?: BoundaryMode;
  releaseChecklistDone?: Record<string, boolean>;
  cockpitPhase?: DashboardCockpitPhase;
  cockpitMode?: DashboardCockpitMode;
  cockpitTab?: DashboardCockpitTab;
  ghostTrace?: DashboardGhostPoint[];
  checkpoint?: DashboardCheckpointState;
  visual: VisualBenchState;
};

const BASE_REFLEX_STEP_COUNT = 12;
const PANEL_GAP = 18;
const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH = 460;
const PANEL_MIN_HEIGHT = 150;
const LIVE_DASHBOARD_MIN_WIDTH = 320;
const LIVE_DASHBOARD_MIN_HEIGHT = 508;
const TRAINER_PANEL_MIN_HEIGHT = 292;
const soundLevelGain: Record<SoundLevel, number> = {
  low: 0.72,
  medium: 1.32,
  high: 1.8
};

function defaultManagedPanelLayouts(): Record<BenchPanelId, ManagedPanelLayout> {
  return {
    dashboard: { side: "left", y: 96, width: LIVE_DASHBOARD_MIN_WIDTH, height: LIVE_DASHBOARD_MIN_HEIGHT },
    inventory: { side: "right", y: 96, width: 360, height: 322 },
    trainer: { side: "right", y: 436, width: 360, height: TRAINER_PANEL_MIN_HEIGHT }
  };
}

function panelLayoutStorageKey(courseId: string): string {
  return `electronics-lab:${courseId}:panel-layout:v2`;
}

function viewportSize() {
  if (typeof window === "undefined") return { width: 1440, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function clampPanelLayout(layout: ManagedPanelLayout): ManagedPanelLayout {
  const viewport = viewportSize();
  const maxWidth = Math.min(PANEL_MAX_WIDTH, viewport.width - PANEL_GAP * 2);
  const maxHeight = Math.max(PANEL_MIN_HEIGHT, viewport.height - PANEL_GAP * 2);
  const minHeight = layout.height >= TRAINER_PANEL_MIN_HEIGHT ? TRAINER_PANEL_MIN_HEIGHT : PANEL_MIN_HEIGHT;
  const width = Math.max(PANEL_MIN_WIDTH, Math.min(maxWidth, layout.width));
  const height = Math.max(minHeight, Math.min(maxHeight, layout.height));
  return {
    ...layout,
    width,
    height,
    y: Math.max(PANEL_GAP, Math.min(viewport.height - height - PANEL_GAP, layout.y))
  };
}

function resolvePanelOverlap(layouts: Record<BenchPanelId, ManagedPanelLayout>): Record<BenchPanelId, ManagedPanelLayout> {
  const viewport = viewportSize();
  const next = Object.fromEntries(
    (Object.entries(layouts) as [BenchPanelId, ManagedPanelLayout][]).map(([panel, layout]) => [panel, clampPanelLayout(layout)])
  ) as Record<BenchPanelId, ManagedPanelLayout>;

  (["left", "right"] as const).forEach((side) => {
    const panels = (Object.entries(next) as [BenchPanelId, ManagedPanelLayout][])
      .filter(([, layout]) => layout.side === side)
      .sort((a, b) => a[1].y - b[1].y);
    let cursor = PANEL_GAP;
    panels.forEach(([panel, layout]) => {
      if (layout.y < cursor) {
        next[panel] = { ...layout, y: cursor };
      }
      cursor = next[panel].y + next[panel].height + PANEL_GAP;
    });

    const overflow = cursor - PANEL_GAP - (viewport.height - PANEL_GAP);
    if (overflow > 0) {
      panels.forEach(([panel]) => {
        next[panel] = { ...next[panel], y: Math.max(PANEL_GAP, next[panel].y - overflow) };
      });
    }
  });

  return next;
}

function loadManagedPanelLayouts(courseId: string): Record<BenchPanelId, ManagedPanelLayout> {
  const defaults = defaultManagedPanelLayouts();
  if (typeof window === "undefined") return defaults;
  try {
    const saved = window.localStorage.getItem(panelLayoutStorageKey(courseId));
    if (!saved) return defaults;
    const parsed = JSON.parse(saved) as Partial<Record<BenchPanelId, Partial<ManagedPanelLayout>>>;
    return resolvePanelOverlap({
      dashboard: { ...defaults.dashboard, ...parsed.dashboard },
      inventory: { ...defaults.inventory, ...parsed.inventory },
      trainer: { ...defaults.trainer, ...parsed.trainer, height: Math.max(TRAINER_PANEL_MIN_HEIGHT, parsed.trainer?.height ?? defaults.trainer.height) }
    });
  } catch {
    return defaults;
  }
}

function isCompactViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
}

function defaultPanelStates(config: SimulatorCourseConfig): Record<BenchPanelId, BenchPanelState> {
  const compact = isCompactViewport();
  return {
    trainer: "open",
    inventory: "open",
    dashboard: compact ? "minimized" : "open"
  };
}

function emptyComponentPinMap(): ComponentPinMap {
  return Object.fromEntries(
    (Object.keys(trainerPartLeads) as TrainerPartId[]).map((partId) => [
      partId,
      Object.fromEntries(trainerPartLeads[partId].map((lead) => [lead.id, "not placed"]))
    ])
  ) as ComponentPinMap;
}

function append(lines: TerminalLine[], line: TerminalLine): TerminalLine[] {
  return [...lines, line].slice(-90);
}

function faultMessage(report: FaultReport): string {
  return `${report.title}. ${report.recovery}`;
}

function storageKeyForCourse(courseId: string): string {
  return `monogate-electronics:simulator-progress:${courseId}`;
}

function safeParseBenchState(raw: string | null): PersistedBenchState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedBenchState>;
    if (parsed.version !== 1 || typeof parsed.courseId !== "string" || !parsed.visual) return null;
    return parsed as PersistedBenchState;
  } catch {
    return null;
  }
}

function importVisualStateWhenReady(visual: VisualBenchState, attempts = 12) {
  if (window.__mgeLab?.importState) {
    window.__mgeLab.importState(visual);
    return;
  }
  if (attempts <= 0) return;
  window.setTimeout(() => importVisualStateWhenReady(visual, attempts - 1), 80);
}

function dimensionFromPot(potRaw: number) {
  const index = Math.min(boundaryDimensions.length - 1, Math.max(0, Math.round(potRaw * (boundaryDimensions.length - 1))));
  return boundaryDimensions[index];
}

function traceModeForStep(index: number): CourseTraceMode {
  if (index === 0) return "ground";
  if (index === 1) return "rails";
  if (index >= 2 && index <= 5) return "pot";
  if (index >= 6 && index <= 10) return "led";
  return "full";
}

function defaultCheckpointState(): DashboardCheckpointState {
  return {
    snapshotSaved: false,
    usbDisconnected: false,
    returnedToSchematic: false,
    lab01bUnlocked: false
  };
}

function ghostTraceFromFrames(frames: TraceFrame[]): DashboardGhostPoint[] {
  return frames.map((frame) => ({
    potRaw: frame.pot_raw,
    requestedOutput: frame.outputs.requested_output,
    safeOutput: frame.outputs.safe_output,
    ledOutput: frame.outputs.led,
    buzzerOutput: frame.outputs.buzzer,
    clampActive: frame.guard.guard_action === "clamp_to_safe_output"
  }));
}

function runLiveReflexPreview(potRaw: number) {
  const threshold = 0.55;
  const width = 0.1;
  const safeOutputLimit = 0.85;
  const boundedPot = Math.max(0, Math.min(1, potRaw));
  const centered = (boundedPot - threshold) / width;
  const target = Math.max(0, Math.min(1, centered + 0.5));
  const requestedOutput = target;
  const safeOutput = Math.min(requestedOutput, safeOutputLimit);
  const safetyMargin = Math.max(0, Math.min(safeOutputLimit, safeOutputLimit - safeOutput));

  return {
    centered,
    target,
    requestedOutput,
    safeOutput,
    safetyMargin,
    guardAction: requestedOutput > safeOutputLimit ? "clamp_to_safe_output" : "pass_through"
  };
}

function runCourseAnalogDecision(lightRaw: number, thresholdRaw: number, previousDecisionOn: boolean): AnalogDecisionResult & {
  offThreshold: number;
  onThreshold: number;
} {
  const normalizedInput = Math.max(0, Math.min(1, lightRaw));
  const threshold = Math.max(0.08, Math.min(0.92, thresholdRaw));
  const onThreshold = Math.max(0.1, Math.min(0.98, threshold + 0.04));
  const offThreshold = Math.max(0.02, Math.min(0.9, threshold - 0.04));
  const thresholdState =
    normalizedInput >= onThreshold ? "above_on" : normalizedInput <= offThreshold ? "below_off" : "deadband";
  const decisionOn = thresholdState === "above_on" ? true : thresholdState === "below_off" ? false : previousDecisionOn;
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
    thresholdState,
    offThreshold,
    onThreshold
  };
}

function placementInstructionForPart(
  activePart: TrainerPartId | null,
  componentPinMap: ComponentPinMap,
  partLabels?: TrainerPartLabelConfig
): string | null {
  if (!activePart) return null;

  const partLabel = partLabelFor(activePart, partLabels);
  const nextLead = trainerPartLeads[activePart].find((lead) => componentPinMap[activePart][lead.id] === "not placed");
  if (!nextLead) {
    if (activePart === "potentiometer") return `${partLabel} seated. Next wire its outer legs to the rails and wiper to GPIO34.`;
    if (activePart === "led") return `${partLabel} seated. Next wire the anode through 330R and cathode to ground.`;
    if (activePart === "resistor") return `${partLabel} seated. Next wire GPIO25 to one side and the other side to LED anode.`;
    if (activePart === "ldr") return `${partLabel} seated. Next wire one side to 3V3 and the sense side to GPIO35.`;
    if (activePart === "dividerResistor") return `${partLabel} seated. Next join one side to the GPIO35 sense row and the other side to GND.`;
    if (activePart === "button") return `${partLabel} seated. Next add one jumper from D27 BUTTON to the GPIO-side row, then one jumper from the other row to GND.`;
    if (activePart === "buzzerResistor") return `${partLabel} seated. Next wire GPIO26/D26 to one side and buzzer + to the other.`;
    if (activePart === "buzzer") return `${partLabel} seated. Next wire buzzer + through 1K and buzzer - to ground.`;
    return `${partLabel} seated.`;
  }

  const leadLabel = partLeadLabelFor(activePart, nextLead.id, partLabels);
  if (activePart === "potentiometer") {
    if (nextLead.id === "gnd") return "Click an empty breadboard hole for the first outer pot leg. This side will go to GND.";
    if (nextLead.id === "wiper") return "Click a nearby empty hole for the middle pot leg. This is the signal that goes to GPIO34.";
    return "Click a third empty hole for the other outer pot leg. This side will go to 3V3.";
  }
  if (activePart === "resistor") {
    if (nextLead.id === "left") return "Click an empty row for the first 330 ohm resistor lead. This row will connect to GPIO25.";
    return "Click a different empty row for the second resistor lead. This row will connect to the LED long leg.";
  }
  if (activePart === "ldr") {
    if (nextLead.id === "vcc") return "Click an empty row for the LDR 3V3 side.";
    return "Click a different row for the LDR sense side. This row will go to GPIO35 and the 10K divider.";
  }
  if (activePart === "dividerResistor") {
    if (nextLead.id === "sense") return "Click the same row as the LDR sense side, or a row you will jumper to GPIO35.";
    return "Click a different row for the 10K return side. This row will go to GND.";
  }
  if (activePart === "led") {
    if (nextLead.id === "anode") {
      return "Put the LED long leg in the same row as the free end of the 330 ohm resistor.";
    }
    return "Put the LED short leg in a different empty row. This row will go to GND.";
  }
  if (activePart === "button") {
    if (nextLead.id === "gpio") return "Click an empty row for the first button leg. Remember this row: it gets the D27 BUTTON jumper.";
    return "Click a different empty row for the second button leg. This row gets the GND jumper.";
  }
  if (activePart === "buzzerResistor") {
    if (nextLead.id === "gpio") return "Click an empty row for the first 1K resistor lead. This row will connect to GPIO26.";
    return "Click a different empty row for the second 1K resistor lead. This row will connect to buzzer plus.";
  }
  if (activePart === "buzzer") {
    if (nextLead.id === "positive") return "Click an empty row for the buzzer plus lead.";
    return "Click a different empty row for the buzzer minus lead. This side will go to GND.";
  }
  return `Place ${partLabel} ${leadLabel}`;
}

function boundaryHello(config: SimulatorCourseConfig): TerminalLine[] {
  return [
    { kind: "info", text: `${config.coursePanel.previewTitle} remote simulator` },
    {
      kind: "info",
      text:
        "source=optimization_boundary_software_proxy simulated=true hardware_observed=false live_serial_capture_performed=false firmware_written=false"
    },
    { kind: "info", text: "commands: help, status, validate, run, replay, trace, raw, guarded, log, rescue, reset" }
  ];
}

function LiveChecklistDrawer({
  open,
  progressState,
  releaseChecks = [],
  releaseChecklistDone,
  selectedStep,
  title,
  steps,
  onClose,
  onResync,
  onStepChange,
  onToggleReleaseCheck
}: {
  open: boolean;
  progressState: CourseProgressState;
  releaseChecks?: NonNullable<SimulatorCourseConfig["coursePanel"]["releaseChecks"]>;
  releaseChecklistDone: Record<string, boolean>;
  selectedStep: number;
  title: string;
  steps: SimulatorCourseConfig["coursePanel"]["steps"];
  onClose: () => void;
  onResync: () => void;
  onStepChange: (step: number) => void;
  onToggleReleaseCheck: (id: string) => void;
}) {
  if (!open) return null;
  const doneCount = steps.filter((step) => step.done(progressState)).length;
  const releaseDoneCount = releaseChecks.filter((check) => releaseChecklistDone[check.id]).length;

  return (
    <aside className="live-checklist-drawer" aria-label="Live build checklist">
      <div className="live-checklist-header">
        <div>
          <span>
            {doneCount}/{steps.length} live
            {releaseChecks.length ? ` | ${releaseDoneCount}/${releaseChecks.length} release` : ""}
          </span>
          <strong>{title}</strong>
        </div>
        <div className="live-checklist-header-actions">
          <button type="button" aria-label="Re-sync checklist progress" title="Re-sync checklist progress" onClick={onResync}>
            <RefreshCw aria-hidden="true" />
          </button>
          <button type="button" aria-label="Close live checklist" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
      <ol>
        {steps.map((step, index) => {
          const done = step.done(progressState);
          return (
            <li key={step.title}>
              <button
                type="button"
                className={`${done ? "is-done" : ""}${index === selectedStep ? " is-current" : ""}`}
                onClick={() => onStepChange(index)}
              >
                <span>{index + 1}</span>
                <span>
                  <strong>{step.shortInstruction}</strong>
                  <em>{step.goal}</em>
                </span>
                {done ? <CheckCircle2 aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {releaseChecks.length ? (
        <section className="release-checklist-section" aria-label="Evidence readiness guide">
          <div className="release-checklist-heading">
            <span>evidence guide</span>
            <strong>{releaseDoneCount === releaseChecks.length ? "Ready for final review" : "Suggested before sharing"}</strong>
          </div>
          <ul>
            {releaseChecks.map((check) => {
              const done = Boolean(releaseChecklistDone[check.id]);
              return (
                <li key={check.id}>
                  <label className={done ? "is-done" : ""}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleReleaseCheck(check.id)}
                    />
                    <span>
                      <strong>{check.title}</strong>
                      <em>{check.detail}</em>
                      <small>{check.owner === "both" ? "builder + agent" : check.owner}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function analogHello(config: SimulatorCourseConfig): TerminalLine[] {
  return [
    { kind: "info", text: `${config.coursePanel.previewTitle} local simulator` },
    {
      kind: "info",
      text:
        "source=analog_decision_sim simulated=true hardware_observed=false live_serial_capture_performed=false firmware_written=false"
    },
    { kind: "info", text: "commands: help, status, validate, run, replay, reset" }
  ];
}

function environmentHello(config: SimulatorCourseConfig): TerminalLine[] {
  return [
    { kind: "info", text: `${config.coursePanel.previewTitle} local simulator` },
    {
      kind: "info",
      text:
        "source=environment_guard_proxy simulated=true hardware_observed=false live_serial_capture_performed=false firmware_written=false bme280_observed=false oled_observed=false"
    },
    { kind: "info", text: "commands: help, status, validate, run, replay, stale, fresh, reset" }
  ];
}

function PinSetupModal({
  open,
  courseId,
  buzzerUnlocked,
  buzzerReady,
  canUpload,
  firmwareUploaded,
  onClose,
  onUpload
}: {
  open: boolean;
  courseId: string;
  buzzerUnlocked: boolean;
  buzzerReady: boolean;
  canUpload: boolean;
  firmwareUploaded: boolean;
  onClose: () => void;
  onUpload: () => void;
}) {
  if (!open) return null;

  const kernelName =
    courseId === "optimization-boundary"
      ? "boundary_demo_proxy"
      : courseId === "analog-decision"
        ? "analog_decision_v0"
        : courseId === "environment-guard"
          ? "environment_guard_v0"
          : "threshold_reflex_v0";
  const showBuzzerPins = courseId !== "optimization-boundary" && (courseId === "analog-decision" || courseId === "environment-guard" || buzzerUnlocked || buzzerReady);
  const behaviorLines =
    courseId === "optimization-boundary"
      ? ["read GPIO34 ADC", "map knob to dimension bucket", "run software boundary proxy", "write boundary stress to GPIO25 LED"]
      : courseId === "analog-decision"
        ? [
            "read GPIO34 ADC",
            "read GPIO35 LDR divider",
            "compare LED command to LDR response",
            "apply threshold + deadband",
            "write GPIO25 LED header",
            "write GPIO26 response-error buzzer",
            "read GPIO27 mute button"
          ]
        : courseId === "environment-guard"
          ? [
              "read GPIO34 humidity proxy",
              "classify environment state",
              "render simulated OLED text",
              "fail visible when sensor is stale",
              "write GPIO25 state LED",
              "write GPIO26 alert buzzer",
              "read GPIO27 mute button"
            ]
      : [
          "read GPIO34 ADC",
          "normalize pot 0.0-1.0",
          "clamp safe output <= 0.85",
          "write GPIO25 PWM duty",
          ...(showBuzzerPins ? ["read GPIO27 button input"] : []),
          ...(showBuzzerPins ? ["write GPIO26 buzzer tone through 1K"] : [])
        ];

  return (
    <section className="pin-setup-modal" aria-label="ESP32 pin setup">
      <div className="pin-setup-header">
        <span>USB inserted</span>
        <button type="button" aria-label="Close ESP32 pin setup" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <h2>ESP32 Pin Setup</h2>
      <div className="pin-setup-led">
        <i aria-hidden="true" />
        <span>ESP32 power LED is on. Now bind the firmware to the pins you wired.</span>
      </div>
      <dl className="pin-map-grid">
        <div>
          <dt>Pot input</dt>
          <dd>GPIO34 ADC</dd>
        </div>
        <div>
          <dt>LED output</dt>
          <dd>GPIO25 PWM</dd>
        </div>
        {courseId === "analog-decision" ? (
          <div>
            <dt>LDR input</dt>
            <dd>GPIO35 ADC</dd>
          </div>
        ) : null}
        {courseId === "environment-guard" ? (
          <div>
            <dt>I2C physical upgrade</dt>
            <dd>GPIO21 SDA / GPIO22 SCL</dd>
          </div>
        ) : null}
        {showBuzzerPins ? (
          <div>
            <dt>Button input</dt>
            <dd>GPIO27 to GND</dd>
          </div>
        ) : null}
        {showBuzzerPins ? (
          <div>
            <dt>Buzzer output</dt>
            <dd>GPIO26 tone via 1K</dd>
          </div>
        ) : null}
        <div>
          <dt>Power</dt>
          <dd>3V3 rail</dd>
        </div>
        <div>
          <dt>Return</dt>
          <dd>GND rail</dd>
        </div>
      </dl>
      <div className="pin-kernel-card">
        <strong>{kernelName}</strong>
        {behaviorLines.map((line) => (
          <code key={line}>{line}</code>
        ))}
      </div>
      <div className="pin-setup-actions">
        <button type="button" onClick={onUpload} disabled={!canUpload || firmwareUploaded}>
          {firmwareUploaded ? "Firmware live" : "Upload simulated firmware"}
        </button>
        <button type="button" onClick={onClose}>
          Later
        </button>
      </div>
    </section>
  );
}

export function SimulatorBench({
  config,
  onBack
}: {
  config: SimulatorCourseConfig;
  onBack: () => void;
}) {
  const [jumperColor, setJumperColor] = useState("#ffd45f");
  const [jumperToolActive, setJumperToolActive] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const [activePart, setActivePart] = useState<TrainerPartId | null>(null);
  const [activePinMap, setActivePinMap] = useState<Record<string, string>>({});
  const [componentPinMap, setComponentPinMap] = useState<ComponentPinMap>(() => emptyComponentPinMap());
  const [supplyPinMap, setSupplyPinMap] = useState<SupplyPinMap>({ positive: null, negative: null });
  const [placedPartIds, setPlacedPartIds] = useState<Set<TrainerPartId>>(() => new Set());
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseStep, setCourseStep] = useState(0);
  const initialInstruction = config.coursePanel.steps[0]?.shortInstruction ?? config.defaultBoardMessage;
  const [courseInstruction, setCourseInstruction] = useState(initialInstruction);
  const [courseHighlight, setCourseHighlight] = useState<CourseHighlightTarget | null>(null);
  const courseHighlightTimerRef = useRef<number | null>(null);
  const [panelStates, setPanelStates] = useState<Record<BenchPanelId, BenchPanelState>>(() => defaultPanelStates(config));
  const [panelLayouts, setPanelLayouts] = useState<Record<BenchPanelId, ManagedPanelLayout>>(() => loadManagedPanelLayouts(config.id));
  const [boardCheckState, setBoardCheckState] = useState<"idle" | "checking" | "passed" | "blocked">("idle");
  const [boardCheckMessage, setBoardCheckMessage] = useState(initialInstruction);
  const [checkAnimationActive, setCheckAnimationActive] = useState(false);
  const [traceMode, setTraceMode] = useState<CourseTraceMode>("idle");
  const [usbInserted, setUsbInserted] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [firmwareUploaded, setFirmwareUploaded] = useState(false);
  const [buzzerUnlocked, setBuzzerUnlocked] = useState(false);
  const [lab01BReadyToStart, setLab01BReadyToStart] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [effectivePotValue, setEffectivePotValue] = useState(0.55);
  const [ldrCoverAmount, setLdrCoverAmount] = useState(0);
  const [environmentSensorStale, setEnvironmentSensorStale] = useState(false);
  const [boundaryMode, setBoundaryMode] = useState<BoundaryMode>("guarded");
  const [boundarySeed, setBoundarySeed] = useState(1701);
  const [boundaryFrames, setBoundaryFrames] = useState<ReturnType<typeof runOptimizationBoundary>["frames"]>([]);
  const [boundaryTerminal, setBoundaryTerminal] = useState<TerminalLine[]>(() => boundaryHello(config));
  const [analogTerminal, setAnalogTerminal] = useState<TerminalLine[]>(() => analogHello(config));
  const [environmentTerminal, setEnvironmentTerminal] = useState<TerminalLine[]>(() => environmentHello(config));
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const [benchMode, setBenchMode] = useState(false);
  const [mobileSheetPanel, setMobileSheetPanel] = useState<BenchPanelId | null>(null);
  const [compactViewport, setCompactViewport] = useState(() => isCompactViewport());
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [releaseChecklistDone, setReleaseChecklistDone] = useState<Record<string, boolean>>({});
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [schematicOpen, setSchematicOpen] = useState(false);
  const [cockpitPhase, setCockpitPhase] = useState<DashboardCockpitPhase>("bench_idle");
  const [cockpitMode, setCockpitMode] = useState<DashboardCockpitMode>("guided");
  const [cockpitTab, setCockpitTab] = useState<DashboardCockpitTab>("schematic");
  const [ghostTrace, setGhostTrace] = useState<DashboardGhostPoint[]>([]);
  const [checkpointState, setCheckpointState] = useState<DashboardCheckpointState>(() => defaultCheckpointState());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundLevel, setSoundLevel] = useState<SoundLevel>("high");
  const [audioStatus, setAudioStatus] = useState<"off" | "ready" | "blocked">("off");
  const restoringRef = useRef(false);
  const labAudioRef = useRef<{
    context: AudioContext;
    master: GainNode;
  } | null>(null);
  const buzzerAudioRef = useRef<{
    context: AudioContext;
    oscillator: OscillatorNode;
    gain: GainNode;
  } | null>(null);
  const previousWireStateRef = useRef<Partial<Record<WireId, boolean>> | null>(null);
  const previousPlacedPartsRef = useRef<Set<TrainerPartId> | null>(null);
  const previousLedLitRef = useRef(false);
  const previousGuardActionRef = useRef<string | null>(null);
  const previousUsbInsertedRef = useRef(false);
  const previousPotValueRef = useRef(0.55);
  const lastPotSoundAtRef = useRef(0);
  const panelInteractionRef = useRef<{
    panel: BenchPanelId;
    mode: "drag" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    initial: ManagedPanelLayout;
  } | null>(null);

  const potValue = useLabStore((state) => state.lab.potRaw);
  const labState = useLabStore((state) => state.lab);
  const labWires = useLabStore((state) => state.lab.wires);
  const frames = useLabStore((state) => state.frames);
  const setPotValue = useLabStore((state) => state.setPotRaw);
  const syncVisualWires = useLabStore((state) => state.syncVisualWires);
  const syncVisualFaults = useLabStore((state) => state.syncVisualFaults);
  const runCommand = useLabStore((state) => state.runCommand);

  const isBoundary = config.id === "optimization-boundary";
  const isAnalog = config.id === "analog-decision";
  const isEnvironment = config.id === "environment-guard";
  const buzzerStageVisible =
    !isBoundary &&
    !isAnalog &&
    !isEnvironment &&
    (buzzerUnlocked || placedPartIds.has("button") || placedPartIds.has("buzzer") || placedPartIds.has("buzzerResistor"));
  const courseSteps = useMemo(
    () => (isBoundary || isAnalog || isEnvironment ? config.coursePanel.steps : buzzerStageVisible ? config.coursePanel.steps : config.coursePanel.steps.slice(0, BASE_REFLEX_STEP_COUNT)),
    [buzzerStageVisible, config.coursePanel.steps, isAnalog, isBoundary, isEnvironment]
  );
  const availablePartIds = useMemo(
    () =>
      new Set<TrainerPartId>(
        isAnalog
          ? ["potentiometer", "ldr", "dividerResistor", "resistor", "led", "button", "buzzerResistor", "buzzer"]
          : isEnvironment
            ? ["potentiometer", "resistor", "led", "button", "buzzerResistor", "buzzer"]
          : [
              "potentiometer",
              "resistor",
              "led",
              ...(buzzerStageVisible ? (["button", "buzzerResistor", "buzzer"] as TrainerPartId[]) : [])
            ]
      ),
    [buzzerStageVisible, isAnalog, isEnvironment]
  );
  const inventoryKitItems = useMemo(
    () =>
      buzzerStageVisible
        ? [...config.inventory.kitItems, "Reflex Lab 01B unlocked", "Tactile button", "1K buzzer resistor", "Piezo buzzer"]
        : config.inventory.kitItems,
    [buzzerStageVisible, config.inventory.kitItems]
  );
  const dimension = dimensionFromPot(effectivePotValue);
  const boundaryRun = useMemo(
    () => runOptimizationBoundary({ dimension, sampleCount: 256, mode: boundaryMode, seed: boundarySeed }),
    [boundaryMode, boundarySeed, dimension]
  );
  const boundaryRatio = boundaryRun.packet.boundary_hits / boundaryRun.packet.sample_count;
  const boundaryStress = Math.min(1, boundaryRatio + boundaryRun.packet.saturation_events / boundaryRun.packet.sample_count);
  const latestFrame = frames.length > 0 ? frames[frames.length - 1] : null;
  const boundaryHasRun = boundaryFrames.length > 0;
  const liveModeActive = usbInserted && firmwareUploaded;
  const livePreviousOutput = effectivePotValue <= 0.01 ? 0 : latestFrame?.outputs.safe_output ?? 0;
  const reflexPreview = liveModeActive
    ? runLiveReflexPreview(effectivePotValue)
    : runThresholdReflex(effectivePotValue, livePreviousOutput);
  const analogSourceLedBrightness = effectivePotValue;
  const analogLdrInput = Math.max(0, Math.min(1, analogSourceLedBrightness * (1 - ldrCoverAmount * 0.92) + 0.03 * (1 - analogSourceLedBrightness)));
  const analogResponseError = Math.abs(analogSourceLedBrightness - analogLdrInput);
  const analogDecision = runCourseAnalogDecision(analogLdrInput, 0.56, analogLdrInput > 0.56);
  const analogRequestedOutput = analogSourceLedBrightness;
  const environmentHumidityPct = 35 + effectivePotValue * 60;
  const environmentTemperatureC = 21.5 + effectivePotValue * 5.2;
  const environmentStatus = environmentSensorStale
    ? "stale"
    : environmentHumidityPct >= 80
      ? "alert"
      : environmentHumidityPct >= 65
        ? "warning"
        : environmentHumidityPct >= 55
          ? "watch"
          : "ok";
  const environmentRequestedOutput =
    environmentStatus === "stale" || environmentStatus === "alert"
      ? 1
      : environmentStatus === "warning"
        ? 0.68
        : environmentStatus === "watch"
          ? 0.28
          : 0;
  const environmentSafeOutput = liveModeActive ? Math.min(environmentRequestedOutput, 0.85) : 0;
  const environmentGuardAction = environmentRequestedOutput > 0.85 ? "clamp_to_safe_output" : environmentStatus === "stale" ? "stale_fail_visible" : "pass_through";
  const environmentDisplayText = `TEMP ${environmentTemperatureC.toFixed(1)} C | HUM ${environmentHumidityPct.toFixed(1)} % | STATE ${environmentStatus.toUpperCase()} | GUARD ${environmentGuardAction}`;
  const hasBenchReadoutValues = usbInserted || liveModeActive || frames.length > 0 || boundaryHasRun;
  const liveReflexSafeOutput = liveModeActive ? reflexPreview.safeOutput : latestFrame?.outputs.safe_output ?? reflexPreview.safeOutput;
  const liveReflexGuardAction = liveModeActive ? reflexPreview.guardAction : latestFrame?.guard.guard_action ?? reflexPreview.guardAction;
  const liveAnalogSafeOutput = liveModeActive ? Math.min(analogRequestedOutput, 0.85) : 0;
  const liveAnalogGuardAction = analogRequestedOutput > 0.85 ? "clamp_to_safe_output" : "pass_through";
  const analogSensorReady =
    canRunTrace(labState) &&
    placedPartIds.has("ldr") &&
    placedPartIds.has("dividerResistor") &&
    Boolean(labWires.ldr_high_to_power_rail) &&
    Boolean(labWires.ldr_sense_to_gpio35) &&
    Boolean(labWires.ldr_sense_to_divider_resistor) &&
    Boolean(labWires.divider_resistor_to_ground_rail);
  const ledOutput = isBoundary
    ? liveModeActive || boundaryHasRun
      ? boundaryStress
      : 0
    : isAnalog
      ? liveAnalogSafeOutput
      : isEnvironment
        ? environmentSafeOutput
      : liveModeActive
        ? reflexPreview.safeOutput
        : 0;
  const buzzerReady =
    placedPartIds.has("button") &&
    Boolean(labWires.gpio27_to_button) &&
    Boolean(labWires.button_to_ground_rail) &&
    placedPartIds.has("buzzer") &&
    placedPartIds.has("buzzerResistor") &&
    Boolean(labWires.gpio26_to_buzzer_resistor) &&
    Boolean(labWires.buzzer_resistor_to_buzzer_positive) &&
    Boolean(labWires.buzzer_negative_to_ground_rail);
  const buttonControlReady =
    (buzzerStageVisible || isAnalog || isEnvironment) &&
    placedPartIds.has("button") &&
    Boolean(labWires.gpio27_to_button) &&
    Boolean(labWires.button_to_ground_rail);
  const analogReady = analogSensorReady && buzzerReady;
  const environmentReady = buzzerReady;
  const buzzerLive = !isBoundary && liveModeActive && buzzerReady;
  const buttonMuteActive = buzzerReady && buttonControlReady && buttonPressed;
  const reflexBuzzerAlert = Math.max(0, Math.min(1, (liveReflexSafeOutput - 0.55) / 0.3));
  const analogBuzzerAlert = Math.max(0, Math.min(1, (analogResponseError - 0.18) / 0.45));
  const environmentBuzzerAlert = Math.max(0, Math.min(1, environmentSafeOutput));
  const unmutedBuzzerOutput = buzzerLive ? (isAnalog ? analogBuzzerAlert : isEnvironment ? environmentBuzzerAlert : reflexBuzzerAlert) : 0;
  const buzzerOutput = buttonMuteActive ? 0 : unmutedBuzzerOutput;
  const buzzerToneHz = buzzerLive && buzzerOutput > 0.02 ? Math.round(220 + buzzerOutput * 1440) : 0;
  const sceneTraceMode: CourseTraceMode = liveModeActive || usbInserted ? "full" : traceMode;
  const sceneAnimationActive = checkAnimationActive || usbInserted || liveModeActive;
  const dashboardVisible = panelStates.dashboard === "open" && (!benchMode || mobileSheetPanel === "dashboard");
  const activePlacementInstruction = placementInstructionForPart(activePart, componentPinMap, config.parts?.labels);
  const topInstruction =
    boardCheckState === "idle" && !usbInserted && activePlacementInstruction
      ? activePlacementInstruction
      : boardCheckState === "idle" &&
          !usbInserted &&
          (boardCheckMessage === config.defaultBoardMessage || boardCheckMessage === initialInstruction)
        ? courseInstruction
        : boardCheckMessage;
  const effectiveSupplyPinMap = useMemo<SupplyPinMap>(
    () => ({
      positive: supplyPinMap.positive ?? (labWires.esp32_3v3_to_power_rail ? "wired 3V3 rail" : null),
      negative: supplyPinMap.negative ?? (labWires.esp32_gnd_to_ground_rail ? "wired ground rail" : null)
    }),
    [labWires.esp32_3v3_to_power_rail, labWires.esp32_gnd_to_ground_rail, supplyPinMap]
  );
  const progressState = useMemo<CourseProgressState>(
    () => ({
      placedPartIds,
      supplyPinMap: effectiveSupplyPinMap,
      componentPinMap,
      wireState: labWires
    }),
    [componentPinMap, effectiveSupplyPinMap, labWires, placedPartIds]
  );
  const panelLayoutStyles = useMemo<Record<BenchPanelId, CSSProperties>>(
    () =>
      (Object.fromEntries(
        (Object.entries(panelLayouts) as [BenchPanelId, ManagedPanelLayout][]).map(([panel, layout]) => {
          const liveDashboard = panel === "dashboard" && config.dashboard.variant === "reflex-live-popup";
          const width = liveDashboard ? Math.max(layout.width, LIVE_DASHBOARD_MIN_WIDTH) : layout.width;
          const height = liveDashboard ? Math.max(layout.height, LIVE_DASHBOARD_MIN_HEIGHT) : layout.height;
          return [
            panel,
            {
              left: layout.side === "left" ? `${PANEL_GAP}px` : "auto",
              right: layout.side === "right" ? `${PANEL_GAP}px` : "auto",
              top: `${layout.y}px`,
              bottom: "auto",
              width: `${width}px`,
              height: `${height}px`,
              maxHeight: `${height}px`
            } satisfies CSSProperties
          ];
        })
      ) as Record<BenchPanelId, CSSProperties>),
    [config.dashboard.variant, panelLayouts]
  );

  function resetPanelLayout() {
    setPanelLayouts(resolvePanelOverlap(defaultManagedPanelLayouts()));
    setPanelStates(defaultPanelStates(config));
    setMobileSheetPanel(null);
    setBenchMode(isCompactViewport());
  }

  function beginPanelInteraction(
    panel: BenchPanelId,
    mode: "drag" | "resize",
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (isCompactViewport()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panelInteractionRef.current = {
      panel,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initial: panelLayouts[panel]
    };
  }

  function ensureLabAudio(): { context: AudioContext; master: GainNode } | null {
    if (typeof window === "undefined") return null;
    if (labAudioRef.current) {
      void labAudioRef.current.context.resume().catch(() => {
        // Browser audio policy may require the Enable sound button gesture first.
      });
      return labAudioRef.current;
    }

    const AudioContextCtor =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    const context = new AudioContextCtor();
    const master = context.createGain();
    master.gain.value = soundLevelGain[soundLevel];
    master.connect(context.destination);
    labAudioRef.current = { context, master };
    return labAudioRef.current;
  }

  function stopBuzzerAudio() {
    const audio = buzzerAudioRef.current;
    if (!audio) return;
    const now = audio.context.currentTime;
    audio.gain.gain.cancelScheduledValues(now);
    audio.gain.gain.setTargetAtTime(0.0001, now, 0.025);
    window.setTimeout(() => {
      try {
        audio.oscillator.stop();
        audio.oscillator.disconnect();
        audio.gain.disconnect();
      } catch {
        // The simulated buzzer may already be stopped by the browser audio engine.
      }
    }, 90);
    buzzerAudioRef.current = null;
  }

  function playTone(
    frequency: number,
    duration = 0.08,
    gainLevel = 0.035,
    type: OscillatorType = "sine",
    endFrequency?: number,
    force = false
  ) {
    if (!soundEnabled && !force) return;
    const audio = ensureLabAudio();
    if (!audio) return;

    const { context, master } = audio;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playWireSnap() {
    playTone(1240, 0.13, 0.22, "square", 180);
    window.setTimeout(() => playTone(2600, 0.04, 0.11, "triangle"), 22);
  }

  function playHoleSelect() {
    playTone(680, 0.045, 0.055, "triangle", 820);
  }

  function playPowerClick() {
    playTone(160, 0.1, 0.08, "triangle", 90);
  }

  function playLedOn() {
    playTone(740, 0.12, 0.08, "sine", 880);
  }

  function playLedOff() {
    playTone(460, 0.1, 0.065, "sine", 360);
  }

  function playGuardTick(active: boolean) {
    playTone(active ? 1180 : 620, active ? 0.075 : 0.09, active ? 0.08 : 0.06, active ? "square" : "triangle");
  }

  function playShortSpark() {
    playTone(90, 0.18, 0.26, "sawtooth", 38);
    window.setTimeout(() => playTone(2800, 0.06, 0.22, "square", 600), 18);
    window.setTimeout(() => playTone(140, 0.24, 0.16, "sawtooth", 55), 90);
  }

  function playPotTouch() {
    const audio = ensureLabAudio();
    if (!soundEnabled || !audio) return;
    const nowMs = window.performance.now();
    if (nowMs - lastPotSoundAtRef.current < 95) return;
    lastPotSoundAtRef.current = nowMs;
    playTone(95 + effectivePotValue * 70, 0.04, 0.025, "sawtooth", 70 + effectivePotValue * 50);
  }

  async function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false);
      setAudioStatus("off");
      stopBuzzerAudio();
      return;
    }

    const audio = ensureLabAudio();
    if (!audio) return;
    try {
      await audio.context.resume();
    } catch {
      setAudioStatus("blocked");
    }
    const ready = audio.context.state === "running";
    setAudioStatus(ready ? "ready" : "blocked");
    setSoundEnabled(ready);
    if (ready) window.setTimeout(() => playTone(720, 0.28, 0.18, "sine", 920, true), 0);
  }

  function chooseSoundLevel(level: SoundLevel) {
    setSoundLevel(level);
    window.setTimeout(() => playTone(level === "low" ? 520 : level === "medium" ? 740 : 980, 0.12, 0.12, "triangle"), 0);
  }

  useEffect(() => {
    const audio = labAudioRef.current;
    if (!audio) return;
    audio.master.gain.setTargetAtTime(soundLevelGain[soundLevel], audio.context.currentTime, 0.025);
  }, [soundLevel]);

  useEffect(() => {
    const audioActive = soundEnabled && buzzerLive && buzzerToneHz > 0 && buzzerOutput > 0.02;
    if (typeof window === "undefined" || !audioActive) {
      stopBuzzerAudio();
      return undefined;
    }

    const labAudio = ensureLabAudio();
    if (!labAudio) return undefined;

    if (!buzzerAudioRef.current) {
      const context = labAudio.context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = buzzerToneHz;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(labAudio.master);
      oscillator.start();
      buzzerAudioRef.current = { context, oscillator, gain };
    }

    const audio = buzzerAudioRef.current;
    void audio.context.resume().catch(() => {
      // Browser autoplay policy may pause audio until the next user gesture.
    });
    const now = audio.context.currentTime;
    const gainLevel = 0.004 + Math.min(1, buzzerOutput) * 0.022;
    audio.oscillator.frequency.setTargetAtTime(buzzerToneHz, now, 0.035);
    audio.gain.gain.setTargetAtTime(gainLevel, now, 0.035);

    return undefined;
  }, [buzzerLive, buzzerOutput, buzzerToneHz, soundEnabled]);

  useEffect(() => {
    if (restoringRef.current) {
      previousWireStateRef.current = { ...labWires };
      return;
    }

    const previous = previousWireStateRef.current;
    previousWireStateRef.current = { ...labWires };
    if (!previous) return;

    const anyWireChanged = Object.entries(labWires).some(([wire, connected]) => connected !== previous[wire as WireId]);
    if (anyWireChanged && boardCheckState !== "checking") {
      setBoardCheckState("idle");
      setBoardCheckMessage("Wiring changed. Sync for latest instruction.");
      setCompletionDismissed(false);
      setTraceMode("idle");
      setCheckAnimationActive(false);
      if (usbInserted || firmwareUploaded) {
        const nextGhostTrace = ghostTraceFromFrames(useLabStore.getState().frames);
        if (nextGhostTrace.length > 0) {
          setGhostTrace(nextGhostTrace);
          setCockpitPhase("bench_with_history");
          setCockpitTab("checklist");
          setCheckpointState((current) => ({
            ...current,
            snapshotSaved: true,
            usbDisconnected: true
          }));
        } else {
          setCockpitPhase("bench_idle");
          setCockpitTab("schematic");
        }
        setUsbInserted(false);
        setFirmwareUploaded(false);
        setPinSetupOpen(false);
      }
    }

    const newlyConnected = Object.entries(labWires).some(([wire, connected]) => connected && !previous[wire as WireId]);
    if (soundEnabled && newlyConnected) playWireSnap();
  }, [boardCheckState, firmwareUploaded, labWires, soundEnabled, usbInserted]);

  useEffect(() => {
    if (restoringRef.current) {
      previousPlacedPartsRef.current = new Set(placedPartIds);
      return;
    }

    const previous = previousPlacedPartsRef.current;
    previousPlacedPartsRef.current = new Set(placedPartIds);
    if (!previous) return;

    const partSeated = Array.from(placedPartIds).some((partId) => !previous.has(partId));
    if (partSeated && boardCheckState !== "checking") {
      setBoardCheckState("idle");
      setBoardCheckMessage("Part placement changed. Sync for latest instruction.");
    }
    if (soundEnabled && partSeated) playWireSnap();
  }, [boardCheckState, placedPartIds, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || restoringRef.current) {
      previousUsbInsertedRef.current = usbInserted;
      return;
    }

    if (usbInserted && !previousUsbInsertedRef.current) playPowerClick();
    previousUsbInsertedRef.current = usbInserted;
  }, [soundEnabled, usbInserted]);

  useEffect(() => {
    if (!soundEnabled || restoringRef.current) {
      previousLedLitRef.current = ledOutput > 0.04;
      return;
    }

    const ledLit = liveModeActive && ledOutput > 0.04;
    if (ledLit !== previousLedLitRef.current) {
      if (ledLit) playLedOn();
      else playLedOff();
    }
    previousLedLitRef.current = ledLit;
  }, [ledOutput, liveModeActive, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || restoringRef.current) {
      previousGuardActionRef.current = liveReflexGuardAction;
      return;
    }

    const previous = previousGuardActionRef.current;
    if (previous && previous !== liveReflexGuardAction) {
      playGuardTick(liveReflexGuardAction === "clamp_to_safe_output");
    }
    previousGuardActionRef.current = liveReflexGuardAction;
  }, [liveReflexGuardAction, soundEnabled]);

  useEffect(() => {
    const delta = Math.abs(effectivePotValue - previousPotValueRef.current);
    previousPotValueRef.current = effectivePotValue;
    if (soundEnabled && liveModeActive && delta > 0.008) playPotTouch();
  }, [effectivePotValue, liveModeActive, soundEnabled]);

  useEffect(() => {
    return () => {
      const audio = buzzerAudioRef.current;
      if (audio) {
        try {
          audio.oscillator.stop();
          audio.oscillator.disconnect();
          audio.gain.disconnect();
          if (audio.context !== labAudioRef.current?.context) void audio.context.close();
        } catch {
          // Nothing to clean up if the audio graph was already released.
        }
        buzzerAudioRef.current = null;
      }
      void labAudioRef.current?.context.close();
      labAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    function movePanel(event: PointerEvent) {
      const interaction = panelInteractionRef.current;
      if (!interaction) return;
      const dx = event.clientX - interaction.startX;
      const dy = event.clientY - interaction.startY;
      setPanelLayouts((current) => {
        const initial = interaction.initial;
        const nextPanel =
          interaction.mode === "drag"
            ? {
                ...initial,
                side: event.clientX < window.innerWidth / 2 ? ("left" as const) : ("right" as const),
                y: initial.y + dy
              }
            : {
                ...initial,
                width: initial.width + (initial.side === "left" ? dx : -dx),
                height: initial.height + dy
              };
        return resolvePanelOverlap({ ...current, [interaction.panel]: nextPanel });
      });
    }

    function stopPanelInteraction() {
      panelInteractionRef.current = null;
    }

    window.addEventListener("pointermove", movePanel);
    window.addEventListener("pointerup", stopPanelInteraction);
    window.addEventListener("pointercancel", stopPanelInteraction);
    return () => {
      window.removeEventListener("pointermove", movePanel);
      window.removeEventListener("pointerup", stopPanelInteraction);
      window.removeEventListener("pointercancel", stopPanelInteraction);
    };
  }, []);

  useEffect(() => {
    function handleViewportResize() {
      const compact = isCompactViewport();
      setCompactViewport(compact);
      setBenchMode(compact);
      setPanelLayouts((current) => resolvePanelOverlap(current));
    }

    handleViewportResize();
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    return () => {
      if (courseHighlightTimerRef.current !== null) {
        window.clearTimeout(courseHighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const persisted = safeParseBenchState(window.localStorage.getItem(storageKeyForCourse(config.id)));
    const shouldRestore = persisted?.courseId === config.id;
    restoringRef.current = Boolean(shouldRestore);
    publishLabEvent("bench_loaded", config.benchLoadedPayload);
    window.__mgeLab?.reset();
    runCommand("reset");
    setBoundaryFrames([]);
    setBoundaryTerminal(boundaryHello(config));
    setAnalogTerminal(analogHello(config));
    setCompletionDismissed(false);
    setCourseStep(shouldRestore ? persisted.courseStep : 0);
    setCourseInstruction(initialInstruction);
    setCourseHighlight(null);
    setPanelStates(shouldRestore ? persisted.panelStates : defaultPanelStates(config));
    setPanelLayouts(loadManagedPanelLayouts(config.id));
    setBoardCheckState(shouldRestore && persisted.boardCheckState !== "checking" ? persisted.boardCheckState : "idle");
    setBoardCheckMessage(shouldRestore ? persisted.boardCheckMessage : initialInstruction);
    setTraceMode("idle");
    setCheckAnimationActive(false);
    setUsbInserted(shouldRestore ? persisted.usbInserted : false);
    setFirmwareUploaded(shouldRestore ? Boolean(persisted.firmwareUploaded) : false);
    setBuzzerUnlocked(shouldRestore ? Boolean(persisted.buzzerUnlocked) : false);
    setLab01BReadyToStart(false);
    setButtonPressed(false);
    setLdrCoverAmount(shouldRestore ? persisted.ldrCoverAmount ?? 0 : 0);
    setReleaseChecklistDone(shouldRestore ? persisted.releaseChecklistDone ?? {} : {});
    setCockpitPhase(shouldRestore ? persisted.cockpitPhase ?? (persisted.firmwareUploaded ? "running" : persisted.usbInserted ? "bench_idle" : "bench_idle") : "bench_idle");
    setCockpitMode(shouldRestore ? persisted.cockpitMode ?? "guided" : "guided");
    setCockpitTab(shouldRestore ? persisted.cockpitTab ?? (persisted.firmwareUploaded ? "trace" : "schematic") : "schematic");
    setGhostTrace(shouldRestore ? persisted.ghostTrace ?? [] : []);
    setCheckpointState(shouldRestore ? persisted.checkpoint ?? defaultCheckpointState() : defaultCheckpointState());
    setPinSetupOpen(false);
    setBenchMode(isCompactViewport());
    setChecklistOpen(false);
    if (shouldRestore && persisted.boundaryMode) setBoundaryMode(persisted.boundaryMode);
    if (shouldRestore) setPotValue(persisted.potValue);
    setEffectivePotValue(shouldRestore ? persisted.potValue : useLabStore.getState().lab.potRaw);
    window.setTimeout(() => {
      if (shouldRestore) importVisualStateWhenReady(persisted.visual);
      restoringRef.current = false;
    }, 120);
  }, [config, initialInstruction, runCommand, setPotValue]);

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem(panelLayoutStorageKey(config.id), JSON.stringify(panelLayouts));
    }, 180);

    return () => window.clearTimeout(saveTimer);
  }, [config.id, panelLayouts]);

  useEffect(() => {
    if (restoringRef.current) return;
    const saveTimer = window.setTimeout(() => {
      const visual = window.__mgeLab?.exportState() ?? {};
      const state: PersistedBenchState = {
        version: 1,
        courseId: config.id,
        savedAt: new Date().toISOString(),
        potValue,
        sourceLedBrightness: effectivePotValue,
        ldrValue: analogLdrInput,
        ldrCoverAmount,
        courseStep,
        boardCheckState: boardCheckState === "checking" ? "idle" : boardCheckState,
        boardCheckMessage,
        panelStates,
        usbInserted,
        firmwareUploaded,
        boundaryMode,
        releaseChecklistDone,
        cockpitPhase,
        cockpitMode,
        cockpitTab,
        ghostTrace,
        checkpoint: checkpointState,
        visual
      };
      window.localStorage.setItem(storageKeyForCourse(config.id), JSON.stringify(state));
    }, 250);

    return () => window.clearTimeout(saveTimer);
  }, [
    activePart,
    boardCheckMessage,
    boardCheckState,
    boundaryMode,
    componentPinMap,
    config.id,
    courseStep,
    effectiveSupplyPinMap,
    labWires,
    ldrCoverAmount,
    panelStates,
    placedPartIds,
    potValue,
    releaseChecklistDone,
    usbInserted,
    firmwareUploaded,
    cockpitPhase,
    cockpitMode,
    cockpitTab,
    ghostTrace,
    checkpointState
  ]);

  useEffect(() => {
    placedPartIds.forEach((partId) => {
      publishLabEvent("component_placed", {
        course: config.id,
        part: partId,
        pins: componentPinMap[partId]
      });
    });
  }, [componentPinMap, config.id, placedPartIds]);

  useEffect(() => {
    if (boardCheckState !== "blocked" || usbInserted) return;
    const reports = analyzeLab(labState);
    if (reports.length === 0) {
      setBoardCheckState("idle");
      setBoardCheckMessage(courseSteps[courseStep]?.shortInstruction ?? initialInstruction);
      return;
    }
    const firstStop = reports.find((report) => report.severity === "stop");
    if (firstStop) setBoardCheckMessage(faultMessage(firstStop));
  }, [boardCheckState, courseSteps, courseStep, initialInstruction, labState, usbInserted]);

  const setPanelState = useCallback((panel: BenchPanelId, state: BenchPanelState) => {
    setPanelStates((current) => ({ ...current, [panel]: state }));
  }, []);

  const handleActivePartChange = useCallback((part: TrainerPartId | null) => {
    if (part) {
      setJumperToolActive(false);
      setRemoveMode(false);
    }
    setActivePart(part);
  }, []);

  const handleJumperToolSelect = useCallback(() => {
    setActivePart(null);
    setRemoveMode(false);
    setJumperToolActive(true);
  }, []);

  const handleCircuitWireStateChange = useCallback(
    (visualWires: Partial<Record<WireId, boolean>>) => {
      syncVisualWires(visualWires);
    },
    [syncVisualWires]
  );

  const handleCircuitFaultStateChange = useCallback(
    (visualFaults: Partial<Record<FaultId, boolean>>) => {
      syncVisualFaults(visualFaults);
    },
    [syncVisualFaults]
  );

  function traceFor(mode: CourseTraceMode, durationMs: number) {
    setTraceMode(mode);
    setCheckAnimationActive(mode !== "idle");
    window.setTimeout(() => {
      setTraceMode("idle");
      setCheckAnimationActive(false);
    }, durationMs);
  }

  function flashCourseHighlight(target: CourseHighlightTarget | null, durationMs = 2600) {
    if (courseHighlightTimerRef.current !== null) {
      window.clearTimeout(courseHighlightTimerRef.current);
      courseHighlightTimerRef.current = null;
    }
    setCourseHighlight(target);
    if (target) {
      courseHighlightTimerRef.current = window.setTimeout(() => {
        setCourseHighlight(null);
        courseHighlightTimerRef.current = null;
      }, durationMs);
    }
  }

  function handleCourseHighlightChange(target: CourseHighlightTarget | null) {
    flashCourseHighlight(target, target ? 3600 : 0);
  }

  function checkCourseStep(step: {
    index: number;
    title: string;
    highlight: CourseHighlightTarget;
    complete: boolean;
  }) {
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setBoardCheckState("checking");
    flashCourseHighlight(step.highlight, 1750);
    traceFor(traceModeForStep(step.index), 1750);
    setBoardCheckMessage(step.complete ? `Step check passed: ${step.title}.` : `Step check paused at ${step.title}. Finish this connection, then check again.`);
    window.setTimeout(() => {
      setBoardCheckState(step.complete ? "idle" : "blocked");
    }, 1750);
  }

  function refreshCurrentInstruction() {
    const nextStepIndex = courseSteps.findIndex((step) => !step.done(progressState));
    const nextStep = nextStepIndex >= 0 ? courseSteps[nextStepIndex] : null;
    setTraceMode("idle");
    setCheckAnimationActive(false);
    setBoardCheckState("idle");
    if (nextStep) {
      setCourseStep(nextStepIndex);
      setCourseInstruction(nextStep.shortInstruction);
      flashCourseHighlight(nextStep.highlight, 2600);
      setBoardCheckMessage(nextStep.shortInstruction);
    } else {
      flashCourseHighlight("usb", 2600);
      setBoardCheckMessage("Current build looks complete. Run Check board before USB.");
    }
  }

  function courseWiringReady(currentLab = useLabStore.getState().lab): boolean {
    if (!canRunTrace(currentLab)) return false;
    if (isAnalog) {
      return Boolean(
        currentLab.wires.ldr_high_to_power_rail &&
          currentLab.wires.ldr_sense_to_gpio35 &&
          currentLab.wires.ldr_sense_to_divider_resistor &&
          currentLab.wires.divider_resistor_to_ground_rail &&
          buzzerReady
      );
    }
    if (isEnvironment) {
      return buzzerReady;
    }
    return isBoundary || !buzzerStageVisible || buzzerReady;
  }

  function checkBoard() {
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setBoardCheckState("checking");
    setBoardCheckMessage(config.checkMessages.start);
    setTraceMode("rails");
    setCheckAnimationActive(true);

    window.setTimeout(() => {
      setBoardCheckMessage(config.checkMessages.middle);
      setTraceMode("pot");
    }, 1250);

    window.setTimeout(() => {
      setBoardCheckMessage(config.checkMessages.output);
      setTraceMode("led");
    }, 2650);

    window.setTimeout(() => {
      const currentLab = useLabStore.getState().lab;
      const reports = analyzeLab(currentLab);
      const readyForCurrentStage = courseWiringReady(currentLab);
      if (readyForCurrentStage) {
        setBoardCheckState("passed");
        setBoardCheckMessage(buzzerStageVisible ? "Lab 01B check passed. Insert USB to test the button and buzzer stage." : config.checkMessages.passed);
      } else {
        const firstStopReport = reports.find((report) => report.severity === "stop");
        const nextStepIndex = courseSteps.findIndex((step) => !step.done(progressState));
        const nextStep = nextStepIndex >= 0 ? courseSteps[nextStepIndex] : null;
        if (!firstStopReport && nextStep) {
          setCourseStep(nextStepIndex);
          setCourseInstruction(nextStep.shortInstruction);
          flashCourseHighlight(nextStep.highlight, 2600);
        }
        setBoardCheckState("blocked");
        setBoardCheckMessage(
          buzzerStageVisible && !buzzerReady
            ? "Finish Lab 01B: GPIO27 to button, button to GND, GPIO26 to 1K, 1K to buzzer +, and buzzer - to GND."
            : isAnalog
              ? "Finish Course 2: keep the Course 1 button/buzzer harness, then add the LDR divider and protected LED header."
              : isEnvironment
                ? "Finish Course 3: wire the humidity proxy, state LED, mute button, and alert buzzer."
              : firstStopReport
              ? faultMessage(firstStopReport)
              : nextStep
                ? `Next: ${nextStep.shortInstruction}.`
                : config.checkMessages.fallbackBlocked
        );
      }
      setTraceMode("idle");
      setCheckAnimationActive(false);
    }, 4300);
  }

  function insertUsb() {
    const currentLab = useLabStore.getState().lab;
    setUsbInserted(true);
    setFirmwareUploaded(false);
    setCockpitPhase(ghostTrace.length > 0 ? "bench_with_history" : "bench_idle");
    setCockpitTab("serial");
    setPanelState("dashboard", "open");
    setTraceMode("rails");
    setCheckAnimationActive(true);

    if (!courseWiringReady(currentLab)) {
      setBoardCheckState("blocked");
      setBoardCheckMessage(buzzerStageVisible && !buzzerReady ? "USB blocked. Finish the Lab 01B button and buzzer paths first." : config.checkMessages.usbBlocked);
      setPinSetupOpen(false);
      window.setTimeout(() => {
        setTraceMode("idle");
        setCheckAnimationActive(false);
      }, 2200);
      return;
    }

    setBoardCheckMessage(
      isAnalog
        ? "USB inserted. Configure GPIO34, GPIO35, GPIO25, GPIO26, GPIO27, 3V3, and GND before running firmware."
        : isEnvironment
          ? "USB inserted. Configure GPIO34, GPIO25, GPIO26, GPIO27, 3V3, GND, and optional I2C upgrade pins before running firmware."
        : buzzerStageVisible
        ? "USB inserted. Configure GPIO34, GPIO25, GPIO27, GPIO26, 3V3, and GND before running firmware."
        : "USB inserted. Configure GPIO34, GPIO25, 3V3, and GND before running firmware."
    );
    setPinSetupOpen(true);
    setPanelState("dashboard", "open");
    window.setTimeout(() => {
      setTraceMode("idle");
      setCheckAnimationActive(false);
    }, 1400);
  }

  function startSimulatedDashboardRun() {
    setFirmwareUploaded(true);
    setPinSetupOpen(false);
    setCockpitPhase(ghostTrace.length > 0 ? "running_with_history" : "running");
    setCockpitTab("trace");
    setPanelState("dashboard", "open");
    setTraceMode("full");
    setCheckAnimationActive(true);

    if (isBoundary) {
      setBoundaryFrames(boundaryRun.frames);
      boundaryRun.frames.forEach((frame) => publishLabEvent("trace_frame", frame as unknown as Record<string, unknown>));
      setBoundaryTerminal((current) =>
        append(current, {
          kind: "ok",
          text: `ran boundary_demo_proxy: dim=${dimension} mode=${modeLabel(boundaryMode)} frames=${boundaryRun.frames.length} simulated=true hardware_observed=false`
        })
      );
      setBoardCheckMessage(config.checkMessages.usbRunning);
    } else if (isAnalog) {
      setAnalogTerminal((current) =>
        append(
          append(current, { kind: "ok", text: "validated analog_decision_v0 schema simulated=true hardware_observed=false" }),
          {
            kind: "ok",
            text: `running analog_decision_v0: pot_led=${analogSourceLedBrightness.toFixed(2)} ldr=${analogDecision.normalizedInput.toFixed(2)} cover=${ldrCoverAmount.toFixed(2)} error=${analogResponseError.toFixed(2)} buzzer=${analogBuzzerAlert.toFixed(2)} mute=${buttonPressed ? "pressed" : "open"} safe=${liveAnalogSafeOutput.toFixed(2)}`
          }
        )
      );
      setBoardCheckMessage(config.checkMessages.usbRunning);
    } else if (isEnvironment) {
      setEnvironmentTerminal((current) =>
        append(
          append(current, { kind: "ok", text: "validated environment_guard_v0 proxy schema simulated=true hardware_observed=false bme280_observed=false oled_observed=false" }),
          {
            kind: "ok",
            text: `running environment_guard_v0_proxy: humidity=${environmentHumidityPct.toFixed(1)} temp=${environmentTemperatureC.toFixed(1)} state=${environmentStatus} stale=${environmentSensorStale} alert=${environmentRequestedOutput.toFixed(2)} safe=${environmentSafeOutput.toFixed(2)} mute=${buttonPressed ? "pressed" : "open"}`
          }
        )
      );
      setBoardCheckMessage(config.checkMessages.usbRunning);
    } else {
      runCommand("validate");
      window.setTimeout(() => runCommand("run"), 450);
      setBoardCheckMessage(
        buzzerReady ? "USB inserted. Simulated threshold_reflex_v0 is running with GPIO27 button and GPIO26 buzzer monitors." : config.checkMessages.usbRunning
      );
    }

    window.setTimeout(() => {
      setTraceMode("idle");
      setCheckAnimationActive(false);
    }, 2200);
  }

  function uploadSimulatedFirmware() {
    if (!usbInserted || !courseWiringReady(useLabStore.getState().lab)) {
      setBoardCheckState("blocked");
      setBoardCheckMessage(buzzerStageVisible && !buzzerReady ? "Firmware upload blocked until Lab 01B wiring is complete." : config.checkMessages.usbBlocked);
      return;
    }

    startSimulatedDashboardRun();
  }

  function runFastDashboardPath() {
    const ready = courseWiringReady(useLabStore.getState().lab);
    setCockpitMode("fast");
    setPanelState("dashboard", "open");
    if (!ready) {
      refreshCurrentInstruction();
      setCockpitTab("checklist");
      setBoardCheckState("blocked");
      setBoardCheckMessage(buzzerStageVisible && !buzzerReady ? "Fast run blocked. Finish the Lab 01B button and buzzer paths first." : config.checkMessages.usbBlocked);
      return;
    }

    setUsbInserted(true);
    setBoardCheckState("passed");
    setBoardCheckMessage("Fast Mode: wiring is ready. Starting the simulated dashboard run.");
    startSimulatedDashboardRun();
  }

  function resetBench() {
    window.__mgeLab?.reset();
    runCommand("reset");
    setActivePart(null);
    setJumperToolActive(false);
    setRemoveMode(false);
    setPanelStates(defaultPanelStates(config));
    setCourseStep(0);
    setCourseHighlight(null);
    setCourseInstruction(initialInstruction);
    setBoardCheckState("idle");
    setBoardCheckMessage(initialInstruction);
    setTraceMode("idle");
    setCheckAnimationActive(false);
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setLab01BReadyToStart(false);
    setCockpitPhase("bench_idle");
    setCockpitMode("guided");
    setCockpitTab("schematic");
    setGhostTrace([]);
    setCheckpointState(defaultCheckpointState());
    setButtonPressed(false);
    setBuzzerUnlocked(false);
    setPinSetupOpen(false);
    setEffectivePotValue(useLabStore.getState().lab.potRaw);
    setLdrCoverAmount(0);
    setEnvironmentSensorStale(false);
    setBoundaryFrames([]);
    setBoundaryTerminal(boundaryHello(config));
    setAnalogTerminal(analogHello(config));
    setEnvironmentTerminal(environmentHello(config));
    setCompletionDismissed(false);
  }

  function toggleRemoveMode() {
    setActivePart(null);
    setJumperToolActive(false);
    setRemoveMode(false);
    setRemoveMode((current) => {
      const next = !current;
      setBoardCheckState("idle");
      setBoardCheckMessage(next ? "Remove mode: click placed leads or jumper endpoints. Return to Build mode, then sync for latest instruction." : "Build mode restored. Sync for latest instruction.");
      return next;
    });
  }

  function undoLastBenchChange() {
    const restored = window.__mgeLab?.undo() ?? false;
    setActivePart(null);
    setRemoveMode(false);
    window.setTimeout(() => {
      const restoredState = window.__mgeLab?.getState();
      setJumperToolActive(Boolean(restoredState?.jumperConnections.length));
    }, 0);
    setBoardCheckState("idle");
    setBoardCheckMessage(restored ? "Last wiring change undone. Sync for latest instruction." : "Nothing to undo yet.");
    setTraceMode("idle");
    setCheckAnimationActive(false);
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setButtonPressed(false);
    setCockpitPhase(ghostTrace.length > 0 ? "bench_with_history" : "bench_idle");
    setCockpitTab(ghostTrace.length > 0 ? "checklist" : "schematic");
  }

  function disconnectUsbAfterRun() {
    const nextGhostTrace = ghostTraceFromFrames(useLabStore.getState().frames);
    if (nextGhostTrace.length > 0) setGhostTrace(nextGhostTrace);
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setLab01BReadyToStart(false);
    setButtonPressed(false);
    setBoardCheckState("idle");
    setBoardCheckMessage(buzzerStageVisible ? "USB disconnected. Lab 01B build is preserved." : "USB disconnected.");
    setCockpitPhase(nextGhostTrace.length > 0 || ghostTrace.length > 0 ? "bench_with_history" : "bench_idle");
    setCockpitTab(nextGhostTrace.length > 0 || ghostTrace.length > 0 ? "checklist" : "schematic");
    setCheckpointState((current) => ({
      ...current,
      snapshotSaved: nextGhostTrace.length > 0 || current.snapshotSaved,
      usbDisconnected: true
    }));
    setTraceMode("idle");
    setCheckAnimationActive(false);
  }

  function disconnectUsbBeforeLab01B() {
    const nextGhostTrace = ghostTraceFromFrames(useLabStore.getState().frames);
    if (nextGhostTrace.length > 0) setGhostTrace(nextGhostTrace);
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setLab01BReadyToStart(true);
    setButtonPressed(false);
    setCourseStep(BASE_REFLEX_STEP_COUNT);
    setCourseInstruction("USB disconnected. Continue to Lab 01B when you are ready to add the button and buzzer parts.");
    setBoardCheckState("idle");
    setBoardCheckMessage("USB disconnected. Now click Continue to Lab 01B before adding the button and buzzer.");
    setCockpitPhase(nextGhostTrace.length > 0 || ghostTrace.length > 0 ? "bench_with_history" : "bench_idle");
    setCockpitTab("checklist");
    setCheckpointState((current) => ({
      ...current,
      snapshotSaved: nextGhostTrace.length > 0 || current.snapshotSaved,
      usbDisconnected: true
    }));
    setPanelState("dashboard", "open");
    setTraceMode("idle");
    setCheckAnimationActive(false);
  }

  function startLab01B() {
    setUsbInserted(false);
    setFirmwareUploaded(false);
    setPinSetupOpen(false);
    setLab01BReadyToStart(false);
    setBuzzerUnlocked(true);
    setCockpitPhase("bench_01b_unlocked");
    setCockpitTab("schematic");
    setCheckpointState((current) => ({
      ...current,
      returnedToSchematic: true,
      lab01bUnlocked: true
    }));
    setButtonPressed(false);
    setActivePart(null);
    setJumperToolActive(false);
    setPanelState("inventory", "open");
    setPanelState("dashboard", "open");
    setCourseStep(BASE_REFLEX_STEP_COUNT + 1);
    setCourseInstruction("Lab 01B: select the tactile button and place its two legs in two different rows.");
    setBoardCheckState("idle");
    setBoardCheckMessage("Lab 01B started. Place the button first: one row will go to GPIO27, the other row will go to GND.");
    setTraceMode("idle");
    setCheckAnimationActive(false);
  }

  function persistedBenchState(): PersistedBenchState {
    return {
      version: 1,
      courseId: config.id,
      savedAt: new Date().toISOString(),
      potValue,
      sourceLedBrightness: effectivePotValue,
      ldrValue: analogLdrInput,
      ldrCoverAmount,
      environmentSensorStale,
      courseStep,
      boardCheckState: boardCheckState === "checking" ? "idle" : boardCheckState,
      boardCheckMessage,
      panelStates,
      usbInserted,
      firmwareUploaded,
      buzzerUnlocked,
      boundaryMode,
      releaseChecklistDone,
      cockpitPhase,
      cockpitMode,
      cockpitTab,
      ghostTrace,
      checkpoint: checkpointState,
      visual: window.__mgeLab?.exportState() ?? {}
    };
  }

  function applyBenchState(state: PersistedBenchState) {
    restoringRef.current = true;
    setPotValue(state.potValue);
    setCourseStep(Math.max(0, Math.min(config.coursePanel.steps.length - 1, state.courseStep)));
    setBoardCheckState(state.boardCheckState === "checking" ? "idle" : state.boardCheckState);
    setBoardCheckMessage(state.boardCheckMessage || initialInstruction);
    setPanelStates(state.panelStates ?? defaultPanelStates(config));
    setUsbInserted(state.usbInserted);
    setFirmwareUploaded(Boolean(state.firmwareUploaded));
    setBuzzerUnlocked(Boolean(state.buzzerUnlocked));
    setLab01BReadyToStart(false);
    setButtonPressed(false);
    setLdrCoverAmount(state.ldrCoverAmount ?? 0);
    setEnvironmentSensorStale(Boolean(state.environmentSensorStale));
    setReleaseChecklistDone(state.releaseChecklistDone ?? {});
    setCockpitPhase(state.cockpitPhase ?? (state.firmwareUploaded ? "running" : "bench_idle"));
    setCockpitMode(state.cockpitMode ?? "guided");
    setCockpitTab(state.cockpitTab ?? (state.firmwareUploaded ? "trace" : "schematic"));
    setGhostTrace(state.ghostTrace ?? []);
    setCheckpointState(state.checkpoint ?? defaultCheckpointState());
    setPinSetupOpen(false);
    if (state.boundaryMode) setBoundaryMode(state.boundaryMode);
    setBenchMode(isCompactViewport());
    setMobileSheetPanel(null);
    importVisualStateWhenReady(state.visual);
    window.setTimeout(() => {
      restoringRef.current = false;
    }, 120);
  }

  async function shareBenchState() {
    const state = persistedBenchState();
    const text = JSON.stringify(state, null, 2);
    window.localStorage.setItem(storageKeyForCourse(config.id), JSON.stringify(state));
    try {
      await navigator.clipboard?.writeText(text);
      setShareMessage("Lab state copied");
    } catch {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${config.id}-lab-state.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShareMessage("Lab state downloaded");
    }
    window.setTimeout(() => setShareMessage(null), 2400);
  }

  function importBenchState() {
    const raw = window.prompt("Paste a Monogate lab state JSON packet");
    if (!raw) return;
    const imported = safeParseBenchState(raw);
    if (!imported || imported.courseId !== config.id) {
      setShareMessage("Import did not match this course");
      window.setTimeout(() => setShareMessage(null), 2800);
      return;
    }
    applyBenchState(imported);
    setShareMessage("Lab state imported");
    window.setTimeout(() => setShareMessage(null), 2400);
  }

  function toggleReleaseCheck(id: string) {
    setReleaseChecklistDone((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  function handleCockpitTabChange(tab: DashboardCockpitTab) {
    setCockpitTab(tab);
    if (tab === "schematic") setSchematicOpen(true);
    if (tab === "checklist") setChecklistOpen(true);
  }

  function markDashboardCheckpoint(step: keyof DashboardCheckpointState) {
    if (step === "snapshotSaved") {
      const nextGhostTrace = ghostTraceFromFrames(useLabStore.getState().frames);
      if (nextGhostTrace.length > 0) setGhostTrace(nextGhostTrace);
    }
    if (step === "returnedToSchematic") {
      setCockpitTab("schematic");
      setSchematicOpen(true);
    }
    if (step === "lab01bUnlocked") {
      setCheckpointState((current) => ({ ...current, [step]: true }));
      startLab01B();
      return;
    }
    setCheckpointState((current) => ({ ...current, [step]: true }));
  }

  function openPanelFromBenchMode(panel: BenchPanelId) {
    setBenchMode(true);
    setMobileSheetPanel((current) => (current === panel ? null : panel));
    setPanelState(panel, "open");
  }

  function runBoundaryCommand(raw: string) {
    const command = raw.trim().toLowerCase() || "help";
    setBoundaryTerminal((current) => append(current, { kind: "input", text: `> ${raw}` }));
    if (command === "help") {
      setBoundaryTerminal((current) =>
        append(current, { kind: "info", text: "commands: status, validate, run, replay, trace, raw, guarded, log, rescue, reset" })
      );
      return;
    }
    if (command === "raw" || command === "guarded" || command === "log" || command === "rescue") {
      const nextMode: BoundaryMode =
        command === "raw" ? "raw" : command === "log" ? "log-domain candidate" : command === "rescue" ? "auto rescue" : "guarded";
      setBoundaryMode(nextMode);
      setBoundaryFrames([]);
      setBoundaryTerminal((current) => append(current, { kind: "ok", text: `mode set: ${modeLabel(nextMode)}` }));
      return;
    }
    if (command === "status") {
      setBoundaryTerminal((current) =>
        append(current, {
          kind: "info",
          text: `dim=${dimension} mode=${modeLabel(boundaryMode)} boundary=${Math.round(boundaryRatio * 100)}% finite=${Math.round(boundaryRun.packet.finite_survival_rate * 100)}%`
        })
      );
      return;
    }
    if (command === "validate") {
      setBoundaryTerminal((current) =>
        append(current, {
          kind: canRunTrace(useLabStore.getState().lab) ? "ok" : "warn",
          text: canRunTrace(useLabStore.getState().lab)
            ? "validation ready: shared simulator wiring can run the software boundary proxy"
            : "validation blocked: finish the base kit wiring first"
        })
      );
      return;
    }
    if (command === "run") {
      insertUsb();
      return;
    }
    if (command === "replay") {
      setBoundaryTerminal((current) =>
        append(current, {
          kind: boundaryFrames.length ? "ok" : "warn",
          text: boundaryFrames.length
            ? `Replay summary: boundary_demo_proxy\nframes: ${boundaryFrames.length}\nrescues: ${boundaryRun.packet.rescue_events}\nhardware_observed: false`
            : "no trace yet; run `run` first"
        })
      );
      return;
    }
    if (command === "trace") {
      setBoundaryTerminal((current) =>
        append(current, {
          kind: boundaryFrames.length ? "info" : "warn",
          text: boundaryFrames.length
            ? boundaryFrames.slice(0, 3).map((frame) => JSON.stringify(frame)).join(" | ")
            : "no trace yet; run `run` first"
        })
      );
      return;
    }
    if (command === "reset") {
      resetBench();
      return;
    }
    setBoundaryTerminal((current) => append(current, { kind: "warn", text: `unknown command: ${raw}` }));
  }

  function runAnalogCommand(raw: string) {
    const command = raw.trim().toLowerCase() || "help";
    setAnalogTerminal((current) => append(current, { kind: "input", text: `> ${raw}` }));
    if (command === "help") {
      setAnalogTerminal((current) => append(current, { kind: "info", text: "commands: status, validate, run, replay, reset" }));
      return;
    }
    if (command === "status") {
      setAnalogTerminal((current) =>
        append(current, {
          kind: "info",
          text: `pot_led=${analogSourceLedBrightness.toFixed(2)} ldr=${analogDecision.normalizedInput.toFixed(2)} cover=${ldrCoverAmount.toFixed(2)} error=${analogResponseError.toFixed(2)} state=${analogDecision.thresholdState} safe=${liveAnalogSafeOutput.toFixed(2)}`
        })
      );
      return;
    }
    if (command === "validate") {
      const ready = courseWiringReady(useLabStore.getState().lab);
      setAnalogTerminal((current) =>
        append(current, {
          kind: ready ? "ok" : "warn",
          text: ready ? "validation ready: GPIO34, GPIO35, GPIO25, 3V3, and GND are wired" : "validation blocked: finish the LDR divider and LED output"
        })
      );
      return;
    }
    if (command === "run") {
      insertUsb();
      return;
    }
    if (command === "replay") {
      setAnalogTerminal((current) =>
        append(current, {
          kind: liveModeActive ? "ok" : "warn",
          text: liveModeActive
            ? `Replay summary: analog_decision_v0\npot_led_brightness: ${analogSourceLedBrightness.toFixed(2)}\nldr_input: ${analogDecision.normalizedInput.toFixed(2)}\ncover_amount: ${ldrCoverAmount.toFixed(2)}\nresponse_error: ${analogResponseError.toFixed(2)}\nhardware_observed: false`
            : "no trace yet; run `run` first"
        })
      );
      return;
    }
    if (command === "reset") {
      resetBench();
      return;
    }
    setAnalogTerminal((current) => append(current, { kind: "warn", text: `unknown command: ${raw}` }));
  }

  function runEnvironmentCommand(raw: string) {
    const command = raw.trim().toLowerCase() || "help";
    setEnvironmentTerminal((current) => append(current, { kind: "input", text: `> ${raw}` }));
    if (command === "help") {
      setEnvironmentTerminal((current) => append(current, { kind: "info", text: "commands: status, validate, run, replay, stale, fresh, reset" }));
      return;
    }
    if (command === "stale") {
      setEnvironmentSensorStale(true);
      setEnvironmentTerminal((current) => append(current, { kind: "ok", text: "sensor_stale=true; fail-visible alert path requested" }));
      return;
    }
    if (command === "fresh") {
      setEnvironmentSensorStale(false);
      setEnvironmentTerminal((current) => append(current, { kind: "ok", text: "sensor_stale=false; proxy humidity input restored" }));
      return;
    }
    if (command === "status") {
      setEnvironmentTerminal((current) =>
        append(current, {
          kind: "info",
          text: `humidity=${environmentHumidityPct.toFixed(1)} temp=${environmentTemperatureC.toFixed(1)} state=${environmentStatus} stale=${environmentSensorStale} safe=${environmentSafeOutput.toFixed(2)} display="${environmentDisplayText}"`
        })
      );
      return;
    }
    if (command === "validate") {
      const ready = courseWiringReady(useLabStore.getState().lab);
      setEnvironmentTerminal((current) =>
        append(current, {
          kind: ready ? "ok" : "warn",
          text: ready
            ? "validation ready: humidity proxy, state LED, mute button, and alert buzzer are wired"
            : "validation blocked: finish the proxy input, LED output, button, and buzzer paths"
        })
      );
      return;
    }
    if (command === "run") {
      insertUsb();
      return;
    }
    if (command === "replay") {
      setEnvironmentTerminal((current) =>
        append(current, {
          kind: liveModeActive ? "ok" : "warn",
          text: liveModeActive
            ? `Replay summary: environment_guard_v0_proxy\nhumidity_pct: ${environmentHumidityPct.toFixed(1)}\ntemperature_c: ${environmentTemperatureC.toFixed(1)}\nstate: ${environmentStatus}\nsensor_stale: ${environmentSensorStale}\ndisplay: ${environmentDisplayText}\nhardware_observed: false\nbme280_observed: false\noled_observed: false`
            : "no trace yet; run `run` first"
        })
      );
      return;
    }
    if (command === "reset") {
      resetBench();
      return;
    }
    setEnvironmentTerminal((current) => append(current, { kind: "warn", text: `unknown command: ${raw}` }));
  }

  const boundaryMetrics = [
    { label: "wiring", value: canRunTrace(useLabStore.getState().lab) ? "ready" : "building" },
    { label: "dim", value: `${dimension}D` },
    { label: "mode", value: modeLabel(boundaryMode) },
    { label: "stress", value: boundaryStress.toFixed(2) }
  ];
  const analogMetrics = [
    { label: "wiring", value: analogReady ? "ready" : "building" },
    { label: "pot_led", value: analogSourceLedBrightness.toFixed(2) },
    { label: "ldr", value: analogDecision.normalizedInput.toFixed(2) },
    { label: "error", value: analogResponseError.toFixed(2) },
    { label: "buzz", value: buttonMuteActive ? "muted" : buzzerToneHz > 0 ? `${buzzerToneHz}Hz` : buzzerReady ? "silent" : "wire" },
    { label: "button", value: buttonControlReady ? (buttonPressed ? "pressed" : "open") : "wire" }
  ];
  const environmentMetrics = [
    { label: "wiring", value: environmentReady ? "ready" : "building" },
    { label: "hum", value: `${environmentHumidityPct.toFixed(1)}%` },
    { label: "temp", value: `${environmentTemperatureC.toFixed(1)}C` },
    { label: "state", value: environmentStatus },
    { label: "buzz", value: buttonMuteActive ? "muted" : buzzerToneHz > 0 ? `${buzzerToneHz}Hz` : buzzerReady ? "silent" : "wire" },
    { label: "stale", value: environmentSensorStale ? "true" : "false" }
  ];
  const nextChecklistStep = courseSteps.find((step) => !step.done(progressState));
  const cockpitChecklistSummary = {
    currentStep: nextChecklistStep?.shortInstruction ?? "Build complete",
    doneCount: courseSteps.filter((step) => step.done(progressState)).length,
    totalCount: courseSteps.length,
    stage: buzzerStageVisible ? "Lab 01B checklist" : "Lab 01A checklist"
  };

  const capstoneRows = isBoundary
    ? [
        { label: "dim", value: hasBenchReadoutValues ? `${dimension}D` : "n/a" },
        { label: "stress", value: hasBenchReadoutValues ? boundaryStress.toFixed(2) : "n/a" },
        { label: "mode", value: hasBenchReadoutValues ? modeLabel(boundaryMode) : "n/a" }
      ]
    : isAnalog
      ? [
          { label: "pot_led", value: hasBenchReadoutValues ? analogSourceLedBrightness.toFixed(2) : "n/a" },
          { label: "ldr", value: hasBenchReadoutValues ? analogDecision.normalizedInput.toFixed(2) : "n/a" },
          { label: "error", value: hasBenchReadoutValues ? analogResponseError.toFixed(2) : "n/a" },
          { label: "cover", value: hasBenchReadoutValues ? ldrCoverAmount.toFixed(2) : "n/a" },
          { label: "buzz", value: hasBenchReadoutValues ? (buttonMuteActive ? "muted" : buzzerToneHz > 0 ? `${buzzerToneHz}Hz` : buzzerReady ? "silent" : "wire") : "n/a" },
          { label: "button", value: hasBenchReadoutValues ? (buttonControlReady ? (buttonPressed ? "pressed" : "open") : "wire") : "n/a" },
          { label: "safe", value: hasBenchReadoutValues ? liveAnalogSafeOutput.toFixed(2) : "n/a" }
        ]
    : isEnvironment
      ? [
          { label: "hum", value: hasBenchReadoutValues ? `${environmentHumidityPct.toFixed(1)}%` : "n/a" },
          { label: "temp", value: hasBenchReadoutValues ? `${environmentTemperatureC.toFixed(1)}C` : "n/a" },
          { label: "state", value: hasBenchReadoutValues ? environmentStatus : "n/a" },
          { label: "stale", value: hasBenchReadoutValues ? (environmentSensorStale ? "true" : "false") : "n/a" },
          { label: "buzz", value: hasBenchReadoutValues ? (buttonMuteActive ? "muted" : buzzerToneHz > 0 ? `${buzzerToneHz}Hz` : buzzerReady ? "silent" : "wire") : "n/a" },
          { label: "safe", value: hasBenchReadoutValues ? environmentSafeOutput.toFixed(2) : "n/a" }
        ]
    : [
        { label: "pot", value: hasBenchReadoutValues ? effectivePotValue.toFixed(2) : "n/a" },
        { label: "safe", value: hasBenchReadoutValues ? liveReflexSafeOutput.toFixed(2) : "n/a" },
        { label: "guard", value: hasBenchReadoutValues ? (liveReflexGuardAction === "clamp_to_safe_output" ? "clamp" : "pass") : "n/a" },
        ...(buzzerStageVisible
          ? [{ label: "buzz", value: buttonMuteActive ? "muted" : buzzerToneHz > 0 ? `${buzzerToneHz}Hz` : buzzerReady ? "silent" : "wire" }]
          : []),
        ...(buzzerStageVisible ? [{ label: "button", value: buttonControlReady ? (buttonPressed ? "pressed" : "open") : "wire" }] : [])
      ];
  const checkBoardButtonLabel =
    boardCheckState === "checking"
      ? "Checking..."
      : boardCheckState === "passed" && !usbInserted
        ? "Board checked"
        : config.capstone.checkButton;
  const checkBoardDisabled = boardCheckState === "checking" || (boardCheckState === "passed" && !usbInserted);
  const primaryStageActionLabel =
    lab01BReadyToStart
      ? "Continue to Lab 01B"
      : firmwareUploaded && !isBoundary && !isAnalog && !isEnvironment
        ? "Disconnect USB"
        : firmwareUploaded
          ? "USB live"
          : usbInserted
            ? "Pin setup"
            : config.capstone.insertButton;
  const primaryStageActionDisabled =
    lab01BReadyToStart || (firmwareUploaded && !isBoundary && !isAnalog && !isEnvironment) ? false : boardCheckState !== "passed" || firmwareUploaded;
  const runPrimaryStageAction = () => {
    if (lab01BReadyToStart) {
      startLab01B();
      return;
    }
    if (firmwareUploaded && !isBoundary && !isAnalog && !isEnvironment && !buzzerStageVisible) {
      disconnectUsbBeforeLab01B();
      return;
    }
    if (firmwareUploaded && !isBoundary && !isAnalog && !isEnvironment) {
      disconnectUsbAfterRun();
      return;
    }
    if (usbInserted && !firmwareUploaded) {
      setPinSetupOpen(true);
      return;
    }
    insertUsb();
  };
  const syncInstructionSuggested = boardCheckMessage.toLowerCase().includes("sync for latest instruction");
  const reflexCourseComplete = !isBoundary && !isAnalog && !isEnvironment && buzzerStageVisible && buzzerReady;
  const courseCompletionVisible =
    !completionDismissed &&
    (boardCheckState === "passed" || liveModeActive) &&
    (isAnalog ? analogReady : isEnvironment ? environmentReady : reflexCourseComplete);
  const completionCopy = isAnalog
    ? {
        kicker: liveModeActive ? "Course 2 live" : "Circuit checked",
        title: liveModeActive ? "Analog decision loop is running." : "Analog decision circuit is complete.",
        detail: liveModeActive
          ? "Keep moving the pot, covering the LDR, and pressing mute to inspect LED drive, observed response, response-error alert, and guarded output. Exit when your notes are done."
          : "LED header, LDR divider, button, buzzer, GPIO34, GPIO35, GPIO25, GPIO27, GPIO26, 3V3, and GND are ready. Run setup when you want the dashboard stage."
      }
    : isEnvironment
      ? {
          kicker: liveModeActive ? "Course 3 live" : "Circuit checked",
          title: liveModeActive ? "Environmental guard proxy is running." : "Environmental guard proxy is complete.",
          detail: liveModeActive
            ? "Move the humidity proxy, toggle stale sensor state, and press mute while checking that display text, LED, buzzer, and trace agree."
            : "Humidity proxy, state LED, mute button, buzzer, GPIO34, GPIO25, GPIO27, GPIO26, 3V3, and GND are ready. Run setup when you want the dashboard stage."
        }
    : {
        kicker: liveModeActive ? "Course 1 live" : "Circuit checked",
        title: liveModeActive ? "Reflex Guard loop is running." : "Course 1 circuit is complete.",
        detail: liveModeActive
          ? "Keep moving the pot and pressing the button to inspect LED, buzzer, clamp, and mute behavior. Exit when you are ready for Lab 2 evidence work."
          : "LED, button, buzzer, GPIO34, GPIO25, GPIO27, GPIO26, 3V3, and GND are ready. Run setup when you want the dashboard stage."
      };
  const highlightedPartId = useMemo<TrainerPartId | null>(() => {
    if (!courseHighlight) return null;
    if (courseHighlight === "potentiometer") return "potentiometer";
    if (courseHighlight === "resistor") return "resistor";
    if (courseHighlight === "led") return "led";
    if (courseHighlight === "ldr") return "ldr";
    if (courseHighlight === "dividerResistor") return "dividerResistor";
    if (courseHighlight === "button") return "button";
    if (courseHighlight === "buzzer") {
      const instruction = topInstruction.toLowerCase();
      if (activePart === "buzzerResistor" || instruction.includes("1k") || instruction.includes("resistor")) {
        return "buzzerResistor";
      }
      return "buzzer";
    }
    return null;
  }, [activePart, courseHighlight, topInstruction]);
  const selectedToolLabel = removeMode
    ? "Remove mode"
    : jumperToolActive
      ? "Jumper wire selected"
      : activePart
        ? `${partLabelFor(activePart, config.parts?.labels)} selected`
        : "No part selected";

  return (
    <main
      className={`app-shell${benchMode ? " is-mobile-bench-mode" : ""}${schematicOpen ? " is-schematic-open" : ""}`}
      data-mobile-sheet={mobileSheetPanel ?? "none"}
    >
      <button className="mode-return-button" type="button" onClick={onBack}>
        {config.backTargetLabel}
      </button>
      <div className="bench-utility-dock" aria-label="Bench utilities">
        <button type="button" onClick={() => setChecklistOpen(true)}>
          <ListChecks aria-hidden="true" /> Checklist
        </button>
        <button type="button" onClick={shareBenchState}>
          <Share2 aria-hidden="true" /> Share
        </button>
        <button type="button" onClick={importBenchState}>
          <Upload aria-hidden="true" /> Import
        </button>
        <button type="button" onClick={resetPanelLayout}>
          Reset layout
        </button>
        <button
          type="button"
          className="mobile-bench-mode-button"
          aria-pressed={benchMode}
          onClick={() => {
            setCourseOpen(false);
            setChecklistOpen(false);
            setMobileSheetPanel(null);
            setBenchMode((current) => !current);
          }}
        >
          <Smartphone aria-hidden="true" /> {benchMode ? "Exit bench" : "Bench mode"}
        </button>
        <button
          type="button"
          className={soundEnabled ? "sound-toggle is-enabled" : "sound-toggle"}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          {soundEnabled ? "Sound on" : "Enable sound"}
        </button>
        {soundEnabled || audioStatus === "blocked" ? (
          <div className="sound-level-control" aria-label="Sound volume">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={soundLevel === level ? "is-active" : ""}
                aria-pressed={soundLevel === level}
                onClick={() => chooseSoundLevel(level)}
              >
                {level === "medium" ? "Med" : level[0].toUpperCase() + level.slice(1)}
              </button>
            ))}
            {audioStatus === "blocked" ? <span className="is-blocked">blocked</span> : null}
          </div>
        ) : null}
        <nav className="bottom-panel-dock" aria-label="Minimized bench panels">
          {([
            ["trainer", config.capstone.dockLabel],
            ["inventory", "Inventory"],
            ["dashboard", "Dashboard"]
          ] as const).map(([panel, label]) =>
            panelStates[panel] !== "open" ? (
              <button key={panel} type="button" onClick={() => setPanelState(panel, "open")}>
                {label}
              </button>
            ) : null
          )}
        </nav>
      </div>
      <LabScene
        activePart={activePart}
        checkAnimationActive={sceneAnimationActive}
        traceMode={sceneTraceMode}
        placedPartIds={placedPartIds}
        availablePartIds={availablePartIds}
        jumperColor={jumperColor}
        jumperToolActive={jumperToolActive}
        removeMode={removeMode}
        potValue={potValue}
        ledOutput={ledOutput}
        buzzerOutput={buzzerOutput}
        courseHighlight={courseHighlight}
        highlightedPartId={highlightedPartId}
        partLabels={config.parts?.labels}
        esp32PinLabels={config.parts?.esp32PinLabels}
        usbPowered={usbInserted}
        onActivePartChange={handleActivePartChange}
        onJumperToolSelect={handleJumperToolSelect}
        onActivePinMapChange={setActivePinMap}
        onComponentPinMapChange={setComponentPinMap}
        onPotValueChange={setPotValue}
        onCircuitWireStateChange={handleCircuitWireStateChange}
        onCircuitFaultStateChange={handleCircuitFaultStateChange}
        onPlacedPartIdsChange={setPlacedPartIds}
        onSupplyPinMapChange={setSupplyPinMap}
        onEffectivePotValueChange={(value) => {
          setEffectivePotValue(value);
        }}
        onHoleSelectSound={playHoleSelect}
        onPlacementSound={playWireSnap}
        onShortSound={playShortSpark}
        schematicAvailable={Boolean(config.schematic)}
        schematicOpen={schematicOpen}
        onSchematicToggle={() => setSchematicOpen((current) => !current)}
      />
      <section className="bench-stage-actions" aria-label="Current bench actions">
        <button type="button" onClick={checkBoard} disabled={checkBoardDisabled}>
          {checkBoardButtonLabel}
        </button>
        <button
          type="button"
          className={`${usbInserted || firmwareUploaded ? "is-powered" : "is-primary"}${primaryStageActionLabel.includes("Continue") ? " is-next-lab" : ""}`}
          onClick={runPrimaryStageAction}
          disabled={primaryStageActionDisabled}
        >
          {primaryStageActionLabel}
        </button>
      </section>
      {courseCompletionVisible ? (
        <section className="bench-completion-dock" aria-label="Course completion">
          <div>
            <span>{completionCopy.kicker}</span>
            <strong>{completionCopy.title}</strong>
            <p>{completionCopy.detail}</p>
          </div>
          <div className="bench-completion-actions">
            {!liveModeActive ? (
              <button type="button" className="is-primary" onClick={runPrimaryStageAction}>
                Run setup
              </button>
            ) : null}
            <button type="button" onClick={() => setCompletionDismissed(true)}>
              Keep experimenting
            </button>
            <button type="button" onClick={() => {
              setCompletionDismissed(true);
              setChecklistOpen(true);
            }}>
              Checklist
            </button>
            <button type="button" onClick={onBack}>
              Back to courses
            </button>
          </div>
        </section>
      ) : null}
      <section
        className={`bench-status-strip${usbInserted ? " is-usb-on" : ""}${firmwareUploaded ? " is-firmware-live" : ""}`}
        aria-label="Bench status and pot control"
      >
        <div className="bench-status-copy">
          <div className="bench-status-heading">
            <span>
              {boardCheckState === "checking"
                ? config.checkingStatusLabel
                : usbInserted
                  ? config.usbInsertedStatusLabel
                  : config.idleStatusLabel}
            </span>
            {syncInstructionSuggested ? (
              <button
                type="button"
                className="instruction-sync-button is-needed"
                aria-label="Get latest instruction from current build"
                title="Get latest instruction from current build"
                onClick={refreshCurrentInstruction}
              >
                <RefreshCw aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="bench-selected-tool" aria-live="polite">
            <span>Selected</span>
            <strong>{selectedToolLabel}</strong>
          </div>
          <strong>{topInstruction}</strong>
        </div>
        <div className="bench-status-pot">
          <div className="pot-control-header">
            <span>{isAnalog ? "POT A LED drive" : placedPartIds.has("potentiometer") ? config.inventory.placedPotControlLabel : config.inventory.potControlLabel}</span>
            <strong>{isEnvironment ? `${environmentHumidityPct.toFixed(1)}%` : potValue.toFixed(2)}</strong>
          </div>
          <input
            aria-label={isBoundary ? "Dimension knob value" : isAnalog ? "POT A LED drive value" : isEnvironment ? "Humidity proxy value" : "Potentiometer value"}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={potValue}
            onChange={(event) => setPotValue(Number(event.currentTarget.value))}
          />
          {isAnalog ? (
            <div className="bench-status-sensor">
              <div className="pot-control-header">
                <span>Cover LDR</span>
                <strong>{ldrCoverAmount.toFixed(2)}</strong>
              </div>
              <input
                aria-label="Cover LDR amount"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={ldrCoverAmount}
                onChange={(event) => setLdrCoverAmount(Number(event.currentTarget.value))}
              />
            </div>
          ) : null}
          {isEnvironment ? (
            <button
              type="button"
              className={environmentSensorStale ? "button-control is-pressed" : "button-control"}
              aria-pressed={environmentSensorStale}
              onClick={() => setEnvironmentSensorStale((current) => !current)}
            >
              <span>Sensor state</span>
              <strong>{environmentSensorStale ? "stale" : "fresh"}</strong>
            </button>
          ) : null}
          {buzzerStageVisible || isAnalog || isEnvironment ? (
            <button
              type="button"
              className={buttonPressed ? "button-control is-pressed" : "button-control"}
              aria-pressed={buttonPressed}
              disabled={!buttonControlReady}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setButtonPressed(true);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                setButtonPressed(false);
              }}
              onPointerCancel={() => setButtonPressed(false)}
              onPointerLeave={() => setButtonPressed(false)}
            >
              <span>BTN control</span>
              <strong>{buttonControlReady ? (buttonPressed ? "pressed" : "open") : "wire"}</strong>
            </button>
          ) : null}
        </div>
      </section>
      <CoursePanel
        open={courseOpen}
        selectedStep={courseStep}
        placedPartIds={placedPartIds}
        supplyPinMap={effectiveSupplyPinMap}
        componentPinMap={componentPinMap}
        wireState={labWires}
        steps={courseSteps}
        headerKicker={config.coursePanel.headerKicker}
        headerTitle={config.coursePanel.headerTitle}
        activeCardLabel={config.coursePanel.activeCardLabel}
        activeCardTitle={config.coursePanel.activeCardTitle}
        upcomingCard={config.coursePanel.upcomingCard}
        futureCards={config.coursePanel.futureCards}
        previewKernel={config.coursePanel.previewKernel}
        previewTitle={config.coursePanel.previewTitle}
        usbNote={config.coursePanel.usbNote}
        onOpenChange={setCourseOpen}
        onInstructionChange={setCourseInstruction}
        onStepChange={setCourseStep}
        onStepCheck={checkCourseStep}
        onHighlightChange={handleCourseHighlightChange}
        panelStates={panelStates}
        onPanelStateChange={setPanelState}
      />
      {schematicOpen && config.schematic ? (
        <SchematicPanel
          config={config.schematic}
          wireState={labWires}
          placedPartIds={placedPartIds}
          liveActive={liveModeActive}
          potValue={effectivePotValue}
          ldrValue={isAnalog ? analogDecision.normalizedInput : undefined}
          safeOutput={isEnvironment ? environmentSafeOutput : liveReflexSafeOutput}
          ledOutput={ledOutput}
          buzzerOutput={buzzerOutput}
          buttonPressed={buttonPressed}
          onPotValueChange={setPotValue}
          onButtonPressedChange={setButtonPressed}
          onClose={() => setSchematicOpen(false)}
        />
      ) : null}
      <LiveChecklistDrawer
        open={checklistOpen}
        progressState={progressState}
        releaseChecks={config.coursePanel.releaseChecks}
        releaseChecklistDone={releaseChecklistDone}
        selectedStep={courseStep}
        title={config.coursePanel.activeCardTitle}
        steps={courseSteps}
        onResync={refreshCurrentInstruction}
        onClose={() => setChecklistOpen(false)}
        onStepChange={(step) => {
          setCourseStep(step);
          setChecklistOpen(false);
        }}
        onToggleReleaseCheck={toggleReleaseCheck}
      />
      <PinSetupModal
        open={pinSetupOpen}
        courseId={config.id}
        buzzerUnlocked={buzzerStageVisible}
        buzzerReady={buzzerReady}
        canUpload={boardCheckState === "passed" && usbInserted}
        firmwareUploaded={firmwareUploaded}
        onClose={() => setPinSetupOpen(false)}
        onUpload={uploadSimulatedFirmware}
      />
      {dashboardVisible ? (
        <DashboardPanel
          kicker={config.dashboard.kicker}
          title={config.dashboard.title}
          variant={config.dashboard.variant}
          liveActive={!isBoundary && liveModeActive}
          buzzerOutput={buzzerOutput}
          buttonPressed={buttonPressed && buttonControlReady}
          metrics={isBoundary ? boundaryMetrics : isAnalog ? analogMetrics : isEnvironment ? environmentMetrics : undefined}
          terminalLines={isBoundary ? boundaryTerminal : isAnalog ? analogTerminal : isEnvironment ? environmentTerminal : undefined}
          suggestedCommand={isBoundary ? (boundaryFrames.length ? "replay" : "run") : isAnalog || isEnvironment ? (liveModeActive ? "replay" : "run") : undefined}
          signalSnapshot={
            isAnalog
              ? {
                  requestedOutput: analogRequestedOutput,
                  safeOutput: liveAnalogSafeOutput,
                  ledOutput: liveAnalogSafeOutput,
                  buzzerOutput,
                  sensorInput: analogDecision.normalizedInput,
                  guardAction: liveAnalogGuardAction,
                  safetyMargin: Math.max(0, 0.85 - liveAnalogSafeOutput)
                }
              : isEnvironment
                ? {
                    requestedOutput: environmentRequestedOutput,
                    safeOutput: environmentSafeOutput,
                    ledOutput: environmentSafeOutput,
                    buzzerOutput,
                    sensorInput: effectivePotValue,
                    guardAction: environmentGuardAction,
                    safetyMargin: Math.max(0, 0.85 - environmentSafeOutput)
                  }
              : undefined
          }
          onCommand={isBoundary ? runBoundaryCommand : isAnalog ? runAnalogCommand : isEnvironment ? runEnvironmentCommand : undefined}
          cockpitPhase={cockpitPhase}
          cockpitMode={cockpitMode}
          cockpitTab={cockpitTab}
          checkpoint={checkpointState}
          ghostTrace={ghostTrace}
          checklistSummary={cockpitChecklistSummary}
          onCockpitTabChange={handleCockpitTabChange}
          onCockpitModeChange={setCockpitMode}
          onOpenSchematic={() => {
            setCockpitTab("schematic");
            setSchematicOpen(true);
          }}
          onOpenChecklist={() => {
            setCockpitTab("checklist");
            setChecklistOpen(true);
          }}
          onFastRun={runFastDashboardPath}
          onCheckpointStep={markDashboardCheckpoint}
          onClose={() => {
            setMobileSheetPanel(null);
            setPanelState("dashboard", "hidden");
          }}
          onMinimize={() => {
            setMobileSheetPanel(null);
            setPanelState("dashboard", "minimized");
          }}
          style={compactViewport ? undefined : panelLayoutStyles.dashboard}
          onDragStart={compactViewport ? undefined : (event) => beginPanelInteraction("dashboard", "drag", event)}
          onResizeStart={compactViewport ? undefined : (event) => beginPanelInteraction("dashboard", "resize", event)}
        />
      ) : null}
      {panelStates.trainer === "open" && (!benchMode || mobileSheetPanel === "trainer") ? (
        <section className="capstone-panel" style={compactViewport ? undefined : panelLayoutStyles.trainer} aria-label={config.capstone.ariaLabel}>
          {!compactViewport ? (
            <button
              type="button"
              className="panel-drag-handle"
              aria-label="Move trainer controls panel"
              onPointerDown={(event) => beginPanelInteraction("trainer", "drag", event)}
            >
              Move
            </button>
          ) : null}
          <div className="panel-window-actions">
            <button type="button" aria-label="Minimize trainer board panel" onClick={() => {
              setMobileSheetPanel(null);
              setPanelState("trainer", "minimized");
            }}>
              <Minimize2 aria-hidden="true" />
            </button>
            <button type="button" aria-label="Hide trainer board panel" onClick={() => {
              setMobileSheetPanel(null);
              setPanelState("trainer", "hidden");
            }}>
              <X aria-hidden="true" />
            </button>
          </div>
          <div className={`capstone-oled${liveModeActive ? " is-live" : ""}`} aria-label={config.capstone.readoutLabel}>
            <span>{config.capstone.readoutLabel}</span>
            <strong>{liveModeActive ? config.capstone.liveKernel : usbInserted ? "pin setup" : config.capstone.waitingKernel}</strong>
            <dl>
              {capstoneRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="capstone-actions">
            <button type="button" className={removeMode ? "is-active" : ""} onClick={toggleRemoveMode}>
              {removeMode ? "Build mode" : config.capstone.removeButton}
            </button>
            <button type="button" onClick={undoLastBenchChange}>
              <Undo2 aria-hidden="true" /> Undo last
            </button>
            <button type="button" onClick={resetBench}>
              Reset bench
            </button>
          </div>
          {!compactViewport ? (
            <button
              type="button"
              className="panel-resize-handle"
              aria-label="Resize trainer controls panel"
              onPointerDown={(event) => beginPanelInteraction("trainer", "resize", event)}
            />
          ) : null}
        </section>
      ) : null}
      {panelStates.inventory === "open" && (!benchMode || mobileSheetPanel === "inventory") ? (
        <InventoryPanel
          activePart={activePart}
          placedPartIds={placedPartIds}
          availablePartIds={availablePartIds}
          activePinMap={activePinMap}
          jumperColor={jumperColor}
          jumperToolActive={jumperToolActive}
          potValue={potValue}
          highlightedPart={highlightedPartId}
          ariaLabel={config.inventory.ariaLabel}
          kicker={config.inventory.kicker}
          title={config.inventory.title}
          kitItems={inventoryKitItems}
          wiringReference={config.inventory.wiringReference}
          partLabels={config.parts?.labels}
          potControlLabel={config.inventory.potControlLabel}
          placedPotControlLabel={config.inventory.placedPotControlLabel}
          potSliderAriaLabel={isBoundary ? "Dimension knob value" : undefined}
          showPotControl={false}
          onActivePartChange={handleActivePartChange}
          onJumperColorChange={setJumperColor}
          onJumperToolSelect={handleJumperToolSelect}
          onPotValueChange={setPotValue}
          onClose={() => {
            setMobileSheetPanel(null);
            setPanelState("inventory", "hidden");
          }}
          onMinimize={() => {
            setMobileSheetPanel(null);
            setPanelState("inventory", "minimized");
          }}
          style={compactViewport ? undefined : panelLayoutStyles.inventory}
          onDragStart={compactViewport ? undefined : (event) => beginPanelInteraction("inventory", "drag", event)}
          onResizeStart={compactViewport ? undefined : (event) => beginPanelInteraction("inventory", "resize", event)}
        />
      ) : null}
      {benchMode ? (
        <nav className="mobile-bench-dock" aria-label="Mobile bench tools">
          <button type="button" onClick={() => openPanelFromBenchMode("inventory")}>
            Tools
          </button>
          <button type="button" onClick={() => setChecklistOpen(true)}>
            Checklist
          </button>
          <button type="button" onClick={() => openPanelFromBenchMode("trainer")}>
            Check
          </button>
          <button type="button" onClick={() => openPanelFromBenchMode("dashboard")}>
            Dash
          </button>
          <button type="button" onClick={shareBenchState}>
            Share
          </button>
          <button type="button" onClick={() => setBenchMode(false)}>
            Exit
          </button>
        </nav>
      ) : null}
      {shareMessage ? (
        <div className="bench-share-toast" role="status">
          <Clipboard aria-hidden="true" />
          <span>{shareMessage}</span>
        </div>
      ) : null}
    </main>
  );
}
