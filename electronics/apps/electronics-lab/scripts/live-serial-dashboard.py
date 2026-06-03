from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

try:
    import serial  # type: ignore
except Exception as exc:  # pragma: no cover - operator environment detail
    serial = None
    serial_import_error = str(exc)
else:
    serial_import_error = ""


DEFAULT_PORT = "COM6"
DEFAULT_BAUD = 115200
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 5191

state_lock = threading.Lock()
state = {
    "connected": False,
    "port": DEFAULT_PORT,
    "baud": DEFAULT_BAUD,
    "error": "",
    "latest": None,
    "frames": 0,
    "started_at": time.time(),
    "updated_at": None,
    "history": [],
}


def normalize_frame(frame: dict) -> dict:
    outputs = frame.get("outputs") if isinstance(frame.get("outputs"), dict) else {}
    guard = frame.get("guard") if isinstance(frame.get("guard"), dict) else {}
    return {
        "schema_version": frame.get("schema_version"),
        "kernel_id": frame.get("kernel_id"),
        "source": frame.get("source"),
        "mode": frame.get("mode"),
        "sample_index": frame.get("sample_index"),
        "timestamp_ms": frame.get("timestamp_ms"),
        "pot_raw": frame.get("pot_raw"),
        "requested_output": outputs.get("requested_output", guard.get("requested_output")),
        "safe_output": outputs.get("safe_output", guard.get("safe_output")),
        "led": outputs.get("led"),
        "buzzer": outputs.get("buzzer"),
        "guard_action": guard.get("guard_action"),
        "safety_margin": guard.get("safety_margin"),
        "bottleneck": guard.get("bottleneck"),
        "raw": frame,
    }


