# Reflex Lab 01 Local Lab Bundle

This folder is the learner-facing hardware dashboard launcher for Reflex Lab 01.

The web course and simulator run in the browser. The physical ESP32 dashboard
needs a local helper because it reads the board's serial port.

## Quick Start

1. Plug in the ESP32 with a data-capable USB cable.
2. Double-click `start-reflex-dashboard.bat`.
3. Wait for the browser to open:

```text
http://127.0.0.1:5191/visualizer
```

4. If the dashboard says the port is offline, confirm the ESP32 port. The
   default is `COM6`.

## Optional Port Override

From PowerShell:

```powershell
$env:MG_SERIAL_PORT = "COM7"
.\courses\001-reflex-guard\lab-bundle\start-reflex-dashboard.ps1
```

Optional baud override:

```powershell
$env:MG_SERIAL_BAUD = "115200"
```

## What This Starts

The launcher starts:

```powershell
python dashboards\esp32-arduino\dashboard.py --port COM6 --baud 115200
```

Then it opens the Guard Trace Console visualizer.

## Evidence Outputs

From the dashboard, export:

- JSONL trace;
- replay HTML;
- graph PNG or screenshot;
- evidence packet starter.

Those outputs become part of the course evidence packet.

## Boundary

This is a local lab helper, not cloud software. It does not upload serial data
or certify hardware behavior.

