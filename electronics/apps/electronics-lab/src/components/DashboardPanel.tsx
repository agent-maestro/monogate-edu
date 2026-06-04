import { type CSSProperties, FormEvent, type PointerEventHandler, useEffect, useMemo, useState } from "react";
import { Activity, Minimize2, Radio, TerminalSquare, X } from "lucide-react";
import { analyzeLab, runThresholdReflex, thresholdParams, wiringComplete } from "../engine/labEngine";
import { getLabEventHistory, subscribeLabEvents, type LabLiveEvent } from "../engine/liveEvents";
import { useLabStore } from "../store";

type LiveSignalPoint = {
  id: number;
  potRaw: number;
  requestedOutput: number;
  safeOutput: number;
  ledOutput: number;
  buzzerOutput: number;
  sensorInput?: number;
  clampActive: boolean;
};

export type DashboardGhostPoint = Omit<LiveSignalPoint, "id"> & { id?: number };

export type DashboardCockpitPhase =
  | "bench_idle"
  | "running"
  | "bench_with_history"
  | "bench_01b_unlocked"
  | "running_with_history";

export type DashboardCockpitTab = "schematic" | "checklist" | "trace" | "serial" | "evidence";
export type DashboardCockpitMode = "guided" | "fast";

export type DashboardCheckpointState = {
  snapshotSaved: boolean;
  usbDisconnected: boolean;
  returnedToSchematic: boolean;
  lab01bUnlocked: boolean;
};

type DashboardSignalSnapshot = {
  requestedOutput: number;
  safeOutput: number;
  ledOutput: number;
  buzzerOutput?: number;
  sensorInput?: number;
  guardAction: string;
  safetyMargin?: number;
};

function commandPrompt(labReady: boolean, frameCount: number): string {
  if (!labReady) return "status";
  if (frameCount === 0) return "validate";
  return "replay";
}

