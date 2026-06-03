# Reflex Lab 01 Evidence Packet Guide

This guide explains what to put beside the dashboard-exported evidence packet.
The packet is a draft until a human adds physical artifacts and checks the
claim boundary.

## Packet Claim

Use this narrow claim:

```text
This Reflex Lab 01 build ran threshold_reflex_v0 on an ESP32 breadboard setup
and produced replayable evidence of the pot input, guard decision, LED output,
buzzer output, and button mute behavior.
```

Do not claim certified safety, production control, autonomous operation, or
high-current validation.

## Required Artifacts

Save these files in the same packet folder:

- `live_trace.jsonl` - exported JSONL capture from the dashboard.
- `replay.html` - exported replay HTML.
- `dashboard_graph.png` or `dashboard_screenshot.png` - the visual graph.
- `validation_output.txt` - output from `tools/validate_trace.py`.
- `replay_output.txt` - output from `tools/replay_trace.py`.
- `FINDINGS.md` - short human notes about what happened.
- `PACKET_MANIFEST.json` - generated after all files are in place.

## Physical Photos

Take enough photos that another person can understand the build without
trusting your memory.

- `01_parts_layout.jpg` - all components before wiring.
- `02_esp32_on_mini_breadboards.jpg` - ESP32 on the two mini breadboards.
- `03_power_and_ground.jpg` - 3V3 and GND jumpers.
- `04_pot_wiring.jpg` - potentiometer, wiper, and GPIO34 path.
- `05_led_resistor_path.jpg` - resistor, LED anode, LED cathode, and return.
- `06_button_buzzer_path.jpg` - GPIO27 button and GPIO26 buzzer path.
- `07_final_powered_build.jpg` - final powered build.
- `08_dashboard_live_capture.png` - dashboard during or after capture.
- `09_button_mute_action.jpg` - optional still showing the button press.

## Tutorial Or Video Links

If there is a tutorial video, add:

- YouTube URL.
- Visibility: public, unlisted, or private.
- Timestamp where the final live capture starts.
- Timestamp where button mute is demonstrated.
- Any mismatch between the video and final wiring.

If no video is published yet, write `not published` instead of leaving the field
ambiguous.

## Human Findings

`FINDINGS.md` should answer:

- How many guard events happened?
- How long was the guard enabled?
- Did the LED and buzzer follow the guarded output?
- Did the button mute the buzzer while pressed?
- Did anything fail, reset, get warm, or behave unexpectedly?
- What claim is blocked by this packet?

## Review

Before calling the packet reviewed:

1. Open `replay.html` and inspect the graph.
2. Compare the replay to the physical photos.
3. Confirm the packet says `review_status: draft` until review is done.
4. Confirm `certified_safety_claim` is `false`.
5. Confirm `production_controller_claim` is `false`.
6. Run the manifest tool after every artifact is added.

```powershell
python tools\make_packet.py evidence\courses\reflex_lab_01\PACKET_ID --out evidence\courses\reflex_lab_01\PACKET_ID\PACKET_MANIFEST.json
```

