# Course 004: Light Systems

Status: skeleton.

LED strips and matrix displays are constraint machines pretending to be art.

Course 004 makes richer visual hardware first-class while keeping the required
build modest.

## Pattern Practiced

```text
Animation params -> RGB/Brightness Kernel -> Power Guard -> LED Surface -> Trace -> Evidence
```

## Core Build

- ESP32;
- short WS2812B LED strip or stick;
- conservative brightness limit;
- shared ground and clear power boundary.

## Optional Upgrade

- 64x64 RGB matrix panel;
- matrix wall;
- richer animation surface.

## New Guard Shape

Several outputs share one resource budget:

```text
r + g + b + brightness + lit_pixels <= power budget
```

## Lab Skeleton

- [Lab 01: Core LED Strip Budget](lab-01-core-led-strip-budget/README.md)
- [Lab 02: Matrix Simulation](lab-02-matrix-simulation/README.md)
- [Lab 03: Power Budget Evidence](lab-03-power-budget-evidence/README.md)