def serial_reader(port: str, baud: int) -> None:
    if serial is None:
        with state_lock:
            state["error"] = f"pyserial unavailable: {serial_import_error}"
        return

    while True:
        try:
            with serial.Serial(port, baud, timeout=0.5) as device:
                with state_lock:
                    state["connected"] = True
                    state["port"] = port
                    state["baud"] = baud
                    state["error"] = ""

                while True:
                    line = device.readline().decode("utf-8", errors="ignore").strip()
                    safe_line = line.encode("ascii", errors="ignore").decode("ascii")
                    if not safe_line.startswith("{"):
                        continue
                    try:
                        parsed = json.loads(safe_line)
                    except json.JSONDecodeError:
                        continue

                    frame = normalize_frame(parsed)
                    now = time.time()
                    with state_lock:
                        state["latest"] = frame
                        state["frames"] = int(state["frames"]) + 1
                        state["updated_at"] = now
                        history = state["history"]
                        assert isinstance(history, list)
                        history.append(frame)
                        del history[:-160]
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
  <title>Reflex Course Live Physical Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d1316;
      color: #edf7f4;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 20% 20%, rgba(142,224,178,0.08), transparent 28%),
        linear-gradient(135deg, #0b1114, #11191d 48%, #0c1113);
    }
    main {
      width: min(920px, 100%);
      display: grid;
      gap: 14px;
    }
    .panel {
      border: 1px solid rgba(142,224,178,0.24);
      border-radius: 8px;
      background: rgba(15, 21, 24, 0.88);
      box-shadow: 0 18px 52px rgba(0,0,0,0.34);
    }
    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px;
    }
    p, h1 { margin: 0; }
    .kicker {
      color: #8ee0b2;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }
    h1 {
      margin-top: 4px;
      font-size: clamp(22px, 3vw, 36px);
      line-height: 1.05;
    }
    .status {
      display: grid;
      justify-items: end;
      gap: 4px;
      color: #a9bbb7;
      font-size: 12px;
      font-weight: 800;
    }
    .pill {
      min-width: 118px;
      padding: 9px 12px;
      border-radius: 999px;
      text-align: center;
      color: #062117;
      background: #8ee0b2;
      font-weight: 950;
    }
    .pill.is-error { background: #ff8f9e; color: #2a070c; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 14px;
    }
    .metric {
      min-height: 112px;
      display: grid;
      align-content: space-between;
      gap: 10px;
      padding: 14px;
      border: 1px solid rgba(216,232,228,0.11);
      border-radius: 8px;
      background: rgba(216,232,228,0.055);
    }
    .metric span {
      color: #a9bbb7;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .metric strong {
      color: #fff2a6;
      font-size: clamp(26px, 5vw, 44px);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .meter {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(216,232,228,0.1);
    }
    .meter i {
      display: block;
      width: calc(var(--level, 0) * 100%);
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6fd6a0, #fff2a6, #ff8f9e);
      transition: width 110ms linear;
    }
    .wide {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 0 14px 14px;
    }
    .readout {
      padding: 14px;
      border: 1px solid rgba(216,232,228,0.11);
      border-radius: 8px;
      background: rgba(5,15,17,0.42);
    }
    .readout span {
      color: #8ee0b2;
      font-size: 11px;
      font-weight: 950;
      text-transform: uppercase;
    }
    .readout pre {
      max-height: 220px;
      overflow: auto;
      margin: 10px 0 0;
      color: #dce8e5;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      line-height: 1.45;
    }
    @media (max-width: 720px) {
      body { padding: 12px; }
      header, .wide { grid-template-columns: 1fr; }
      .status { justify-items: start; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main>
    <header class="panel">
      <div>
        <p class="kicker">Live physical serial</p>
        <h1>Reflex Course</h1>
      </div>
      <div class="status">
        <div id="status" class="pill">connecting</div>
        <div id="meta">COM6 @ 115200</div>
      </div>
    </header>
    <section class="panel metrics">
      <div class="metric"><span>pot_raw</span><strong id="pot">--</strong><div class="meter"><i id="potMeter"></i></div></div>
      <div class="metric"><span>request</span><strong id="request">--</strong><div class="meter"><i id="requestMeter"></i></div></div>
      <div class="metric"><span>safe_output</span><strong id="safe">--</strong><div class="meter"><i id="safeMeter"></i></div></div>
      <div class="metric"><span>LED duty</span><strong id="led">--</strong><div class="meter"><i id="ledMeter"></i></div></div>
    </section>
    <section class="wide panel">
      <div class="readout">
        <span>Guard</span>
        <pre id="guard">waiting for serial frame</pre>
      </div>
      <div class="readout">
        <span>Latest frame</span>
        <pre id="frame">waiting for serial frame</pre>
      </div>
    </section>
  </main>
  <script>
    const ids = ["pot", "request", "safe", "led", "guard", "frame", "status", "meta"];
    const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    const meters = {
      pot: document.getElementById("potMeter"),
      request: document.getElementById("requestMeter"),
      safe: document.getElementById("safeMeter"),
      led: document.getElementById("ledMeter")
    };
    const fmt = (value) => typeof value === "number" ? value.toFixed(2) : "--";
    const level = (value) => Math.max(0, Math.min(1, typeof value === "number" ? value : 0));

    async function tick() {
      try {
        const res = await fetch("/state", { cache: "no-store" });
        const data = await res.json();
        const frame = data.latest;
        el.status.textContent = data.connected ? "LIVE" : "offline";
        el.status.classList.toggle("is-error", !data.connected);
        el.meta.textContent = `${data.port} @ ${data.baud} | frames ${data.frames}`;
        if (!frame) {
          if (data.error) el.guard.textContent = data.error;
          return;
        }
        el.pot.textContent = fmt(frame.pot_raw);
        el.request.textContent = fmt(frame.requested_output);
        el.safe.textContent = fmt(frame.safe_output);
        el.led.textContent = fmt(frame.led);
        meters.pot.style.setProperty("--level", level(frame.pot_raw));
        meters.request.style.setProperty("--level", level(frame.requested_output));
        meters.safe.style.setProperty("--level", level(frame.safe_output));
        meters.led.style.setProperty("--level", level(frame.led));
        el.guard.textContent = [
          `action: ${frame.guard_action ?? "n/a"}`,
          `bottleneck: ${frame.bottleneck ?? "n/a"}`,
          `safety_margin: ${fmt(frame.safety_margin)}`,
          `sample_index: ${frame.sample_index ?? "n/a"}`
        ].join("\\n");
        el.frame.textContent = JSON.stringify(frame.raw, null, 2);
      } catch (error) {
        el.status.textContent = "offline";
        el.status.classList.add("is-error");
        el.guard.textContent = String(error);
      }
    }
    tick();
    setInterval(tick, 180);
  </script>
</body>
</html>
"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A002
        return

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("content-type", content_type)
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/":
            self._send(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
            return
        if path == "/state":
            with state_lock:
                body = json.dumps(state, default=str).encode("utf-8")
            self._send(200, body, "application/json")
            return
        self._send(404, b'{"error":"not found"}', "application/json")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Serve a local dashboard for Reflex Course live serial.")
    parser.add_argument("--port", default=DEFAULT_PORT, help="Serial port, for example COM6")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD, help="Serial baud rate")
    parser.add_argument("--http-port", type=int, default=SERVER_PORT, help="Local dashboard HTTP port")
    args = parser.parse_args()

    reader = threading.Thread(target=serial_reader, args=(args.port, args.baud), daemon=True)
    reader.start()

    server = ThreadingHTTPServer((SERVER_HOST, args.http_port), Handler)
    print(f"Trainer Board live dashboard: http://{SERVER_HOST}:{args.http_port}")
    print(f"Reading {args.port} @ {args.baud}")
    server.serve_forever()


if __name__ == "__main__":
    main()
