from __future__ import annotations

import argparse
import json
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

try:
    import serial  # type: ignore
except Exception as exc:  # pragma: no cover - depends on operator machine
    serial = None
    serial_import_error = str(exc)
else:
    serial_import_error = ""


ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_DIR = Path(__file__).resolve().parent
CAPTURE_DIR = ROOT / "captures" / "esp32-arduino"
EXAMPLE_TRACE = ROOT / "dashboard" / "static" / "simulated_serial_stream.jsonl"
VISUALIZER_PATH = DASHBOARD_DIR / "visualizer.html"

DEFAULT_SERIAL_PORT = "COM6"
DEFAULT_BAUD = 115200
DEFAULT_HTTP_PORT = 5191
HOST = "127.0.0.1"

state_lock = threading.Lock()
state: dict[str, object] = {
    "connected": False,
    "port": DEFAULT_SERIAL_PORT,
    "baud": DEFAULT_BAUD,
    "error": "",
    "latest": None,
    "frames": 0,
    "started_at": time.time(),
    "updated_at": None,
    "history": [],
    "capture_buffer": [],
    "capture_active": False,
    "capture_frames": 0,
    "last_capture": None,
}


def normalized_number(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)  # type: ignore[arg-type]
    except Exception:
        return None


def normalize_frame(frame: dict[str, object], *, source_mode: str = "live_board") -> dict[str, object]:
    raw_frame = frame.get("raw") if isinstance(frame.get("raw"), dict) else frame
    outputs = frame.get("outputs") if isinstance(frame.get("outputs"), dict) else {}
    guard = frame.get("guard") if isinstance(frame.get("guard"), dict) else {}
    latency = frame.get("latency") if isinstance(frame.get("latency"), dict) else {}

    requested = outputs.get("requested_output", guard.get("requested_output", frame.get("requested_output")))
    safe = outputs.get("safe_output", guard.get("safe_output", frame.get("safe_output")))
    led = outputs.get("led", frame.get("led"))
    button_pressed = frame.get("button_pressed")
    inputs = frame.get("inputs") if isinstance(frame.get("inputs"), dict) else {}
    if not isinstance(button_pressed, bool):
        button_pressed = inputs.get("button_pressed")
    hardware_observed = frame.get("hardware_observed")

    return {
        "schema_version": frame.get("schema_version"),
        "kernel_id": frame.get("kernel_id") or frame.get("kernel_sha256"),
        "source": frame.get("source"),
        "board_id": frame.get("board_id"),
        "board_revision": frame.get("board_revision"),
        "esp32_chip_mac": frame.get("esp32_chip_mac"),
        "source_mode": source_mode,
        "mode": frame.get("mode"),
        "sample_index": frame.get("sample_index"),
        "timestamp_ms": frame.get("timestamp_ms"),
        "dashboard_received_at": frame.get("dashboard_received_at"),
        "dashboard_received_epoch_ms": frame.get("dashboard_received_epoch_ms"),
        "pot_raw": normalized_number(frame.get("pot_raw")),
        "requested_output": normalized_number(requested),
        "safe_output": normalized_number(safe),
        "led": normalized_number(led),
        "buzzer": normalized_number(outputs.get("buzzer", frame.get("buzzer"))),
        "button_pressed": button_pressed if isinstance(button_pressed, bool) else False,
        "button_action": frame.get("button_action"),
        "stepper": normalized_number(outputs.get("stepper", frame.get("stepper"))),
        "guard_action": guard.get("guard_action", frame.get("guard_action")),
        "safety_margin": normalized_number(guard.get("safety_margin", frame.get("safety_margin"))),
        "bottleneck": guard.get("bottleneck", frame.get("bottleneck")),
        "latency": latency,
        "hardware_observed": hardware_observed if isinstance(hardware_observed, bool) else source_mode == "live_board",
        "dashboard_projection_only": True,
        "raw": raw_frame,
    }


def frame_to_jsonl(frame: dict[str, object]) -> str:
    return json.dumps(frame, separators=(",", ":"))


