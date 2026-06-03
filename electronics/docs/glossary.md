# Monogate Electronics Living Glossary

This glossary explains the terms used across Monogate Electronics courses. It
is intentionally plain-spoken: first understand the idea, then add precision as
the labs grow.

This is a living document. New courses can add terms, examples, diagrams, and
links without changing the Course 001 release gate.

## How To Read This Glossary

Each term includes:

- **Definition** - a short learner-facing explanation.
- **Course 001 example** - where the idea appears in Reflex Lab 01.
- **See also** - nearby terms worth reading next.

## Monogate And Evidence Terms

### Claim Flag

**Definition:** A field or note that says what a lab is, and is not, claiming.

**Course 001 example:** A simulated browser run should mark
`hardware_observed: false`. A live ESP32 serial capture may mark
`hardware_observed: true` only when real capture metadata and samples exist.

**See also:** Evidence Packet, Hardware Observed, Non-Claim.

### Evidence Packet

**Definition:** A structured folder or JSON document that records what happened
in a lab: source files, trace samples, replay output, comparison notes, photos
or screenshots, and claim boundaries.

**Course 001 example:** Lab 02 teaches how to collect a JSONL trace, replay it,
write findings, and keep unsupported claims blocked.

**See also:** Trace, Replay, Claim Flag.

### Golden Trace

**Definition:** A trusted reference trace for a known scenario. It is useful for
comparison, validation, and regression checks.

**Important boundary:** A golden trace is not proof that every future hardware
run is correct. It is a reference behavior for a specific test case.

**Course 001 example:** `kernels/threshold_reflex_v0/traces/golden_trace.jsonl`
shows expected Reflex Guard behavior for a small sequence of potentiometer
inputs.

**See also:** Trace, Replay, Validation.

### Guard

**Definition:** The part of a control loop that keeps a requested output inside
the lab boundary.

**Course 001 example:** The kernel may request more LED output than the lab
allows; the guard clamps the output to the safe limit.

**See also:** Clamp, Requested Output, Safe Output.

### Guard Clamp

**Definition:** The specific action where a guard limits a value to a maximum or
minimum allowed value.

**Course 001 example:** If the requested output rises above `0.85`, the safe
output is clamped to `0.85`.

**See also:** Clamp, Guard, Safe Output.

### Hardware Observed

**Definition:** A claim that data came from a physical device, not only from a
simulator or example file.

**Course 001 example:** Browser simulation is not hardware observed. Live serial
frames from the ESP32 can be hardware observed when they include real capture
metadata and raw sample rows.

**See also:** Claim Flag, Live Capture, Simulation.

### Kernel

**Definition:** A small decision rule that maps input and previous state into
requested output.

**Course 001 example:** `threshold_reflex_v0` reads the potentiometer input,
applies threshold/rate behavior, and requests LED/buzzer output.

**See also:** EML, Requested Output, Guard.

### Live Capture

**Definition:** Data recorded from a physical device during an actual run.

**Course 001 example:** The local dashboard can read ESP32 serial frames and
export a live JSONL trace.

**See also:** Hardware Observed, Trace, Evidence Packet.

### Non-Claim

**Definition:** An explicit statement about what the course does not prove or
promise.

**Course 001 example:** Reflex Lab 01 is not a certified safety controller, not
a production controller, and not a high-power actuator system.

**See also:** Claim Flag, Safety Boundary.

### Replay

**Definition:** Reading a recorded trace later to inspect the same frames again.

**Course 001 example:** `tools/replay_trace.py` summarizes the golden trace or a
captured hardware trace.

**See also:** Trace, Golden Trace, Evidence Packet.

### Requested Output

**Definition:** What the kernel asks for before the guard applies limits.

**Course 001 example:** The potentiometer can drive the kernel toward a high
requested LED output.

**See also:** Safe Output, Guard Clamp.

### Safe Output

**Definition:** The output after the guard applies the lab boundary.

**Course 001 example:** The requested output may be `1.0`, but safe output is
limited to `0.85`.

**See also:** Requested Output, Guard, Clamp.

### Simulation

**Definition:** A software model that lets a learner inspect behavior without
claiming physical observation.

**Course 001 example:** The browser simulator emits simulated frames until live
serial capture is attached.

**See also:** Hardware Observed, Claim Flag.

### Trace

