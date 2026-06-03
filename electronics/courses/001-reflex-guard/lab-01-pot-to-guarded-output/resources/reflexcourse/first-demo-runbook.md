# Reflex Course First Demo Runbook

Status: ready for bench rehearsal.

Use this runbook for the first Monogate Reflex Course tutorial build.

The first demo is intentionally small:

```text
potentiometer -> threshold_reflex_v0 -> guard clamp -> LED -> serial trace -> replay
```

The goal is not to make a complicated circuit. The goal is to prove the
Monogate loop with one visible control decision.

## What This Demo Proves

This demo should let a learner point to each part of the chain:

```text
EML kernel spec
golden simulated trace
ESP32 adapter sketch
physical input and output
captured JSONL trace
validator and replay output
evidence note
```

The LED is the visible output. The trace is the durable claim.

## Files To Open First

Read these in order:

```text
kernels/threshold_reflex_v0/kernel.eml
kernels/threshold_reflex_v0/kernel.json
kernels/threshold_reflex_v0/traces/golden_trace.jsonl
courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/kernel-modes.md
```

Optional if filming a tutorial:

```text
courses/001-reflex-guard/lab-01-pot-to-guarded-output/resources/reflexcourse/video-shot-list.md
```

## Parts

Required:

- ESP32 DevKit V1 or similar;
- USB data cable;
- breadboard;
- jumper wires;
- 10k potentiometer;
- LED;
- 220 ohm or 330 ohm resistor.

Optional after the LED path works:

- piezo buzzer;
- momentary button;
- SSD1306 I2C OLED;
- BME280 I2C sensor.

Do not use:

- motors;
- relays;
- coils or electromagnets;
- solenoids;
- mains voltage;
- unknown high-current buzzer modules.

## Non-Hardware Rehearsal

From the repo root:

```powershell
python tools\validate_kernel_spec.py kernels\threshold_reflex_v0
python tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
python tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

Expected validation summary:

```text
Trace validation: 7/7 valid, 0 invalid
```

Do this before wiring anything. It proves the behavior exists before the bench
demo.

## Breadboard Wiring

Use the breadboard for the Course 01 release. Soldered/perfboard builds are
future work and are not part of this runbook.

### Potentiometer

Wire:

```text
pot outer leg 1 -> ESP32 3V3
pot outer leg 2 -> ESP32 GND
pot wiper      -> ESP32 GPIO34
```

GPIO34 is input-only and must never receive more than 3.3V.

### LED

Wire:

```text
ESP32 GPIO25 -> resistor -> LED anode
LED cathode  -> GND
```

Use a 220 ohm or 330 ohm resistor in series.

### Ground

All logic grounds must be common:

```text
ESP32 GND -> breadboard GND rail
```

## First Firmware

Use:

```text
kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino
```

The sketch hand-maps the current `threshold_reflex_v0` EML parameters:

```text
threshold = 0.55
width = 0.10
max_step = 0.20
safe_output_limit = 0.85
```

For the first demo, treat the sketch as an adapter between the ESP32 pins and
the EML kernel contract.

The sketch keeps buzzer output disabled by default:

```text
ENABLE_BUZZER = false
```

Do not enable it until the LED-only trace has validated and the buzzer current
path has been reviewed.

## First Power-Up

Use a simple USB path first:

```text
laptop or USB power bank -> ESP32 USB port
```

Before power:

- LED resistor is in series;
- potentiometer outer legs go to 3V3 and GND;
- potentiometer wiper goes to GPIO34;
- no 3V3-to-GND short is present;
- no motor, relay, coil, or external supply is connected.

## What To Observe

When the potentiometer is below the threshold region, the LED should be off or
dim.

As the potentiometer rises through the threshold region, the LED should brighten
gradually.

When the requested output would exceed the safe limit, the trace should show:

```text
guard_action = clamp_to_safe_output
safe_output = 0.85
```

The point of the demo is to make that guard action visible.

## Serial Trace Capture

Only capture live serial when the operator approves.

Save captured frames as JSONL in a new evidence folder:

```text
evidence/reflexcourse/first_reflex_demo_YYYY_MM_DD/live_trace.jsonl
```

Each frame should look like:

```json
{"schema_version":"monogate-electronics.trace-frame.v0","kernel_id":"threshold_reflex_v0","source":"reflexcourse","mode":"reflex","sample_index":0,"timestamp_ms":20,"pot_raw":0.0,"outputs":{"requested_output":0.0,"safe_output":0.0,"led":0.0,"buzzer":0.0,"stepper":0.0},"guard":{"guard_action":"pass_through","requested_output":0.0,"safe_output":0.0,"safety_margin":0.85,"bottleneck":"output_duty_margin"}}
```

Then validate:

```powershell
python tools\validate_trace.py evidence\reflexcourse\first_reflex_demo_YYYY_MM_DD\live_trace.jsonl
python tools\replay_trace.py evidence\reflexcourse\first_reflex_demo_YYYY_MM_DD\live_trace.jsonl
```

## Evidence To Save

Create:

```text
evidence/reflexcourse/first_reflex_demo_YYYY_MM_DD/FINDINGS.md
```

Start from:

```text
evidence/reflexcourse/FINDINGS_TEMPLATE.md
```

Save:

- `live_trace.jsonl`;
- validation command output;
- replay command output;
- breadboard photo;
- wiring notes;
- any no-go condition or correction.

Then create a manifest:

```powershell
python tools\make_packet.py evidence\reflexcourse\first_reflex_demo_YYYY_MM_DD --out evidence\reflexcourse\first_reflex_demo_YYYY_MM_DD\PACKET_MANIFEST.json
```

## Future Board Notes

Future permanent trainer boards should preserve the same signal plan:

```text
GPIO34 POT
GPIO25 LED
GPIO26 BUZZER later
GPIO27 BUTTON later
GPIO21 SDA later
GPIO22 SCL later
3V3 and GND logic rails
```

That permanent-board work is intentionally out of scope for the Course 01
release.

## Stop Conditions

Stop immediately if:

- any part heats unexpectedly;
- the ESP32 resets repeatedly;
- the LED is wired without a resistor;
- 3V3 and GND appear shorted;
- the potentiometer is connected to 5V;
- a buzzer module current is unknown;
- the wiring differs from this runbook.

## Tutorial Closing Line

The closing claim should be narrow and strong:

```text
This board ran threshold_reflex_v0 on real low-voltage hardware and produced a
trace that can be validated and replayed.
```

Do not claim certified safety, production readiness, autonomous control, or
high-current actuator validation.