def compact_frame(frame: dict[str, object]) -> dict[str, object]:
    return {
        "schema_version": frame.get("schema_version"),
        "kernel_id": frame.get("kernel_id"),
        "source": frame.get("source"),
        "board_id": frame.get("board_id"),
        "board_revision": frame.get("board_revision"),
        "esp32_chip_mac": frame.get("esp32_chip_mac"),
        "source_mode": frame.get("source_mode"),
        "mode": frame.get("mode"),
        "sample_index": frame.get("sample_index"),
        "timestamp_ms": frame.get("timestamp_ms"),
        "dashboard_received_at": frame.get("dashboard_received_at"),
        "dashboard_received_epoch_ms": frame.get("dashboard_received_epoch_ms"),
        "pot_raw": frame.get("pot_raw"),
        "requested_output": frame.get("requested_output"),
        "safe_output": frame.get("safe_output"),
        "led": frame.get("led"),
        "buzzer": frame.get("buzzer"),
        "button_pressed": frame.get("button_pressed"),
        "button_action": frame.get("button_action"),
        "stepper": frame.get("stepper"),
        "guard_action": frame.get("guard_action"),
        "safety_margin": frame.get("safety_margin"),
        "bottleneck": frame.get("bottleneck"),
        "hardware_observed": frame.get("hardware_observed"),
        "dashboard_projection_only": frame.get("dashboard_projection_only"),
    }