**Definition:** A recorded sequence of frames showing inputs, outputs, guard
actions, and metadata.

**Course 001 example:** Each JSONL line can include potentiometer value,
requested output, safe output, LED/buzzer state, and guard action.

**See also:** Replay, Golden Trace, Evidence Packet.

### Validation

**Definition:** A check that a file or run follows the expected schema and basic
rules.

**Course 001 example:** `tools/validate_trace.py` checks that the golden trace
has valid frames.

**See also:** Golden Trace, Replay.

## Circuit And Electronics Terms

### ADC

**Definition:** Analog-to-Digital Converter. It turns a voltage into a number a
microcontroller can read.

**Course 001 example:** GPIO34 reads the potentiometer voltage as an ADC value.

**See also:** GPIO, Potentiometer, Voltage Divider.

### Breadboard

**Definition:** A reusable board for prototyping circuits without soldering.
Holes in the same row are electrically connected in groups.

**Course 001 example:** Reflex Lab 01 uses a breadboard for the ESP32, pot,
LED, button, buzzer, and resistors.

**See also:** Jumper Wire, Schematic.

### Buzzer

**Definition:** A part that makes sound. A passive piezo buzzer needs a changing
signal or tone; an active buzzer may buzz when voltage is applied.

**Course 001 example:** Lab 01B uses a passive piezo buzzer through a 1 kOhm
resistor on GPIO26.

**See also:** PWM, Resistor, GPIO.

### Capacitor

**Definition:** A component that stores electric charge and can smooth or time
voltage changes.

**Course 001 example:** Course 001 does not require a capacitor. Later courses
may use capacitors for RC timing or filtering.

**See also:** RC Time Constant, Voltage.

### Current

**Definition:** The flow of electric charge through a circuit, measured in amps.

**Course 001 example:** The LED resistor limits current so the LED and GPIO pin
stay in a safer learning range.

**See also:** Voltage, Resistance, Ohm's Law.

### GPIO

**Definition:** General Purpose Input/Output pin on a microcontroller.

**Course 001 example:** GPIO34 reads the pot, GPIO25 drives the LED, GPIO26
drives the buzzer, and GPIO27 reads the button.

**See also:** ADC, PWM, Pull-Up.

### Ground

**Definition:** The shared reference point for voltages in the circuit.

**Course 001 example:** ESP32 GND, pot low side, LED cathode, button return, and
buzzer return all share ground.

**See also:** Voltage, Breadboard.

### Jumper Wire

**Definition:** A small wire used to connect breadboard rows, rails, and module
pins.

**Course 001 example:** Red jumpers often carry 3V3, while blue/green/black
jumpers often carry ground or signal returns.

**See also:** Breadboard, Schematic.

### Kirchhoff's Current Law

**Definition:** Current entering a node equals current leaving that node.

**Course 001 example:** This helps explain why all current paths must return to
ground.

**See also:** Current, Ground.

### Kirchhoff's Voltage Law

**Definition:** The voltage changes around a closed loop add up to zero.

**Course 001 example:** This is part of why the LED path needs source, resistor,
LED, and return.

**See also:** Voltage, Ohm's Law.

### LED

**Definition:** Light Emitting Diode. It lights when current flows in the
correct direction.

**Course 001 example:** GPIO25 drives the LED through a resistor. The long leg
is usually the anode; the short leg is usually the cathode.

**See also:** Resistor, Current, GPIO.

### Ohm's Law

**Definition:** `V = I * R`. Voltage equals current times resistance.

**Course 001 example:** The LED resistor uses resistance to limit current.

**See also:** Voltage, Current, Resistance.

### Potentiometer

**Definition:** A variable resistor often used as a knob.

**Course 001 example:** The pot creates an adjustable voltage for GPIO34.

**See also:** ADC, Voltage Divider.

### Pull-Up

**Definition:** A resistor or internal setting that holds an input high when
nothing else is driving it.

**Course 001 example:** GPIO27 uses `INPUT_PULLUP`; pressing the button connects
the pin to ground.

**See also:** GPIO, Button.

### PWM

**Definition:** Pulse Width Modulation. A digital output switches quickly on and
off so the average level behaves like a dimmed output or tone control.

**Course 001 example:** GPIO25 can use PWM-style output for LED brightness;
GPIO26 can drive buzzer tone.

