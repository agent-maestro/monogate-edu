# Reflex Lab 01 Computer Setup Guide

This guide gets your laptop ready before the physical build. The circuit is the
same on Windows and Mac. The setup differences are mostly USB ports, browser
choice, and how you launch the local dashboard.

## Quick Start

Use this if you already know Arduino IDE.

| Step | Windows | Mac |
| --- | --- | --- |
| Browser | Chrome or Edge preferred | Chrome or Edge preferred |
| Arduino IDE | Install Arduino IDE 2.x | Install Arduino IDE 2.x |
| ESP32 board package | Install `esp32 by Espressif Systems` | Install `esp32 by Espressif Systems` |
| ESP32 port shape | `COM3`, `COM6`, etc. | `/dev/cu.usbserial-*`, `/dev/cu.SLAB_USBtoUART`, or `/dev/cu.wchusbserial*` |
| Firmware path | `kernels\threshold_reflex_v0\esp32\threshold_reflex_v0\threshold_reflex_v0.ino` | `kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino` |
| Serial speed | `115200` baud | `115200` baud |
| Local dashboard | Use `start-reflex-dashboard.bat` | Run `dashboard.py` with `python3` |

Mac note: these Mac instructions follow the standard ESP32/macOS workflow. The
course is ready for Mac students, but the Mac bench path should be marked
`Mac standard workflow, not yet Monogate bench-verified` until a tester records
a full Mac upload and dashboard run.

## Preferred Browser

Use Chrome or Edge for the course dashboard path.

Safari is fine for reading the lab packet, but do not rely on Safari for direct
browser serial workflows. Web Serial is a Chromium-browser feature on desktop;
Chrome and Edge are the supported student path. The local Python dashboard does
the actual serial reading in this lab, but Chrome or Edge keeps the experience
closest to future browser-serial labs.

## Install Arduino IDE

1. Download Arduino IDE 2.x:

```text
https://www.arduino.cc/en/software
```

2. Install it normally.
3. Open Arduino IDE once before plugging in the ESP32.

## Add ESP32 Board Support

1. Open Arduino IDE.
2. Go to `File` -> `Preferences`.
3. In `Additional boards manager URLs`, add:

```text
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

4. Go to `Tools` -> `Board` -> `Boards Manager`.
5. Search for `esp32`.
6. Install `esp32 by Espressif Systems`.

## Open The Firmware

Open this file in Arduino IDE:

```text
kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino
```

Select:

```text
Tools -> Board -> esp32 -> ESP32 Dev Module
```

If your board has a more specific name, use the board vendor's name. For the
generic ESP32 DevKit used in this course, `ESP32 Dev Module` is the normal
starting choice.

## Find Your ESP32 Port

Plug in the ESP32 with a data-capable USB cable.

### Windows

In Arduino IDE:

```text
Tools -> Port
```

Choose the port that appears when the ESP32 is plugged in. It will look like:

```text
COM3
COM6
COM7
```

If you are unsure, unplug the ESP32, check the menu, plug it back in, and see
which COM port appears.

### Mac

In Arduino IDE:

```text
Tools -> Port
```

Choose the port that appears when the ESP32 is plugged in. It may look like:

```text
/dev/cu.usbserial-0001
/dev/cu.SLAB_USBtoUART
/dev/cu.wchusbserial*
```

Use the `cu` port, not the matching `tty` port, when both are visible.

## Upload Firmware

1. Confirm the board is wired safely or disconnected from extra parts.
2. Select the ESP32 board and serial port.
3. Click `Verify`.
4. Click `Upload`.
5. If upload fails while connecting, hold the ESP32 `BOOT` button when Arduino
   says it is connecting, then release when writing begins.

Open Serial Monitor at:

```text
115200 baud
```

You should see JSONL-style frames after the firmware is running.

## Run The Local Dashboard

The dashboard displays the ESP32 serial frames and lets you export evidence.
Close Arduino Serial Monitor before starting the dashboard; only one program
should read the serial port at a time.

### Windows Dashboard

From the downloaded course folder, double-click:

```text
courses\001-reflex-guard\lab-bundle\start-reflex-dashboard.bat
```

If your ESP32 is not on `COM6`, set the port from PowerShell:

```powershell
$env:MG_SERIAL_PORT = "COM7"
.\courses\001-reflex-guard\lab-bundle\start-reflex-dashboard.ps1
```

Then open:

```text
http://127.0.0.1:5191/visualizer
```

### Mac Dashboard

The packaged one-click launcher is Windows-only for this release. On Mac, run
the same dashboard directly from Terminal.

From the downloaded `monogate-edu` folder:

```bash
python3 -m pip install pyserial
python3 electronics/dashboards/esp32-arduino/dashboard.py --port /dev/cu.usbserial-0001 --baud 115200
```

Replace `/dev/cu.usbserial-0001` with your actual ESP32 port.

Then open Chrome or Edge to:

```text
http://127.0.0.1:5191/visualizer
```

## Troubleshooting

### The ESP32 Powers On But No Port Appears

- Try another USB cable first. Many USB cables are charge-only.
- Try another USB port on the laptop.
- Unplug the ESP32, reopen `Tools -> Port`, plug it back in, and watch what
  appears.
- If your board uses a CP210x or CH340 USB serial chip, install the current
  driver from the chip or board vendor.
- On Mac, if a driver install asks for approval, check `System Settings` ->
  `Privacy & Security`, approve the driver, and restart if the installer asks.

### Upload Fails

- Confirm `ESP32 Dev Module` or the correct board variant is selected.
- Confirm the correct port is selected.
- Close Serial Monitor and the local dashboard before uploading.
- Hold `BOOT` during the "Connecting..." step if your board needs manual boot
  mode.
- Try a lower upload speed in Arduino IDE if the board is flaky.

### The Dashboard Says Offline

- Close Arduino Serial Monitor.
- Confirm the firmware was uploaded successfully.
- Confirm the dashboard port matches the Arduino port.
- Confirm the baud rate is `115200`.
- Install `pyserial` if the dashboard reports that serial support is missing:

```bash
python3 -m pip install pyserial
```

On Windows, use:

```powershell
python -m pip install pyserial
```

### The Browser Does Not See Serial Features

- Use Chrome or Edge.
- Do not use Safari for direct Web Serial workflows.
- If you are using the local Python dashboard, the browser is only showing the
  dashboard page. The Python process is the part reading serial.

### The Buzzer Or LED Does Not Respond

- Recheck the simulator wiring checklist before blaming the computer.
- Confirm ESP32 GND, pot ground, LED cathode, button ground, and buzzer ground
  all share the same ground net.
- Confirm the LED has its 220 ohm or 330 ohm resistor.
- Confirm the buzzer path uses the 1 kOhm resistor.
- Confirm the button goes to GPIO27 and ground; firmware uses it to mute only
  the buzzer branch.

## What To Record

For a Mac bench validation later, capture:

- screenshot of Arduino IDE board selection;
- screenshot of Arduino IDE port selection;
- successful upload message;
- dashboard showing live frames;
- exported JSONL trace;
- note with board model, USB cable type, browser, and macOS version.

For Windows, record the same items with the COM port shown.