def load_jsonl(path: Path, *, source_mode: str) -> list[dict[str, object]]:
    if not path.exists():
        return []
    frames: list[dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            frames.append(normalize_frame(parsed, source_mode=source_mode))
    return frames


def capture_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return CAPTURE_DIR / f"reflexcourse_{stamp}.jsonl"


def write_capture(frames: list[dict[str, object]]) -> Path:
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    path = capture_path()
    path.write_text("\n".join(frame_to_jsonl(frame) for frame in frames) + "\n", encoding="utf-8")
    return path


def latest_capture_path() -> Path | None:
    if not CAPTURE_DIR.exists():
        return None
    files = sorted(CAPTURE_DIR.glob("*.jsonl"), key=lambda path: path.stat().st_mtime, reverse=True)
    return files[0] if files else None


def serial_reader(port: str, baud: int) -> None:
    if serial is None:
        with state_lock:
            state["error"] = f"pyserial unavailable: {serial_import_error}"
        return

    while True:
        try:
            with serial.Serial(port, baud, timeout=0.5) as device:
                with state_lock:
                    state.update({"connected": True, "port": port, "baud": baud, "error": ""})

                while True:
                    line = device.readline().decode("utf-8", errors="ignore").strip()
                    safe_line = line.encode("ascii", errors="ignore").decode("ascii")
                    if not safe_line.startswith("{"):
                        continue
                    try:
                        parsed = json.loads(safe_line)
                    except json.JSONDecodeError:
                        continue
                    if not isinstance(parsed, dict):
                        continue

                    frame = normalize_frame(parsed, source_mode="live_board")
                    now = time.time()
                    frame["dashboard_received_at"] = datetime.fromtimestamp(now, timezone.utc).isoformat()
                    frame["dashboard_received_epoch_ms"] = int(now * 1000)
                    with state_lock:
                        state["latest"] = frame
                        state["frames"] = int(state["frames"]) + 1
                        state["updated_at"] = now
                        history = state["history"]
                        assert isinstance(history, list)
                        history.append(frame)
                        if state["capture_active"]:
                            capture_buffer = state["capture_buffer"]
                            assert isinstance(capture_buffer, list)
                            capture_buffer.append(frame)
                            state["capture_frames"] = len(capture_buffer)
                        else:
                            del history[:-240]
                            state["capture_frames"] = 0
        except Exception as exc:
            with state_lock:
                state["connected"] = False
                state["error"] = str(exc)
            time.sleep(1.0)


HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ESP32 / Arduino Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d1316;
      color: #edf7f4;
      --panel: rgba(15, 21, 24, 0.88);
      --line: rgba(142, 224, 178, 0.24);
      --muted: #a9bbb7;
      --green: #8ee0b2;
      --yellow: #fff2a6;
      --red: #ff8f9e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: 24px;
      background:
        radial-gradient(circle at 18% 18%, rgba(142,224,178,0.08), transparent 28%),
        radial-gradient(circle at 82% 24%, rgba(255,242,166,0.055), transparent 24%),
        linear-gradient(135deg, #0b1114, #11191d 48%, #0c1113);
    }
    main {
      width: min(1120px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 14px;
    }
    .panel, .metric, .readout, .modebar {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: 0 18px 52px rgba(0,0,0,0.28);
    }
    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px;
    }
    p, h1 { margin: 0; }
    .kicker, .label {
      color: var(--green);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 {
      margin-top: 4px;
      font-size: clamp(24px, 4vw, 42px);
      line-height: 1.03;
    }
    .subtitle {
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .status {
      display: grid;
      justify-items: end;
      gap: 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .pill {
      min-width: 118px;
      padding: 9px 12px;
      border-radius: 999px;
      text-align: center;
      color: #062117;
      background: var(--green);
      font-weight: 950;
    }
    .pill.is-error { background: var(--red); color: #2a070c; }
    .pill.is-capture { background: var(--yellow); color: #211a03; }
    .modebar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 10px;
    }
    button, .file-button {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 12px;
      border: 1px solid rgba(216,232,228,0.16);
      border-radius: 7px;
      background: rgba(216,232,228,0.07);
      color: #edf7f4;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }
    button[aria-pressed="true"] {
      border-color: rgba(142,224,178,0.52);
      background: rgba(142,224,178,0.13);
      color: #dffff0;
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    input[type="file"] { display: none; }
    .replay-controls { display: none; gap: 8px; align-items: center; flex-wrap: wrap; }
    body.is-replay .replay-controls { display: flex; }
    .scrubber {
      min-width: min(280px, 100%);
      flex: 1 1 240px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      min-height: 122px;
      display: grid;
      align-content: space-between;
      gap: 10px;
      padding: 14px;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }
    .metric strong {
      color: var(--yellow);
      font-size: clamp(27px, 5vw, 46px);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .metric.is-clamp, .readout.is-clamp {
      border-color: rgba(255, 143, 158, 0.58);
      background: rgba(43, 23, 27, 0.88);
      box-shadow: 0 0 0 1px rgba(255,143,158,0.26), 0 18px 52px rgba(0,0,0,0.34);
    }
    .changed {
      border-color: rgba(255,242,166,0.62);
      box-shadow: 0 0 0 1px rgba(255,242,166,0.22), 0 0 28px rgba(255,242,166,0.12);
      transform: translateY(-1px);
    }
    .meter {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(216,232,228,0.11);
    }
    .meter i {
      display: block;
      width: calc(var(--level, 0) * 100%);
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6fd6a0, var(--yellow), var(--red));
      transition: width 110ms linear;
    }
    .lower {
      display: grid;
      grid-template-columns: 0.92fr 1.08fr;
      gap: 10px;
    }
    .readout {
      padding: 14px;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }
    .readout p {
      margin-top: 8px;
      color: #dce8e5;
      font-size: 13px;
      line-height: 1.35;
    }
    .readout pre {
      max-height: 252px;
      overflow: auto;
      margin: 10px 0 0;
      color: #dce8e5;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      line-height: 1.45;
    }
    .flow {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 10px;
      color: #dbe8e5;
      font-size: 12px;
      line-height: 1.6;
    }
    .flow span {
      border: 1px solid rgba(216,232,228,0.12);
      border-radius: 999px;
      padding: 4px 8px;
      background: rgba(216,232,228,0.055);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .summary-grid div {
      padding: 9px;
      border-radius: 7px;
      background: rgba(216,232,228,0.055);
    }
    .summary-grid small {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .summary-grid b {
      color: var(--yellow);
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 820px) {
      body { padding: 12px; }
      header, .lower { grid-template-columns: 1fr; }
      .status { justify-items: start; }
      .metrics, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main>
    <header class="panel">
      <div>
        <p class="kicker">ESP32 / Arduino Dashboard</p>
        <h1>Reflex Course Live Board</h1>
        <p class="subtitle">Live serial dashboard for ESP32/Arduino bench courses. Starts in Live Board mode and can save or replay JSONL captures.</p>
      </div>
      <div class="status">
        <div id="status" class="pill">connecting</div>
        <div id="meta">COM6 @ 115200</div>
        <div id="clock">--</div>
      </div>
    </header>

    <nav class="modebar" aria-label="Dashboard modes">
      <button type="button" id="modeLive" aria-pressed="true">Live Board</button>
      <button type="button" id="modeReplay" aria-pressed="false">Replay Capture</button>
      <button type="button" id="modeExample" aria-pressed="false">Example Trace</button>
      <button type="button" id="openVisualizer">Visualizer</button>
      <button type="button" id="captureToggle">Start capture</button>
      <label class="file-button" for="captureFile">Load JSONL</label>
      <input id="captureFile" type="file" accept=".jsonl,.txt,application/jsonl,text/plain" />
      <div class="replay-controls" aria-label="Replay controls">
        <button type="button" id="prevFrame">Prev</button>
        <button type="button" id="playPause">Play</button>
        <button type="button" id="nextFrame">Next</button>
        <input id="scrubber" class="scrubber" type="range" min="0" max="0" value="0" step="1" aria-label="Replay sample index" />
      </div>
    </nav>

    <section class="metrics" aria-live="polite">
      <div class="metric" id="cardPot"><span class="label">pot_raw</span><strong id="pot">--</strong><div class="meter"><i id="potMeter"></i></div></div>
      <div class="metric" id="cardRequest"><span class="label">request</span><strong id="request">--</strong><div class="meter"><i id="requestMeter"></i></div></div>
      <div class="metric" id="cardSafe"><span class="label">safe_output</span><strong id="safe">--</strong><div class="meter"><i id="safeMeter"></i></div></div>
      <div class="metric" id="cardLed"><span class="label">LED duty</span><strong id="led">--</strong><div class="meter"><i id="ledMeter"></i></div></div>
    </section>

    <section class="lower">
      <div class="readout" id="guardCard">
        <span class="label">Guard / Clamp</span>
        <pre id="guard">waiting for serial frame</pre>
      </div>
      <div class="readout">
        <span class="label">Run Summary</span>
        <div class="summary-grid">
          <div><small>frames</small><b id="summaryFrames">0</b></div>
          <div><small>clamps</small><b id="summaryClamps">0</b></div>
          <div><small>pot min/max</small><b id="summaryPot">n/a</b></div>
          <div><small>LED min/max</small><b id="summaryLed">n/a</b></div>
        </div>
        <pre id="captureStatus">Live Board mode. Capture is off.</pre>
      </div>
      <div class="readout">
        <span class="label">Projection Boundary</span>
        <p>This dashboard displays serial/replay evidence from the ESP32/Arduino bench. It does not recompute the firmware or the kernel. Example Trace is simulated and not hardware-observed.</p>
        <div class="flow">
          <span>physical input</span>
          <span>ESP32 firmware</span>
          <span>serial frame</span>
          <span>dashboard projection</span>
          <span>evidence capture</span>
        </div>
      </div>
      <details class="readout" open>
        <summary><span class="label">Latest Frame</span></summary>
        <pre id="frame">waiting for serial frame</pre>
      </details>
    </section>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    const valueEls = {
      pot_raw: $("pot"),
      requested_output: $("request"),
      safe_output: $("safe"),
      led: $("led")
    };
    const meterEls = {
      pot_raw: $("potMeter"),
      requested_output: $("requestMeter"),
      safe_output: $("safeMeter"),
      led: $("ledMeter")
    };
    const cardEls = {
      pot_raw: $("cardPot"),
      requested_output: $("cardRequest"),
      safe_output: $("cardSafe"),
      led: $("cardLed")
    };
    let mode = "live";
    let replayFrames = [];
    let replayIndex = 0;
    let replayTimer = null;
    let lastShown = {};
    let latestLive = null;
    let captureActive = false;

    const fmt = (value) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "--";
    const level = (value) => Math.max(0, Math.min(1, typeof value === "number" ? value : 0));
    const isClamp = (frame) => frame?.guard_action === "clamp_to_safe_output";

    function pulseIfChanged(key, value) {
      const text = JSON.stringify(value);
      if (lastShown[key] !== undefined && lastShown[key] !== text) {
        const card = cardEls[key];
        card?.classList.add("changed");
        window.setTimeout(() => card?.classList.remove("changed"), 520);
      }
      lastShown[key] = text;
    }

    function setMode(next) {
      mode = next;
      document.body.classList.toggle("is-replay", mode !== "live");
      $("modeLive").setAttribute("aria-pressed", String(mode === "live"));
      $("modeReplay").setAttribute("aria-pressed", String(mode === "replay"));
      $("modeExample").setAttribute("aria-pressed", String(mode === "example"));
      stopReplayTimer();
      if (mode === "live") {
        $("captureToggle").disabled = false;
        renderFrame(latestLive, "Live Board");
      } else {
        $("captureToggle").disabled = true;
      }
    }

    function renderFrame(frame, sourceLabel) {
      $("clock").textContent = new Date().toLocaleTimeString();
      if (!frame) return;
      latestLive = sourceLabel === "Live Board" ? frame : latestLive;
      const clamp = isClamp(frame);
      for (const key of ["pot_raw", "requested_output", "safe_output", "led"]) {
        pulseIfChanged(key, frame[key]);
        valueEls[key].textContent = fmt(frame[key]);
        meterEls[key].style.setProperty("--level", level(frame[key]));
        cardEls[key].classList.toggle("is-clamp", clamp && (key === "requested_output" || key === "safe_output"));
      }
      $("guardCard").classList.toggle("is-clamp", clamp);
      $("guard").textContent = [
        `source: ${sourceLabel}`,
        `action: ${frame.guard_action ?? "n/a"}`,
        `bottleneck: ${frame.bottleneck ?? "n/a"}`,
        `safety_margin: ${fmt(frame.safety_margin)}`,
        `sample_index: ${frame.sample_index ?? "n/a"}`,
        `hardware_observed: ${frame.hardware_observed === true}`
      ].join("\\n");
      $("frame").textContent = JSON.stringify(frame.raw ?? frame, null, 2);
      renderSummary(sourceLabel === "Live Board" ? [frame] : replayFrames);
    }

    function renderSummary(frames) {
      const numeric = (key) => frames.map((frame) => frame[key]).filter((value) => typeof value === "number");
      const minMax = (key) => {
        const values = numeric(key);
        return values.length ? `${Math.min(...values).toFixed(2)} / ${Math.max(...values).toFixed(2)}` : "n/a";
      };
      $("summaryFrames").textContent = String(frames.length);
      $("summaryClamps").textContent = String(frames.filter(isClamp).length);
      $("summaryPot").textContent = minMax("pot_raw");
      $("summaryLed").textContent = minMax("led");
    }

    async function tickLive() {
      if (mode !== "live") return;
      try {
        const res = await fetch("/state", { cache: "no-store" });
        const data = await res.json();
        const frame = data.latest;
        $("status").textContent = data.connected ? (data.capture_active ? "CAPTURE" : "LIVE") : "offline";
        $("status").classList.toggle("is-error", !data.connected);
        $("status").classList.toggle("is-capture", data.capture_active);
        $("meta").textContent = `${data.port} @ ${data.baud} | frames ${data.frames}`;
        captureActive = Boolean(data.capture_active);
        $("captureToggle").textContent = captureActive ? "Stop + save capture" : "Start capture";
        $("captureStatus").textContent = captureActive
          ? `Capturing live frames: ${data.capture_frames}`
          : data.last_capture
            ? `Last capture: ${data.last_capture.path} (${data.last_capture.frames} frames)`
            : (data.error || "Live Board mode. Capture is off.");
        if (frame) renderFrame(frame, "Live Board");
      } catch (error) {
        $("status").textContent = "offline";
        $("status").classList.add("is-error");
        $("captureStatus").textContent = String(error);
      }
    }

    function setReplayFrames(frames, sourceLabel) {
      replayFrames = frames;
      replayIndex = 0;
      $("scrubber").max = String(Math.max(0, replayFrames.length - 1));
      $("scrubber").value = "0";
      $("captureStatus").textContent = `${sourceLabel}: ${replayFrames.length} frames loaded`;
      setMode(sourceLabel === "Example Trace" ? "example" : "replay");
      renderFrame(replayFrames[0], sourceLabel);
    }

    async function loadLatestCapture() {
      const res = await fetch("/captures/latest", { cache: "no-store" });
      if (!res.ok) {
        $("captureStatus").textContent = "No saved capture found yet.";
        return;
      }
      const data = await res.json();
      setReplayFrames(data.frames || [], "Replay Capture");
    }

    async function loadExampleTrace() {
      const res = await fetch("/example", { cache: "no-store" });
      const data = await res.json();
      setReplayFrames(data.frames || [], "Example Trace");
    }

    function showReplayIndex(index) {
      if (!replayFrames.length) return;
      replayIndex = Math.max(0, Math.min(replayFrames.length - 1, index));
      $("scrubber").value = String(replayIndex);
      renderFrame(replayFrames[replayIndex], mode === "example" ? "Example Trace" : "Replay Capture");
    }

    function stopReplayTimer() {
      if (replayTimer !== null) {
        clearInterval(replayTimer);
        replayTimer = null;
      }
      $("playPause").textContent = "Play";
    }

    function toggleReplay() {
      if (!replayFrames.length) return;
      if (replayTimer !== null) {
        stopReplayTimer();
        return;
      }
      $("playPause").textContent = "Pause";
      replayTimer = setInterval(() => {
        showReplayIndex(replayIndex + 1 >= replayFrames.length ? 0 : replayIndex + 1);
      }, 220);
    }

    async function toggleCapture() {
      if (captureActive) {
        const res = await fetch("/capture/stop", { method: "POST" });
        const data = await res.json();
        $("captureStatus").textContent = data.ok ? `Saved ${data.frames} frames to ${data.path}` : data.error;
      } else {
        await fetch("/capture/start", { method: "POST" });
        $("captureStatus").textContent = "Capture started.";
      }
      await tickLive();
    }

    $("modeLive").addEventListener("click", () => setMode("live"));
    $("modeReplay").addEventListener("click", loadLatestCapture);
    $("modeExample").addEventListener("click", loadExampleTrace);
    $("openVisualizer").addEventListener("click", () => window.open("/visualizer", "_blank", "noopener"));
    $("captureToggle").addEventListener("click", toggleCapture);
    $("prevFrame").addEventListener("click", () => showReplayIndex(replayIndex - 1));
    $("nextFrame").addEventListener("click", () => showReplayIndex(replayIndex + 1));
    $("playPause").addEventListener("click", toggleReplay);
    $("scrubber").addEventListener("input", (event) => showReplayIndex(Number(event.target.value)));
    $("captureFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const toNumber = (value) => {
        const next = Number(value);
        return Number.isFinite(next) ? next : null;
      };
      const normalizeParsed = (parsed) => {
        const outputs = parsed.outputs ?? {};
        const guard = parsed.guard ?? {};
        const observed = typeof parsed.hardware_observed === "boolean"
          ? parsed.hardware_observed
          : parsed.source_mode === "live_board";
        return {
          schema_version: parsed.schema_version,
          kernel_id: parsed.kernel_id ?? parsed.kernel_sha256,
          source: parsed.source,
          source_mode: "loaded_capture",
          mode: parsed.mode,
          sample_index: parsed.sample_index,
          timestamp_ms: parsed.timestamp_ms,
          pot_raw: toNumber(parsed.pot_raw),
          requested_output: toNumber(outputs.requested_output ?? guard.requested_output ?? parsed.requested_output),
          safe_output: toNumber(outputs.safe_output ?? guard.safe_output ?? parsed.safe_output),
          led: toNumber(outputs.led ?? parsed.led),
          buzzer: toNumber(outputs.buzzer ?? parsed.buzzer),
          guard_action: guard.guard_action ?? parsed.guard_action,
          safety_margin: toNumber(guard.safety_margin ?? parsed.safety_margin),
          bottleneck: guard.bottleneck ?? parsed.bottleneck,
          hardware_observed: observed,
          dashboard_projection_only: true,
          raw: parsed.raw ?? parsed
        };
      };
      const frames = text.split("\\n").filter((line) => line.trim().startsWith("{")).map((line) => {
        const parsed = JSON.parse(line);
        return normalizeParsed(parsed);
      });
      setReplayFrames(frames, "Replay Capture");
    });

    tickLive();
    setInterval(tickLive, 160);
  </script>
</body>
</html>
"""


def response_body(status: int, body: dict[str, object]) -> bytes:
    return json.dumps({"ok": status < 400, **body}, default=str).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return

    def send_body(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("content-type", content_type)
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status: int, body: dict[str, object]) -> None:
        self.send_body(status, response_body(status, body), "application/json")

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in {"/", "/visualizer"}:
            if not VISUALIZER_PATH.exists():
                self.send_json(404, {"error": "visualizer.html not found"})
                return
            self.send_body(200, VISUALIZER_PATH.read_bytes(), "text/html; charset=utf-8")
            return
        if path == "/live-board":
            self.send_body(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
            return
        if path == "/state":
            with state_lock:
                body_state = dict(state)
                history = body_state.pop("history", [])
                capture_buffer = body_state.pop("capture_buffer", [])
                body_state["history_frames"] = len(history) if isinstance(history, list) else 0
                body_state["capture_buffer_frames"] = len(capture_buffer) if isinstance(capture_buffer, list) else 0
                body = json.dumps(body_state, default=str).encode("utf-8")
            self.send_body(200, body, "application/json")
            return
        if path == "/history":
            with state_lock:
                if isinstance(state["history"], list):
                    raw_history = list(state["history"])
                    raw_capture = list(state["capture_buffer"]) if isinstance(state["capture_buffer"], list) else []
                    history = raw_capture if state["capture_active"] else raw_history[-180:]
                else:
                    history = []
                body_state = {
                    "connected": state["connected"],
                    "port": state["port"],
                    "baud": state["baud"],
                    "error": state["error"],
                    "frames": state["frames"],
                    "capture_active": state["capture_active"],
                    "capture_frames": state["capture_frames"],
                    "last_capture": state["last_capture"],
                    "history_window": "capture_full" if state["capture_active"] else "live_tail_180",
                    "history": [compact_frame(frame) for frame in history if isinstance(frame, dict)],
                }
                body = json.dumps(body_state, default=str).encode("utf-8")
            self.send_body(200, body, "application/json")
            return
        if path == "/captures/latest":
            latest = latest_capture_path()
            if latest is None:
                self.send_json(404, {"error": "no captures found"})
                return
            self.send_json(200, {"path": str(latest), "frames": load_jsonl(latest, source_mode="replay_capture")})
            return
        if path == "/example":
            self.send_json(200, {"path": str(EXAMPLE_TRACE), "frames": load_jsonl(EXAMPLE_TRACE, source_mode="example_trace")})
            return
        self.send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/capture/start":
            with state_lock:
                state["capture_active"] = True
                state["capture_frames"] = 0
                capture_buffer = state["capture_buffer"]
                assert isinstance(capture_buffer, list)
                capture_buffer.clear()
            self.send_json(200, {"capture_active": True})
            return
        if path == "/capture/stop":
            with state_lock:
                state["capture_active"] = False
                history = list(state["capture_buffer"]) if isinstance(state["capture_buffer"], list) else []
            if not history:
                self.send_json(400, {"error": "no frames captured"})
                return
            path_written = write_capture(history)
            capture_info = {
                "path": str(path_written),
                "frames": len(history),
                "frames_data": [compact_frame(frame) for frame in history if isinstance(frame, dict)],
            }
            with state_lock:
                state["last_capture"] = {"path": str(path_written), "frames": len(history)}
                state["capture_frames"] = 0
                capture_buffer = state["capture_buffer"]
                assert isinstance(capture_buffer, list)
                capture_buffer.clear()
            self.send_json(200, capture_info)
            return
        self.send_json(404, {"error": "not found"})


def main() -> None:
    parser = argparse.ArgumentParser(description="ESP32 / Arduino live serial dashboard.")
    parser.add_argument("--port", default=DEFAULT_SERIAL_PORT, help="Serial port, for example COM6")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD, help="Serial baud rate")
    parser.add_argument("--http-port", type=int, default=DEFAULT_HTTP_PORT, help="Local dashboard HTTP port")
    args = parser.parse_args()

    with state_lock:
        state["port"] = args.port
        state["baud"] = args.baud

    reader = threading.Thread(target=serial_reader, args=(args.port, args.baud), daemon=True)
    reader.start()

    server = ThreadingHTTPServer((HOST, args.http_port), Handler)
    print(f"ESP32 / Arduino dashboard: http://{HOST}:{args.http_port}/")
    print(f"Reading {args.port} @ {args.baud}")
    server.serve_forever()


if __name__ == "__main__":
    main()