function runLiveReflexPreview(potRaw: number) {
  const centered = (Math.max(0, Math.min(1, potRaw)) - thresholdParams.threshold) / thresholdParams.width;
  const target = Math.max(0, Math.min(1, centered + 0.5));
  const requestedOutput = target;
  const safeOutput = Math.min(requestedOutput, thresholdParams.safeOutputLimit);
  const safetyMargin = Math.max(0, Math.min(thresholdParams.safeOutputLimit, thresholdParams.safeOutputLimit - safeOutput));

  return {
    centered,
    target,
    requestedOutput,
    safeOutput,
    safetyMargin,
    guardAction: requestedOutput > thresholdParams.safeOutputLimit ? "clamp_to_safe_output" : "pass_through"
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function linePoints(points: LiveSignalPoint[], key: keyof Pick<LiveSignalPoint, "potRaw" | "requestedOutput" | "safeOutput" | "ledOutput" | "buzzerOutput" | "sensorInput">) {
  if (points.length === 0) return "";
  const width = 300;
  const height = 88;
  const lastIndex = Math.max(1, points.length - 1);
  return points
    .map((point, index) => {
      const x = (index / lastIndex) * width;
      const y = height - clamp01(Number(point[key] ?? 0)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function LiveSignalGraph({
  points,
  ghostPoints = [],
  active
}: {
  points: LiveSignalPoint[];
  ghostPoints?: DashboardGhostPoint[];
  active: boolean;
}) {
  const visiblePoints = points.length > 0 ? points : [{ id: 0, potRaw: 0, requestedOutput: 0, safeOutput: 0, ledOutput: 0, buzzerOutput: 0, clampActive: false }];
  const visibleGhostPoints = ghostPoints.map((point, index) => ({ ...point, id: point.id ?? index }));
  const showSensorTrace = visiblePoints.some((point) => typeof point.sensorInput === "number");
  const clampBands = visiblePoints
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.clampActive);
  const lastPoint = visiblePoints[visiblePoints.length - 1];
  const lastX = visiblePoints.length > 1 ? 300 : 0;

  return (
    <section className={active ? "reflex-live-graph is-live" : "reflex-live-graph"} aria-label="Live simulator signal graph">
      <div className="reflex-live-graph-legend">
        <span className="line-pot">pot_raw</span>
        <span className="line-request">request</span>
        <span className="line-safe">safe</span>
        <span className="line-led">LED</span>
        {showSensorTrace ? <span className="line-sensor">LDR</span> : null}
        <span className="line-buzzer">buzzer</span>
      </div>
      <svg viewBox="0 0 300 88" role="img" aria-label="Recent pot, request, safe output, LED, and buzzer values">
        <path className="grid-line" d="M0 0H300M0 44H300M0 88H300" />
        <path className="grid-line vertical" d="M0 0V88M75 0V88M150 0V88M225 0V88M300 0V88" />
        {clampBands.map(({ index }) => {
          const x = visiblePoints.length > 1 ? (index / (visiblePoints.length - 1)) * 300 : 0;
          return <rect key={`clamp-${index}`} className="clamp-band" x={Math.max(0, x - 1.8)} y="0" width="3.6" height="88" />;
        })}
        {visibleGhostPoints.length > 0 ? (
          <>
            <polyline className="trace-line ghost request" points={linePoints(visibleGhostPoints, "requestedOutput")} />
            <polyline className="trace-line ghost safe" points={linePoints(visibleGhostPoints, "safeOutput")} />
          </>
        ) : null}
        <polyline className="trace-line pot" points={linePoints(visiblePoints, "potRaw")} />
        <polyline className="trace-line request" points={linePoints(visiblePoints, "requestedOutput")} />
        <polyline className="trace-line safe" points={linePoints(visiblePoints, "safeOutput")} />
        <polyline className="trace-line led" points={linePoints(visiblePoints, "ledOutput")} />
        {showSensorTrace ? <polyline className="trace-line sensor" points={linePoints(visiblePoints, "sensorInput")} /> : null}
        <polyline className="trace-line buzzer" points={linePoints(visiblePoints, "buzzerOutput")} />
        <circle className="trace-dot safe" cx={lastX} cy={88 - clamp01(lastPoint.safeOutput) * 88} r="2.5" />
      </svg>
    </section>
  );
}

export function DashboardPanel({
  onClose,
  onMinimize,
  style,
  onDragStart,
  onResizeStart,
  kicker = "Live Dashboard",
  title = "Simulated Bench Status",
  metrics,
  terminalLines,
  suggestedCommand: suggestedCommandOverride,
  variant = "full",
  liveActive = false,
  cockpitPhase = "bench_idle",
  cockpitMode = "guided",
  cockpitTab = liveActive ? "trace" : "schematic",
  checkpoint,
  ghostTrace = [],
  checklistSummary,
  buzzerOutput = 0,
  buttonPressed = false,
  signalSnapshot,
  onCockpitTabChange,
  onCockpitModeChange,
  onOpenSchematic,
  onOpenChecklist,
  onFastRun,
  onCheckpointStep,
  onCommand
}: {
  onClose: () => void;
  onMinimize: () => void;
  style?: CSSProperties;
  onDragStart?: PointerEventHandler<HTMLButtonElement>;
  onResizeStart?: PointerEventHandler<HTMLButtonElement>;
  kicker?: string;
  title?: string;
  metrics?: { label: string; value: string }[];
  terminalLines?: { kind: string; text: string }[];
  suggestedCommand?: string;
  variant?: "full" | "reflex-live-popup";
  liveActive?: boolean;
  cockpitPhase?: DashboardCockpitPhase;
  cockpitMode?: DashboardCockpitMode;
  cockpitTab?: DashboardCockpitTab;
  checkpoint?: DashboardCheckpointState;
  ghostTrace?: DashboardGhostPoint[];
  checklistSummary?: {
    currentStep: string;
    doneCount: number;
    totalCount: number;
    stage: string;
  };
  buzzerOutput?: number;
  buttonPressed?: boolean;
  signalSnapshot?: DashboardSignalSnapshot;
  onCockpitTabChange?: (tab: DashboardCockpitTab) => void;
  onCockpitModeChange?: (mode: DashboardCockpitMode) => void;
  onOpenSchematic?: () => void;
  onOpenChecklist?: () => void;
  onFastRun?: () => void;
  onCheckpointStep?: (step: keyof DashboardCheckpointState) => void;
  onCommand?: (command: string) => void;
}) {
  const lab = useLabStore((state) => state.lab);
  const frames = useLabStore((state) => state.frames);
  const terminal = useLabStore((state) => state.terminal);
  const runCommand = useLabStore((state) => state.runCommand);
  const [command, setCommand] = useState("");
  const [events, setEvents] = useState<LabLiveEvent[]>(() => getLabEventHistory().slice(-9));
  const latest = frames[frames.length - 1];
  const reports = analyzeLab(lab);
  const stopCount = reports.filter((report) => report.severity === "stop").length;
  const ready = wiringComplete(lab) && stopCount === 0;
  const preview = liveActive ? runLiveReflexPreview(lab.potRaw) : runThresholdReflex(lab.potRaw, latest?.outputs.safe_output ?? 0);
  const liveGuardAction = signalSnapshot?.guardAction ?? (liveActive ? preview.guardAction : latest ? preview.guardAction : "pass_through");
  const liveRequestedOutput = signalSnapshot?.requestedOutput ?? (liveActive || latest ? preview.requestedOutput : 0);
  const liveSafeOutput = signalSnapshot?.safeOutput ?? (liveActive || latest ? preview.safeOutput : 0);
  const liveLedOutput = signalSnapshot?.ledOutput ?? (lab.faults.led_reversed ? 0 : liveSafeOutput);
  const liveBuzzerOutput = signalSnapshot?.buzzerOutput ?? buzzerOutput;
  const liveSafetyMargin = signalSnapshot?.safetyMargin ?? (liveActive || latest ? preview.safetyMargin : thresholdParams.safeOutputLimit);
  const clampActive = liveGuardAction === "clamp_to_safe_output";
  const suggestedCommand = useMemo(() => commandPrompt(ready, frames.length), [frames.length, ready]);
  const effectiveCommand = suggestedCommandOverride ?? suggestedCommand;
  const displayedMetrics = metrics ?? [
    { label: "wiring", value: ready ? "ready" : "building" },
    { label: "frames", value: String(frames.length) },
    { label: "guard", value: latest ? latest.guard.guard_action : "pending" },
    { label: "LED", value: latest ? latest.outputs.led.toFixed(2) : "0.00" }
  ];
  const displayedTerminal = terminalLines ?? terminal;
  const lastTerminalLine = displayedTerminal[displayedTerminal.length - 1];
  const dashboardClassName = variant === "reflex-live-popup" ? "dashboard-panel is-live-popup" : "dashboard-panel";
  const [signalHistory, setSignalHistory] = useState<LiveSignalPoint[]>([]);
  const activeTab = cockpitTab;
  const hasGhostTrace = ghostTrace.length > 0;
  const checkpointState: DashboardCheckpointState = checkpoint ?? {
    snapshotSaved: false,
    usbDisconnected: false,
    returnedToSchematic: false,
    lab01bUnlocked: false
  };
  const phaseLabel: Record<DashboardCockpitPhase, string> = {
    bench_idle: "Bench",
    running: "Running",
    bench_with_history: "Bench + history",
    bench_01b_unlocked: "Lab 01B unlocked",
    running_with_history: "Running + history"
  };

  useEffect(() => {
    return subscribeLabEvents((event) => {
      setEvents((current) => [...current, event].slice(-9));
    });
  }, []);

  useEffect(() => {
    if (variant !== "reflex-live-popup") return;
    const sample = () => {
      setSignalHistory((current) =>
        [
          ...current,
          {
            id: Date.now(),
            potRaw: lab.potRaw,
            requestedOutput: liveRequestedOutput,
            safeOutput: liveSafeOutput,
            ledOutput: liveLedOutput,
            buzzerOutput: liveBuzzerOutput,
            sensorInput: signalSnapshot?.sensorInput,
            clampActive
          }
        ].slice(-72)
      );
    };

    sample();
    if (!liveActive) return;
    const interval = window.setInterval(sample, 260);
    return () => window.clearInterval(interval);
  }, [clampActive, lab.potRaw, liveActive, liveBuzzerOutput, liveLedOutput, liveRequestedOutput, liveSafeOutput, variant]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const submitted = command || effectiveCommand;
    if (onCommand) {
      onCommand(submitted);
    } else {
      runCommand(submitted);
    }
    setCommand("");
  }

  return (
    <aside className={dashboardClassName} style={style} aria-label="Live lab dashboard">
      {onDragStart ? (
        <button type="button" className="panel-drag-handle" aria-label="Move live dashboard panel" onPointerDown={onDragStart}>
          Move
        </button>
      ) : null}
      <div className="dashboard-header">
        <div>
          <p>{kicker}</p>
          <h2>{title}</h2>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" aria-label="Minimize live dashboard panel" onClick={onMinimize}>
            <Minimize2 aria-hidden="true" />
          </button>
          <button type="button" aria-label="Hide live dashboard panel" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
          <Radio aria-hidden="true" />
        </div>
      </div>

      {variant === "reflex-live-popup" ? (
        <>
          <section className="dashboard-cockpit" aria-label="Lab bench cockpit">
            <div className="dashboard-cockpit-topline">
              <span>{phaseLabel[cockpitPhase]}</span>
              <div className="dashboard-mode-toggle" aria-label="Dashboard mode">
                {(["guided", "fast"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cockpitMode === mode ? "is-active" : ""}
                    aria-pressed={cockpitMode === mode}
                    onClick={() => onCockpitModeChange?.(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <nav className="dashboard-tab-rail" aria-label="Lab cockpit tabs">
              {(["schematic", "checklist", "trace", "serial", "evidence"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={activeTab === tab ? "is-active" : ""}
                  aria-pressed={activeTab === tab}
                  onClick={() => onCockpitTabChange?.(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
            {activeTab === "schematic" ? (
              <div className="dashboard-cockpit-pane">
                <strong>Full build schematic</strong>
                <span>Use the schematic as the bench map. The graph will take over when valid frames arrive.</span>
                <div className="dashboard-cockpit-actions">
                  <button type="button" onClick={onOpenSchematic}>Open schematic</button>
                  <button type="button" onClick={onOpenChecklist}>Checklist</button>
                  {cockpitMode === "fast" ? <button type="button" onClick={onFastRun}>Run now</button> : null}
                </div>
              </div>
            ) : null}
            {activeTab === "checklist" ? (
              <div className="dashboard-cockpit-pane">
                <strong>{checklistSummary?.stage ?? "Build checklist"}</strong>
                <span>
                  {checklistSummary ? `${checklistSummary.doneCount}/${checklistSummary.totalCount} complete - ${checklistSummary.currentStep}` : "Open the live checklist and work the build in order."}
                </span>
                <div className="dashboard-cockpit-actions">
                  <button type="button" onClick={onOpenChecklist}>Open checklist</button>
                  {cockpitMode === "fast" ? <button type="button" onClick={onFastRun}>Run now</button> : null}
                </div>
                {cockpitPhase === "bench_with_history" ? (
                  <ol className="checkpoint-list" aria-label="Lab 01A to Lab 01B checkpoint">
                    {([
                      ["snapshotSaved", "Save trace snapshot"],
                      ["usbDisconnected", "Disconnect USB"],
                      ["returnedToSchematic", "Return to schematic"],
                      ["lab01bUnlocked", "Unlock Lab 01B"]
                    ] as const).map(([id, label]) => (
                      <li key={id}>
                        <button
                          type="button"
                          className={checkpointState[id] ? "is-done" : ""}
                          onClick={() => onCheckpointStep?.(id)}
                        >
                          {checkpointState[id] ? "done" : "mark"} {label}
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
            {activeTab === "trace" ? (
              <div className="dashboard-cockpit-note">
                {hasGhostTrace ? "01A ghost trace is visible under the live run." : liveActive ? "Live run is active." : "Trace will start on first valid frame or simulated USB run."}
              </div>
            ) : null}
            {activeTab === "serial" ? (
              <div className="dashboard-cockpit-note">
                {lastTerminalLine?.text ?? "Serial output appears here when the simulated firmware starts."}
              </div>
            ) : null}
            {activeTab === "evidence" ? (
              <div className="dashboard-evidence-primer">
                <span>packet fields: pot_raw, requested_output, safe_output, guard_action</span>
                <span>guard actions: pass_through, clamp_to_safe_output</span>
                <span>proof obligation: safe_output &lt;= safe_output_limit</span>
                <span>proof_closed: false until MachLib/Lean proof is discharged</span>
              </div>
            ) : null}
          </section>
          <section className={liveActive ? "reflex-live-window is-live" : "reflex-live-window"} aria-label="Reflex live dashboard">
            <div className="reflex-live-status">
              <span>{liveActive ? "USB live" : ready ? "USB ready" : "wire check"}</span>
              <strong>{clampActive ? "CLAMP" : liveActive ? "PASS" : "ARMED"}</strong>
            </div>
            <div className="reflex-live-readouts">
              {(metrics ?? [
                { label: "pot_raw", value: lab.potRaw.toFixed(2) },
                { label: "request", value: liveActive ? liveRequestedOutput.toFixed(2) : "n/a" },
                { label: "safe_output", value: liveActive ? liveSafeOutput.toFixed(2) : "n/a" },
                { label: "LED duty", value: liveActive ? liveLedOutput.toFixed(2) : "n/a" },
                { label: "BTN", value: liveActive ? (buttonPressed ? "pressed" : "open") : "n/a" }
              ]).slice(0, 6).map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
            <div className="reflex-clamp-meter" aria-label="Clamp margin">
              <div>
                <span>guard</span>
                <strong>{liveActive ? liveGuardAction : "pending"}</strong>
              </div>
              <i style={{ "--level": liveActive ? 1 - liveSafetyMargin / thresholdParams.safeOutputLimit : 0 } as CSSProperties} />
            </div>
            <LiveSignalGraph points={signalHistory} ghostPoints={ghostTrace} active={liveActive} />
            <div className="reflex-live-footer">
              <span>frames {frames.length}</span>
              <strong>{lastTerminalLine?.text ?? "waiting for terminal"}</strong>
            </div>
          </section>

          <details className="dashboard-terminal dashboard-terminal-compact" aria-label="Virtual terminal">
            <summary>
              <TerminalSquare aria-hidden="true" />
              <span>Virtual terminal</span>
            </summary>
            <div className="dashboard-terminal-lines">
              {displayedTerminal.slice(-5).map((line, index) => (
                <pre key={`${line.text}-${index}`} className={`line-${line.kind}`}>
                  {line.text}
                </pre>
              ))}
            </div>
            <form className="dashboard-command-row" onSubmit={submit}>
              <label>
                Type `{effectiveCommand}` here
                <input
                  value={command}
                  onChange={(event) => setCommand(event.currentTarget.value)}
                  placeholder={effectiveCommand}
                  aria-label="Terminal command"
                />
              </label>
              <button type="submit">Enter</button>
            </form>
          </details>
        </>
      ) : (
        <section className="dashboard-metrics" aria-label="Lab state metrics">
          {displayedMetrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </section>
      )}

      {variant === "full" ? <section className="dashboard-terminal" aria-label="Virtual terminal">
        <div className="dashboard-section-title">
          <TerminalSquare aria-hidden="true" />
          <span>Virtual terminal</span>
        </div>
        <div className="dashboard-terminal-lines">
          {displayedTerminal.slice(-7).map((line, index) => (
            <pre key={`${line.text}-${index}`} className={`line-${line.kind}`}>
              {line.text}
            </pre>
          ))}
        </div>
        <form className="dashboard-command-row" onSubmit={submit}>
          <label>
            Type `{effectiveCommand}` here
            <input
              value={command}
              onChange={(event) => setCommand(event.currentTarget.value)}
              placeholder={effectiveCommand}
              aria-label="Terminal command"
            />
          </label>
          <button type="submit">Enter</button>
        </form>
      </section> : null}

      {variant === "full" ? <section className="dashboard-events" aria-label="Live lab event stream">
        <div className="dashboard-section-title">
          <Activity aria-hidden="true" />
          <span>Event stream</span>
        </div>
        <ol>
          {events.length === 0 ? <li>waiting for bench events</li> : null}
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.type}</strong>
              <span>{JSON.stringify(event.payload).slice(0, 96)}</span>
            </li>
          ))}
        </ol>
      </section> : null}
      {onResizeStart ? (
        <button type="button" className="panel-resize-handle" aria-label="Resize live dashboard panel" onPointerDown={onResizeStart} />
      ) : null}
    </aside>
  );
}
