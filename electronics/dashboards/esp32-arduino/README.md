# ESP32 / Arduino Dashboard

Local live dashboard for Trainer Board and other ESP32/Arduino bench courses.

This dashboard is for operator-approved live bench work. It reads JSON serial
frames from a local board, displays the live state, and can save/replay captures.

Default local run:

```powershell
python dashboards\esp32-arduino\dashboard.py --port COM6 --baud 115200
```

Reflex Lab 01 learner launcher:

```powershell
.\courses\001-reflex-guard\lab-bundle\start-reflex-dashboard.ps1
```

Then open:

```text
http://127.0.0.1:5191/
```

The default page is the Guard Trace Console visualizer. The old compact serial
board remains available as a diagnostic page:

```text
http://127.0.0.1:5191/live-board
```

Modes:

- `Live Visualizer`: reads the connected board serial stream in the graph/log
  console.
- `Replay Capture`: replays the latest saved JSONL capture.
- `Example Trace`: replays packaged simulated frames for offline demos.
- `Diagnostics`: opens `/live-board`, the raw compact serial board.
- `Visualizer`: `/` and `/visualizer` both open the graph/story view with live signals,
  clamp highlighting, optional guard-clamp tone, and JSONL/CSV/PNG downloads.
  The v1 graph makes safe output the hero trace and keeps request secondary.
  Request appears as a dashed auto trace only inside clamp regions, and can
  still be toggled on for a full debugging trace.
  Clamp activation gets a brief visual flash, release gets a softer green flash,
  then the chart settles into low-opacity regions so the important moments are
  obvious without making the whole trace noisy. A short clamp label marks the
  disagreement between requested and safe output. Recent Events is the primary
  human-readable trace surface; Evidence Boundary is collapsed by default
  because it is mostly for audit context.

Visualizer sound policy:

- Sound is off by default.
- The current simple sound mode is guard-clamp-only: it fires on clamp
  activation, which is the highest-value teaching moment.
- Clamp release and LED threshold sounds are reserved for a future verbose mode.
- There is no sound for every serial frame and no sound for ordinary pot motion.

Evidence boundary:

- Live Board frames may be hardware-observed when they come from the physical serial port.
- Replay Capture frames preserve whatever source produced the capture.
- Example Trace is not hardware-observed.
- The dashboard displays serial/replay evidence. It does not recompute the firmware or kernel.
