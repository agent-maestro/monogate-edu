import { AlertTriangle, CheckCircle2, CircleDashed, PlayCircle, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TrainerPartId } from "./trainerPartCatalog";
import type { CourseSchematicConfig } from "./simulatorCourses";
import { analogDecisionParams, thresholdParams, type WireId } from "../engine/labEngine";

type SchematicPanelProps = {
  config: CourseSchematicConfig;
  wireState: Partial<Record<WireId, boolean>>;
  placedPartIds: Set<TrainerPartId>;
  liveActive: boolean;
  potValue: number;
  ldrValue?: number;
  safeOutput: number;
  ledOutput: number;
  buzzerOutput: number;
  buttonPressed: boolean;
  onPotValueChange: (value: number) => void;
  onButtonPressedChange: (pressed: boolean) => void;
  onClose: () => void;
};

type BranchStatus = "connected" | "partial" | "missing";

type BranchAnalysis = CourseSchematicConfig["branches"][number] & {
  complete: boolean;
  started: boolean;
  status: BranchStatus;
  displayLabel: string;
  liveValue: string;
};

type SchematicFocusId = "full" | "power-rails" | "pot-divider" | "ldr-divider" | "guarded-led" | "button-input" | "buzzer-output";
type SchematicViewMode = "live" | "build";

const branchDisplayLabels: Record<string, string> = {
  "power-rails": "Power rails",
  "pot-divider": "Pot input",
  "ldr-divider": "LDR divider input",
  "guarded-led": "Guarded LED output",
  "button-input": "Button mute input",
  "buzzer-output": "Buzzer output"
};

const schematicFocusOptions: { id: SchematicFocusId; label: string; viewBox: string; summary: string }[] = [
  {
    id: "full",
    label: "Full Circuit",
    viewBox: "-40 -30 1180 840",
    summary: "All branch paths visible."
  },
  {
    id: "power-rails",
    label: "Power",
    viewBox: "275 54 520 250",
    summary: "ESP32 3V3 and GND establish the reference rails."
  },
  {
    id: "pot-divider",
    label: "Pot",
    viewBox: "286 104 520 330",
    summary: "The 10K potentiometer creates the GPIO34 ADC voltage."
  },
  {
    id: "ldr-divider",
    label: "LDR",
    viewBox: "260 70 650 560",
    summary: "The LDR and 10K resistor create the GPIO35 analog light-sense voltage."
  },
  {
    id: "guarded-led",
    label: "LED",
    viewBox: "282 352 670 260",
    summary: "GPIO25 drives the guarded LED output through 330 ohms."
  },
  {
    id: "button-input",
    label: "Button",
    viewBox: "282 510 520 270",
    summary: "GPIO27 uses INPUT_PULLUP; pressing the button pulls it to GND."
  },
  {
    id: "buzzer-output",
    label: "Buzzer",
    viewBox: "282 432 700 270",
    summary: "GPIO26 drives the piezo through the 1K series resistor."
  }
];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function guardedSteadyOutput(potRaw: number) {
  const centered = (clamp01(potRaw) - thresholdParams.threshold) / thresholdParams.width;
  const requested = clamp01(centered + 0.5);
  return Math.min(requested, thresholdParams.safeOutputLimit);
}

function analogDecisionPreviewOutput(rawInput: number) {
  const normalizedInput = clamp01(rawInput);
  if (normalizedInput >= analogDecisionParams.onThreshold) return analogDecisionParams.safeOutputLimit;
  if (normalizedInput <= analogDecisionParams.offThreshold) return 0;
  return analogDecisionParams.safeOutputLimit * 0.45;
}

function branchComplete(
  branch: CourseSchematicConfig["branches"][number],
  wireState: Partial<Record<WireId, boolean>>,
  placedPartIds: Set<TrainerPartId>
) {
  const wiresOk = (branch.wireIds ?? []).every((wire) => Boolean(wireState[wire]));
  const partsOk = (branch.partIds ?? []).every((part) => placedPartIds.has(part));
  return wiresOk && partsOk;
}

function branchStarted(
  branch: CourseSchematicConfig["branches"][number],
  wireState: Partial<Record<WireId, boolean>>,
  placedPartIds: Set<TrainerPartId>
) {
  return (branch.wireIds ?? []).some((wire) => Boolean(wireState[wire])) || (branch.partIds ?? []).some((part) => placedPartIds.has(part));
}

