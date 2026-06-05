# Arty A7 Track

This is the FPGA / Forge Logic course lane.

Canonical web route:

```text
https://monogate.dev/electronics/artya7/courses
```

## Courses

- [008 Arty A7 Reflex Logic](courses/008-arty-a7-reflex-logic/README.md)

## Track Pattern

```text
switches -> fixed-point kernel -> guard clamp -> onboard LEDs -> UART trace -> evidence
```

## Core Rule

The first Arty course is onboard-only. Pmods are optional upgrades after the
switch-to-guard loop is understood.

## Boundary

Simulation is open by default. FPGA programming, live UART capture, Pmod wiring,
and any external outputs require explicit operator approval.