**See also:** GPIO, LED, Buzzer.

### Resistance

**Definition:** Opposition to current flow, measured in ohms.

**Course 001 example:** The LED resistor and buzzer resistor limit current in
their output paths.

**See also:** Resistor, Ohm's Law.

### Resistor

**Definition:** A component with a known resistance.

**Course 001 example:** Lab 01 uses a 330 ohm LED resistor and a 1 kOhm buzzer
resistor.

**See also:** Resistance, Current.

### Schematic

**Definition:** A symbolic drawing of a circuit.

**Course 001 example:** The reference schematic shows how GPIO34, GPIO25,
GPIO26, GPIO27, 3V3, and GND connect.

**See also:** Breadboard, Jumper Wire.

### Serial Monitor

**Definition:** A tool that shows text sent from a microcontroller over USB
serial.

**Course 001 example:** The ESP32 prints JSON frames at `115200` baud for the
dashboard and replay tools.

**See also:** Trace, Live Capture.

### Voltage

**Definition:** Electrical potential difference, measured in volts.

**Course 001 example:** The ESP32 provides 3.3V. The potentiometer divides that
voltage into an ADC-readable signal.

**See also:** Current, Ground, Ohm's Law.

### Voltage Divider

**Definition:** A circuit that creates a smaller voltage from a larger one using
two resistive paths.

**Course 001 example:** The potentiometer acts like an adjustable voltage
divider between 3V3 and GND.

**See also:** Potentiometer, ADC.

## Tools And Measurement Terms

### Arduino IDE

**Definition:** A beginner-friendly editor and uploader for Arduino-style
microcontroller sketches.

**Course 001 example:** Learners can open and upload the
`threshold_reflex_v0.ino` firmware with Arduino IDE.

**See also:** Firmware, Serial Monitor.

### Arduino CLI

**Definition:** A command-line tool for compiling and uploading Arduino-style
firmware.

**Course 001 example:** The lab packet includes optional `arduino-cli upload`
commands.

**See also:** Firmware, ESP32.

### ESP32

**Definition:** A microcontroller board with GPIO pins, ADC inputs, PWM-capable
outputs, USB serial, Wi-Fi/Bluetooth features, and more.

**Course 001 example:** Reflex Lab 01 uses an ESP32 DevKit-style board.

**See also:** GPIO, ADC, PWM.

### Firmware

**Definition:** Code that runs on a microcontroller.

**Course 001 example:** `threshold_reflex_v0.ino` reads inputs, applies the
guarded loop, drives outputs, and emits trace frames.

**See also:** Kernel, Trace.

### Multimeter

**Definition:** A handheld tool for measuring voltage, resistance, and sometimes
current.

**Course 001 example:** A multimeter can confirm the breadboard has 3.3V and
ground where expected.

**See also:** Voltage, Resistance.

### Oscilloscope

**Definition:** A tool that shows voltage changing over time.

**Course 001 example:** Not required for Course 001, but useful later for PWM,
button bounce, and signal timing.

**See also:** PWM, Trace.

## Math And Signal Terms

### Clamp

**Definition:** Force a value to stay within a minimum and maximum.

**Course 001 example:** Safe output is clamped to `0.85`.

**See also:** Guard Clamp.

### Deadband

**Definition:** A range where small input changes do not change the output.

**Course 001 example:** Course 001 uses threshold/rate behavior. Course 002
introduces deadband more directly.

**See also:** Threshold.

### Exponential Decay

**Definition:** A smooth decrease described by `e^(-t/tau)`.

**Course 001 example:** Not required in Course 001. Later RC labs use this to
describe capacitor discharge.

**See also:** RC Time Constant.

### Normalization

**Definition:** Convert a value into a standard range, often `0.0` to `1.0`.

**Course 001 example:** ADC readings are normalized so the kernel can work with
portable values instead of raw counts only.

**See also:** ADC, Kernel.

### RC Time Constant

**Definition:** `tau = R * C`. It describes how quickly an RC circuit charges
or discharges.

**Course 001 example:** Not required in Course 001. It appears in later
electronics math labs.

**See also:** Capacitor, Resistance.

### Threshold

**Definition:** A boundary where behavior changes.

**Course 001 example:** `threshold_reflex_v0` responds differently as the
potentiometer crosses the configured threshold region.

**See also:** Deadband, Guard.

