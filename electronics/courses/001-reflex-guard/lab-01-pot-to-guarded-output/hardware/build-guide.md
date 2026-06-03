# Reflex Lab 01 Build Guide

The detailed learner-facing build lives in
[resources/reflexcourse/lab-packet.md](../resources/reflexcourse/lab-packet.md).
This file is the short release-structure guide.

## 01A: Pot And LED

1. Place the ESP32 across the two mini breadboards.
2. Connect ESP32 3V3 to the breadboard positive rail.
3. Connect ESP32 GND to the breadboard negative rail.
4. Wire the 10 kOhm potentiometer:
   - one outer leg to 3V3;
   - one outer leg to GND;
   - center wiper to GPIO34.
5. Wire the LED path:
   - GPIO25 to 330 ohm resistor;
   - resistor to LED anode;
   - LED cathode to GND.
6. Plug in USB and program the ESP32.
7. Start the local dashboard with
   `courses\001-reflex-guard\lab-bundle\start-reflex-dashboard.bat`.
8. Verify pot, safe output, LED, and guard behavior.

## 01B: Button And Buzzer

1. Disconnect USB before changing wiring.
2. Wire GPIO26 through the 1 kOhm resistor to the passive piezo positive side.
3. Wire passive piezo negative side to GND.
4. Wire GPIO27 through the tactile button to GND.
5. Reconnect USB.
6. Verify the buzzer follows the guarded output.
7. Press the button and confirm the dashboard reports button down and buzzer
   mute behavior.

## Capture

Use the dashboard to export:

- JSONL trace;
- replay HTML;
- graph PNG or screenshot;
- evidence packet starter.

Then add photos and human findings using the evidence packet guide.