function branchValue(
  id: string,
  values: Pick<SchematicPanelProps, "potValue" | "safeOutput" | "ledOutput" | "buzzerOutput" | "buttonPressed">,
  ldrValue: number,
  mode: "reflex" | "analog" | "environment"
) {
  if (id === "pot-divider") {
    if (mode === "analog") return `GPIO34 LED drive ${values.potValue.toFixed(2)}`;
    if (mode === "environment") return `humidity proxy ${(35 + values.potValue * 60).toFixed(1)}%`;
    return `ADC ${values.potValue.toFixed(2)} / ${(values.potValue * 3.3).toFixed(2)} V`;
  }
  if (id === "ldr-divider") return `GPIO35 from LED header ${ldrValue.toFixed(2)} / ${(ldrValue * 3.3).toFixed(2)} V`;
  if (id === "guarded-led") {
    const previewLed =
      mode === "environment"
        ? values.ledOutput
        : Math.max(values.ledOutput, mode === "analog" ? analogDecisionPreviewOutput(ldrValue) : guardedSteadyOutput(values.potValue));
    return `safe ${previewLed.toFixed(2)} / LED ${previewLed.toFixed(2)}`;
  }
  if (id === "button-input") return values.buttonPressed ? "GPIO27 low" : "GPIO27 high";
  if (id === "buzzer-output") {
    if (mode === "analog" || mode === "environment") {
      const previewBuzzer = values.buttonPressed ? 0 : values.buzzerOutput;
      return previewBuzzer > 0.02 ? `buzz ${previewBuzzer.toFixed(2)}` : "silent";
    }
    const previewLed = Math.max(values.ledOutput, guardedSteadyOutput(values.potValue));
    const previewBuzzer = values.buttonPressed ? 0 : Math.max(values.buzzerOutput, Math.max(0, Math.min(1, (previewLed - 0.55) / 0.3)));
    return previewBuzzer > 0.02 ? `buzz ${previewBuzzer.toFixed(2)}` : "muted";
  }
  return "";
}

function statusLabel(status: BranchStatus) {
  if (status === "connected") return "Connected";
  if (status === "partial") return "Partial";
  return "Needs work";
}

function StatusIcon({ status }: { status: BranchStatus }) {
  if (status === "connected") return <CheckCircle2 aria-hidden="true" />;
  if (status === "partial") return <AlertTriangle aria-hidden="true" />;
  return <XCircle aria-hidden="true" />;
}

function WirePath({ d, className = "" }: { d: string; className?: string }) {
  return <path className={`schematic-wire${className ? ` ${className}` : ""}`} d={d} />;
}

function Node({ cx, cy, label, className = "" }: { cx: number; cy: number; label?: string; className?: string }) {
  return (
    <>
      <circle className={`schematic-node${className ? ` ${className}` : ""}`} cx={cx} cy={cy} r="5" />
      {label ? (
        <text className="schematic-node-label" x={cx + 10} y={cy + 4}>
          {label}
        </text>
      ) : null}
    </>
  );
}

function ResistorSymbol({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="schematic-symbol schematic-resistor">
      <path d={`M${x} ${y} h18 l8 -14 l16 28 l16 -28 l16 28 l16 -28 l8 14 h34`} />
      <text x={x + 40} y={y - 22}>
        {label}
      </text>
    </g>
  );
}

function LedSymbol({ x, y, level = 0 }: { x: number; y: number; level?: number }) {
  const glowOpacity = Math.min(0.72, 0.08 + level * 0.64);
  const glowRadius = 18 + level * 28;

  return (
    <g className={`schematic-symbol schematic-led${level > 0.02 ? " is-lit" : ""}`}>
      {level > 0.02 ? (
        <>
          <circle className="schematic-led-glow" cx={x + 48} cy={y} r={glowRadius} opacity={glowOpacity} />
          <circle className="schematic-led-core" cx={x + 48} cy={y} r={5 + level * 6} opacity={0.34 + level * 0.52} />
        </>
      ) : null}
      <path d={`M${x} ${y} h25`} />
      <path d={`M${x + 25} ${y - 18} v36 l34 -18 z`} />
      <path d={`M${x + 65} ${y - 20} v40`} />
      <path d={`M${x + 65} ${y} h25`} />
      <path className="schematic-led-arrow" d={`M${x + 52} ${y - 30} l22 -22`} />
      <path className="schematic-led-arrow" d={`M${x + 66} ${y - 28} l22 -22`} />
      <text x={x + 18} y={y + 48}>
        LED
      </text>
    </g>
  );
}

function PotSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g className="schematic-symbol schematic-pot">
      <path d={`M${x} ${y - 68} v18`} />
      <path d={`M${x - 12} ${y - 50} l24 12 l-24 12 l24 12 l-24 12 l24 12 l-24 12 l24 12`} />
      <path d={`M${x} ${y + 34} v18`} />
      <path className="schematic-wiper" d={`M${x + 54} ${y - 2} l-38 20`} />
      <circle cx={x + 54} cy={y - 2} r="4" />
      <text x={x - 62} y={y - 72}>
        10K POT
      </text>
    </g>
  );
}

function LdrSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g className="schematic-symbol schematic-ldr">
      <path d={`M${x} ${y - 92} v48`} />
      <circle cx={x} cy={y} r="42" />
      <path d={`M${x} ${y + 44} v48`} />
      <path d={`M${x - 22} ${y - 26} h16 v16 h22 v20 h-22 v20 h28`} />
      <path className="schematic-led-arrow" d={`M${x - 72} ${y - 56} l32 32`} />
      <path className="schematic-led-arrow" d={`M${x - 86} ${y - 18} l32 32`} />
      <text x={x - 36} y={y + 70}>
        LDR
      </text>
    </g>
  );
}

function ButtonSymbol({ x, y, pressed = false }: { x: number; y: number; pressed?: boolean }) {
  return (
    <g className={`schematic-symbol schematic-button-symbol${pressed ? " is-pressed" : ""}`}>
      <path d={`M${x} ${y} h36`} />
      <path d={`M${x + 56} ${y} h42`} />
      <circle cx={x + 36} cy={y} r="4" />
      <circle cx={x + 56} cy={y} r="4" />
      <path
        className={`schematic-button-armature${pressed ? " is-closed" : " is-open"}`}
        d={pressed ? `M${x + 39} ${y - 3} L${x + 56} ${y}` : `M${x + 39} ${y - 8} L${x + 56} ${y - 18}`}
      />
      <text x={x + 6} y={y + 42}>
        PUSH BUTTON
      </text>
    </g>
  );
}

function PiezoSymbol({ x, y, active = false }: { x: number; y: number; active?: boolean }) {
  return (
    <g className={`schematic-symbol schematic-piezo${active ? " is-buzzing" : ""}`}>
      <path d={`M${x} ${y} h34`} />
      <path d={`M${x + 34} ${y - 25} v50`} />
      <path className="schematic-piezo-wave" d={`M${x + 42} ${y - 18} q28 18 0 36`} />
      <path className="schematic-piezo-wave is-outer" d={`M${x + 56} ${y - 28} q44 28 0 56`} />
      <text x={x + 4} y={y + 50}>
        PIEZO
      </text>
    </g>
  );
}

