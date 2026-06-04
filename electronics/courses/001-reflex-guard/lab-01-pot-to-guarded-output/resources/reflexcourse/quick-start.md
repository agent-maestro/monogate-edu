# Reflex Lab 01 Quick Start

## EML On Real Hardware - Reflex Course

One EML kernel -> verifiable decisions -> physical output.

Build the first demo with:

- ESP32 DevKit or ESP32 ESP-32S breakout;
- breadboard;
- 10k potentiometer;
- LED;
- 220 ohm or 330 ohm LED resistor;
- tactile button;
- passive piezo buzzer;
- 1 kOhm buzzer resistor;
- jumper wires;
- USB data cable.

Before wiring, follow the [Computer Setup Guide](setup-guide.pdf). It has the
Windows | Mac install path, preferred browser notes, ESP32 port examples, and
dashboard troubleshooting.

## The Loop

```text
potentiometer + button -> threshold_reflex_v0 -> guard clamp -> LED/buzzer -> trace -> replay
```

## Wire It

### Reflex Lab 01A

1. ESP32 GND -> breadboard blue/- rail.
2. ESP32 3V3 -> breadboard red/+ rail.
3. Pot outer leg -> red/+ rail.
4. Pot middle wiper -> GPIO34.
5. Pot other outer leg -> blue/- rail.
6. GPIO25 -> resistor.
7. Resistor -> LED long leg/anode.
8. LED short leg/cathode -> blue/- rail.

Program and inspect the LED dashboard before adding more parts.

### Reflex Lab 01B

Disconnect USB, then add:

9. GPIO27 -> tactile button.
10. Button other side -> blue/- rail.
11. GPIO26 -> 1 kOhm resistor.
12. Resistor -> piezo + leg.
13. Piezo - leg -> blue/- rail.

The button/header step is the expansion pattern: future modules can dock into
the same disciplined input/output layout without changing the evidence model.

## Run It

Preferred browser: Chrome or Edge. Safari is fine for reading the course docs,
but Chrome or Edge is the supported dashboard path.

Validate before hardware:

```powershell
python tools\validate_kernel_spec.py kernels\threshold_reflex_v0
python tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
python tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

Then upload:

```powershell
arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32 kernels\threshold_reflex_v0\esp32\threshold_reflex_v0
arduino-cli monitor -p COM3 -c baudrate=115200
```

Replace `COM3` with your ESP32 port.

On Mac, the ESP32 port usually looks like `/dev/cu.usbserial-*`,
`/dev/cu.SLAB_USBtoUART`, or `/dev/cu.wchusbserial*`. Use the `cu` port and the
same `115200` baud rate. The Mac path follows the standard ESP32/macOS workflow
and is pending a Monogate bench-verified Mac run.

## Safety

- Use 3.3V only.
- Never connect the potentiometer to VIN/5V.
- Always keep the resistor in series with the LED.
- Disconnect USB before adding the Lab 01B button and buzzer parts.
- Keep the 1 kOhm resistor in series with the passive piezo buzzer.
- If anything gets warm, unplug USB immediately.
- Do not add motors, relays, solenoids, coils, or high-current parts in Lab 01.

## Evidence

Save:

- a breadboard photo;
- `live_trace.jsonl`;
- validation output;
- replay output;
- short `FINDINGS.md`.

The first win is not only a blinking LED or faint buzzer. It is a physical
output with a replayable guard decision behind it.
