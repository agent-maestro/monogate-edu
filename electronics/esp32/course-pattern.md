# Core Build + Optional Upgrade Pattern

Status: launch architecture

Each ESP32 launch course has two surfaces.

## Core Build

The core build is required.

- low-cost;
- low-voltage;
- uses previous-course parts whenever practical;
- works in the simulator before hardware claims;
- produces a trace and evidence packet;
- teaches one new guard shape.

## Optional Upgrade

The optional upgrade is never required.

- uses richer inventory;
- makes the same kernel idea more visual;
- creates repetition with variation;
- may require extra power or safety notes;
- cannot be used to gate course completion.

## Monogate Reflex Pattern

Every course packet should include this box:

```text
Input -> Normalize -> EML Kernel -> Guard -> Output -> Trace -> Evidence
```

Then it should write the course-specific version directly underneath.

Examples:

```text
Course 002:
Pot + LDR -> Normalize ADC -> Deadband Decision -> Alert Guard -> LED/Buzzer -> Trace -> Evidence

Course 003:
Sensor -> Timestamp + Normalize -> Freshness Guard -> Alert State -> Display/Buzzer -> Trace -> Evidence

Course 004:
Animation Params -> RGB/Brightness Kernel -> Power Guard -> LED Surface -> Trace -> Evidence
```

## Difficulty Curve

| Course | Guard Shape |
| --- | --- |
| 001 | Clamp a value to a safe limit |
| 002 | Hold or switch state by decision regions |
| 003 | Reject stale evidence, not only bad values |
| 004 | Bound several outputs under one shared resource budget |
| 005 | Arbitrate between multiple inputs and output priorities |