export function SchematicPanel({
  config,
  wireState,
  placedPartIds,
  liveActive,
  potValue,
  ldrValue,
  safeOutput,
  ledOutput,
  buzzerOutput,
  buttonPressed,
  onPotValueChange,
  onButtonPressedChange,
  onClose
}: SchematicPanelProps) {
  const [checkActive, setCheckActive] = useState(false);
  const [checkPulse, setCheckPulse] = useState(false);
  const [activeSignal, setActiveSignal] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<SchematicFocusId>("full");
  const [viewMode, setViewMode] = useState<SchematicViewMode>(liveActive ? "live" : "build");
  const hasLdrDivider = config.branches.some((branch) => branch.id === "ldr-divider");
  const schematicMode = hasLdrDivider ? "analog" : config.kicker === "Environmental Guard" ? "environment" : "reflex";
  const hasButtonInput = config.branches.some((branch) => branch.id === "button-input");
  const hasBuzzerOutput = config.branches.some((branch) => branch.id === "buzzer-output");
  const schematicLdrValue = ldrValue ?? potValue;
  const adcVoltage = potValue * 3.3;
  const previewOutput = schematicMode === "environment" ? safeOutput : hasLdrDivider ? analogDecisionPreviewOutput(schematicLdrValue) : guardedSteadyOutput(potValue);
  const schematicLedLevel = liveActive ? Math.max(ledOutput, safeOutput) : Math.max(ledOutput, previewOutput);
  const schematicBuzzerLevel = hasBuzzerOutput && !buttonPressed ? Math.max(buzzerOutput, Math.max(0, Math.min(1, (schematicLedLevel - 0.55) / 0.3))) : 0;
  const buzzerActive = schematicBuzzerLevel > 0.02;
  const branches = useMemo<BranchAnalysis[]>(
    () =>
      config.branches.map((branch) => {
        const complete = branchComplete(branch, wireState, placedPartIds);
        const started = branchStarted(branch, wireState, placedPartIds);
        return {
          ...branch,
          complete,
          started,
          status: complete ? "connected" : started ? "partial" : "missing",
          displayLabel: branchDisplayLabels[branch.id] ?? branch.label,
          liveValue: branchValue(branch.id, { potValue, safeOutput, ledOutput, buzzerOutput, buttonPressed }, schematicLdrValue, schematicMode)
        };
      }),
    [buttonPressed, buzzerOutput, config.branches, hasLdrDivider, ledOutput, placedPartIds, potValue, safeOutput, schematicLdrValue, wireState]
  );
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const completedBranches = branches.filter((branch) => branch.complete);
  const focusedBranch = focusId === "full" ? null : branchById.get(focusId);
  const visibleBranches = focusedBranch ? [focusedBranch] : branches;
  const visibleFocusOptions = schematicFocusOptions.filter((option) => option.id === "full" || branchById.has(option.id));
  const focusConfig = visibleFocusOptions.find((option) => option.id === focusId) ?? visibleFocusOptions[0] ?? schematicFocusOptions[0];
  const progressLabel = `${completedBranches.length}/${branches.length} Branches Connected`;
  const incompleteBranches = branches.filter((branch) => !branch.complete);
  const boardCheckState = completedBranches.length === branches.length ? "ready" : checkActive ? "incomplete" : "unchecked";
  const buildCheckActive = viewMode === "build" && checkActive;
  const liveVisualComplete = viewMode === "live" && (liveActive || completedBranches.length === branches.length);
  const boardCheckHeadline =
    boardCheckState === "ready"
      ? "Ready for USB"
      : boardCheckState === "incomplete"
        ? "Not broken - keep building"
        : "Board check not run";
  const statusSummary =
    boardCheckState === "ready"
      ? `${progressLabel}. Schematic matches the simulator wiring.`
      : boardCheckState === "incomplete"
        ? `${progressLabel}. This is an incomplete build check, not a damage warning.`
        : "Press Check My Board to compare this schematic against the simulator wiring.";
  const progressModeLabel = viewMode === "live" ? "Live circuit" : "Board check";
  const progressModeState = viewMode === "live" ? "live" : boardCheckState;
  const progressHeadline =
    viewMode === "live"
      ? liveActive
        ? "Powered view running"
        : "Powered view ready"
      : boardCheckHeadline;
  const progressSummary =
    viewMode === "live"
      ? liveActive
        ? "Pot, button, LED, and buzzer values update here without running the board-check animation."
        : "Stable full-build view. Use Build Check when you want the schematic to compare against simulator wiring."
      : statusSummary;
  const progressFootnote = viewMode === "live" ? "Branch colors stay stable in live view." : focusConfig.summary;

  useEffect(() => {
    if (!checkPulse) return undefined;
    const timer = window.setTimeout(() => setCheckPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [checkPulse]);

  useEffect(() => {
    if (!activeSignal) return undefined;
    const timer = window.setTimeout(() => setActiveSignal(null), 900);
    return () => window.clearTimeout(timer);
  }, [activeSignal]);

  useEffect(() => {
    if (liveActive) {
      setViewMode("live");
    }
  }, [liveActive]);

  function runBoardCheck() {
    setViewMode("build");
    setCheckActive(true);
    setCheckPulse(true);
  }

  function classForBranch(id: string) {
    const branch = branchById.get(id);
    const status = liveVisualComplete ? "connected" : (branch?.status ?? "missing");
    const focused = focusId !== "full" && focusId === id;
    return `schematic-circuit-branch is-${id} is-${status}${activeSignal === id ? " is-live-focus" : ""}${focused ? " is-focused" : ""}`;
  }

  function updatePot(nextValue: number) {
    setActiveSignal("pot-divider");
    onPotValueChange(nextValue);
  }

  function toggleButton() {
    setActiveSignal("button-input");
    onButtonPressedChange(!buttonPressed);
  }

  return (
    <section
      className={`schematic-panel${checkPulse ? " is-checking" : ""}`}
      aria-label={`${config.title} schematic`}
      data-check-active={buildCheckActive ? "true" : "false"}
      data-focus={focusId}
      data-schematic-view={viewMode}
    >
      <header className="schematic-panel-header">
        <div className="schematic-title-block">
          <p>{config.kicker}</p>
          <h2>{config.title}</h2>
          <span>{config.description}</span>
          <div className="schematic-view-tabs" aria-label="Schematic view mode">
            <button
              type="button"
              className={viewMode === "live" ? "is-active" : ""}
              aria-pressed={viewMode === "live"}
              onClick={() => setViewMode("live")}
            >
              Live Circuit
            </button>
            <button
              type="button"
              className={viewMode === "build" ? "is-active" : ""}
              aria-pressed={viewMode === "build"}
              onClick={() => setViewMode("build")}
            >
              Build Check
            </button>
          </div>
          <div className="schematic-focus-tabs" aria-label="Schematic focus controls">
            {visibleFocusOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={focusId === option.id ? "is-active" : ""}
                aria-pressed={focusId === option.id}
                onClick={() => setFocusId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="schematic-header-actions">
          <button type="button" className={`schematic-check-button${checkPulse ? " is-running" : ""}`} onClick={runBoardCheck}>
            <PlayCircle aria-hidden="true" />
            Check My Board
          </button>
          <button type="button" className="schematic-close-button" aria-label="Close schematic" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="schematic-workspace">
        <div className="schematic-blueprint" data-live={liveActive ? "true" : "false"}>
          <svg viewBox={focusConfig.viewBox} role="img" aria-label={progressLabel} preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="schematic-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" />
              </pattern>
              <filter id="schematic-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker id="schematic-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" />
              </marker>
            </defs>
            <rect className="schematic-grid-fill" x="-40" y="-30" width="1180" height="840" />
            <text className="schematic-page-label" x="38" y="44">
              {config.kicker} - {config.title}
            </text>
            <text className="schematic-page-note" x="38" y="66">
              Symbol view: breadboard jumpers are condensed into circuit branch paths.
            </text>

            <g className="schematic-rail is-3v3">
              <path d="M86 96 H1030" />
              <text x="96" y="82">
                3V3 rail
              </text>
            </g>
            <g className="schematic-rail is-gnd">
              <path d="M86 724 H1030" />
              <text x="96" y="710">
                GND rail
              </text>
            </g>

            <g className="schematic-esp32">
              <rect x="50" y="162" width="260" height="450" rx="12" />
              <text x="78" y="212">
                ESP32 DevKit
              </text>
              <text x="76" y="244">
                3V3
              </text>
              <text x="76" y="302">
                GND
              </text>
              <text x="76" y="368">
                GPIO34 ADC
              </text>
              <text x="76" y="438">
                GPIO25 PWM
              </text>
              <text x="76" y="510">
                {hasLdrDivider ? "GPIO35 ADC" : "GPIO26 PWM"}
              </text>
              {hasButtonInput ? (
                <text x="76" y="580">
                  GPIO27 INPUT_PULLUP
                </text>
              ) : null}
              <Node cx={310} cy={240} />
              <Node cx={310} cy={302} />
              <Node cx={310} cy={368} />
              <Node cx={310} cy={438} />
              <Node cx={310} cy={510} />
              {hasButtonInput ? <Node cx={310} cy={580} /> : null}
            </g>

            <g className={classForBranch("power-rails")}>
              <WirePath className="is-power-wire" d="M310 240 H350 V96" />
              <WirePath className="is-ground-wire" d="M310 302 H332 V724" />
              <Node cx={350} cy={96} label="3V3" className="is-power-node" />
              <Node cx={332} cy={724} label="GND" className="is-ground-node" />
              <rect className="schematic-status-badge" x="382" y="118" width="124" height="38" rx="7" />
              <text className="schematic-status-label" x="396" y="142">
                Power rails
              </text>
            </g>

            <g className={classForBranch("pot-divider")}>
              <WirePath className="is-pot-supply is-pot-3v3-wire" d="M492 96 V236" />
              <WirePath className="is-pot-supply is-pot-ground-wire" d="M492 320 V724" />
              <WirePath d="M546 284 H374 V368 H310" />
              <PotSymbol x={492} y={286} />
              <Node cx={492} cy={236} className="is-pot-3v3-node" />
              <Node cx={492} cy={320} className="is-pot-ground-node" />
              <Node cx={492} cy={96} />
              <Node cx={492} cy={724} />
              <Node cx={310} cy={368} />
              <text className="schematic-live-value" x="570" y="274">
                {branchById.get("pot-divider")?.liveValue}
              </text>
              <text className="schematic-adc-voltage" x="344" y="350">
                GPIO34 sees {adcVoltage.toFixed(2)} V
              </text>
            </g>

            {hasLdrDivider ? (
              <g className={classForBranch("ldr-divider")}>
                <WirePath d="M760 96 V158" />
                <LdrSymbol x={760} y={250} />
                <WirePath d="M760 342 V510 H610" />
                <WirePath d="M310 510 H610" />
                <ResistorSymbol x={610} y={510} label="10K" />
                <WirePath d="M732 510 H796 V724" />
                <Node cx={760} cy={96} label="3V3" />
                <Node cx={610} cy={510} label="GPIO35" />
                <Node cx={796} cy={724} label="GND" />
                <text className="schematic-live-value" x="762" y="488">
                  {branchById.get("ldr-divider")?.liveValue}
                </text>
              </g>
            ) : null}

            <g className="schematic-guard-block">
              <path className="schematic-logic-wire" d="M574 284 H676" markerEnd="url(#schematic-arrow)" />
              <rect x="680" y="240" width="150" height="88" rx="10" />
              <text x="710" y="276">
                EML
              </text>
              <text x="706" y="302">
                GUARD
              </text>
            </g>

            <g className={classForBranch("guarded-led")}>
              <WirePath d="M310 438 H405" />
              <ResistorSymbol x={405} y={438} label="330 ohm" />
              <WirePath d="M517 438 H610" />
              <LedSymbol x={610} y={438} level={schematicLedLevel} />
              <WirePath d="M700 438 H778 V724" />
              <Node cx={310} cy={438} />
              <Node cx={778} cy={724} />
              <text className="schematic-live-value" x="790" y="434">
                {branchById.get("guarded-led")?.liveValue}
              </text>
            </g>

            {hasBuzzerOutput ? (
              <g className={classForBranch("buzzer-output")}>
                <WirePath d="M310 510 H405" />
                <ResistorSymbol x={405} y={510} label="1K" />
                <WirePath d="M517 510 H635" />
                <PiezoSymbol x={635} y={510} active={buzzerActive} />
                <WirePath d="M735 510 H834 V724" />
                <Node cx={310} cy={510} />
                <Node cx={834} cy={724} />
                <text className="schematic-live-value" x="846" y="506">
                  {branchById.get("buzzer-output")?.liveValue}
                </text>
              </g>
            ) : null}

            {hasButtonInput ? (
              <g className={classForBranch("button-input")}>
                <WirePath d="M310 580 H410" />
                <ButtonSymbol x={410} y={580} pressed={buttonPressed} />
                <WirePath d="M508 580 H604 V724" />
                <Node cx={310} cy={580} />
                <Node cx={604} cy={724} />
                <text className="schematic-live-value" x="616" y="574">
                  {branchById.get("button-input")?.liveValue}
                </text>
              </g>
            ) : null}

            <g className="schematic-output-labels">
              <path d="M830 284 H930 V438 H797" />
              {hasBuzzerOutput ? <path d="M830 298 H965 V510 H765" /> : null}
              <text x="852" y="268">
                logical guard output
              </text>
            </g>
          </svg>
        </div>

        <aside className="schematic-status-sidebar" aria-live="polite">
          <div className="schematic-live-controls">
            <section className="schematic-control-card">
              <div className="schematic-control-heading">
                <span>{hasLdrDivider ? "Live LED Drive Control" : "Live Potentiometer Control"}</span>
                <strong>{potValue.toFixed(2)}</strong>
              </div>
              <label htmlFor="schematic-pot-control">{hasLdrDivider ? "POT A LED drive" : "10K Pot Position"}</label>
              <input
                id="schematic-pot-control"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={potValue}
                onChange={(event) => updatePot(Number(event.currentTarget.value))}
              />
              <p>{hasLdrDivider ? "Sets the LED brightness. The LDR divider reports the sensed brightness at GPIO35." : "Updates the GPIO34 ADC label and pot input branch."}</p>
              <output>{hasLdrDivider ? `LED drive ${potValue.toFixed(2)}` : `${adcVoltage.toFixed(2)} V at GPIO34`}</output>
            </section>
            {hasLdrDivider ? (
              <section className="schematic-control-card">
                <div className="schematic-control-heading">
                  <span>LDR Sensor Readout</span>
                  <strong>{schematicLdrValue.toFixed(2)}</strong>
                </div>
                <p>The LDR is not a second circuit knob. It follows the pot-driven LED brightness and drops when the sensor is covered.</p>
                <output>LDR reads {(schematicLdrValue * 3.3).toFixed(2)} V at GPIO35</output>
              </section>
            ) : null}
            {hasButtonInput ? (
              <section className="schematic-control-card">
                <div className="schematic-control-heading">
                  <span>Live Button Control</span>
                  <strong>{buttonPressed ? "pressed" : "released"}</strong>
                </div>
                <button type="button" className={buttonPressed ? "is-pressed" : ""} aria-pressed={buttonPressed} onClick={toggleButton}>
                  Push Button
                </button>
                <p>{buttonPressed ? "GPIO27 is pulled low; firmware mutes only the buzzer branch." : "GPIO27 is held high; firmware may allow buzzer output when the guard requests it."}</p>
              </section>
            ) : null}
            <section className="schematic-control-card is-output-monitor">
              <div className="schematic-control-heading">
                <span>Live Output Monitor</span>
                <strong>{buzzerActive ? "buzzing" : schematicLedLevel > 0.02 ? "lit" : "idle"}</strong>
              </div>
              <p>{hasBuzzerOutput ? "LED brightness follows the guarded output. Piezo waves animate only when the buzzer output is active." : "Decision LED brightness follows the guarded analog output preview."}</p>
              <output>
                LED {schematicLedLevel.toFixed(2)}
                {hasBuzzerOutput ? ` / buzzer ${schematicBuzzerLevel.toFixed(2)}` : ""}
              </output>
            </section>
          </div>
          <div className="schematic-progress-card" data-check-state={progressModeState}>
            <span>{progressModeLabel}</span>
            <strong>{progressHeadline}</strong>
            <p>{progressSummary}</p>
            {buildCheckActive && incompleteBranches.length > 0 ? (
              <div className="schematic-next-branches" aria-label="Branches that still need attention">
                <span>Needs attention</span>
                {incompleteBranches.map((branch) => (
                  <mark key={branch.id} className={`is-${branch.status}`}>
                    {branch.displayLabel}: {branch.status === "partial" ? "partially wired" : "not detected"}
                  </mark>
                ))}
              </div>
            ) : null}
            <small>{progressFootnote}</small>
          </div>
          <div className="schematic-branch-list">
            {visibleBranches.map((branch) => (
              <article
                key={branch.id}
                className={`schematic-branch-card is-${liveVisualComplete ? "connected" : branch.status}${activeSignal === branch.id ? " is-live-focus" : ""}`}
              >
                <div>
                  <StatusIcon status={liveVisualComplete ? "connected" : branch.status} />
                  <span>{statusLabel(liveVisualComplete ? "connected" : branch.status)}</span>
                </div>
                <strong>{branch.displayLabel}</strong>
                <p>{branch.detail}</p>
                <small>{branch.teachingNote}</small>
                {branch.liveValue ? <em>{branch.liveValue}</em> : null}
              </article>
            ))}
          </div>
          <div className="schematic-legend">
            <span><CheckCircle2 aria-hidden="true" /> green: complete</span>
            <span><AlertTriangle aria-hidden="true" /> yellow: partial</span>
            <span><CircleDashed aria-hidden="true" /> red dashed: missing</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
