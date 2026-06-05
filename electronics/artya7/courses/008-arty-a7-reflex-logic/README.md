# Course 008: Arty A7 Reflex Logic

Status: planning skeleton

Track: Forge Logic Series

This is the first Arty A7 / FPGA course. It moves the familiar Monogate reflex
loop from an ESP32 firmware setting into synchronous digital hardware:

```text
switches -> fixed-point reflex kernel -> guard clamp -> LEDs/RGB LEDs -> UART trace -> evidence packet
```

The first release should use only the Arty A7 onboard controls and outputs.
Pmods are optional upgrades after the onboard loop is understood.

## Course Claim

A learner can inspect a small FPGA design that maps switch input into a bounded
output, proves the clamp in simulation, and optionally captures UART JSONL from
the physical Arty A7 after explicit programming approval.

This course does not claim EML-to-Verilog correctness, production safety,
certified timing closure, or general FPGA design mastery.

## Core Build

Required hardware:

- Digilent Arty A7.
- USB data cable.
- Onboard slide switches.
- Onboard push buttons.
- Onboard LEDs and RGB LEDs.

No external breadboard, Pmod, sensor, speaker, motor, relay, solenoid, or
external power supply is required for the core course.

## Optional Upgrades

Use these only after the core onboard loop is complete:

- Pmod 8LD for a larger LED output surface.
- Pmod SSD for numeric safe-output or clamp state display.
- Pmod ENC for live parameter input.
- Pmod ALS or COLOR for a later sensor-driven FPGA course.
- Pmod VGA, OLEDrgb, or I2S2 for later Signal Weaver courses.

## Existing Repo Assets

The first draft should reuse:

- `boards/arty_a7/README.md`
- `boards/arty_a7/PIN_MAP.md`
- `boards/arty_a7/rtl/`
- `boards/arty_a7/constraints/arty_a7_reflex.xdc`
- `boards/arty_a7/validation/sim/`
- `boards/arty_a7/validation/simulate_fpga_reflex.py`
- `boards/arty_a7/validation/validate_fpga_frame.py`
- `evidence/reports/arty_a7_live_bench_handoff_2026_05_16.md`

## Lab Sequence

1. [Lab 01: Simulated Switch Guard](lab-01-simulated-switch-guard/README.md)
   - Generate and validate the FPGA-style JSONL trace without programming hardware.
2. [Lab 02: Onboard LED And UART Bring-Up](lab-02-onboard-led-uart/README.md)
   - Optional hardware lab: program volatile FPGA fabric, sweep switches, capture UART frames.
3. [Lab 03: Pmod Upgrade Map](lab-03-pmod-upgrade-map/README.md)
   - Planning lab: choose a Pmod upgrade without making it required for Course 008.

## Monogate Reflex Pattern Practiced

```text
Input -> fixed-point normalize -> FPGA kernel -> guard clamp -> onboard output -> UART trace -> evidence packet
```

## Release Boundary

- Simulation is safe to run by default.
- FPGA programming requires explicit operator approval.
- Live UART capture requires explicit operator approval.
- Pmods are not required for Course 008 launch.
- External actuators and high-current loads are out of scope.

