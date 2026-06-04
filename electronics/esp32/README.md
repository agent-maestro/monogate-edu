# ESP32 Launch Track

This is the launch curriculum home for the first Monogate Electronics courses.

The older `electronics/courses/` tree remains the exported source of Course 001
release files and future post-Course-5 material. This folder is the clean
Courses 1-5 ESP32 sequence.

## Launch Pattern

Every course practices the same Monogate Reflex Pattern:

```text
Input -> Normalize -> EML Kernel -> Guard -> Output -> Trace -> Evidence
```

The required path stays low-cost. Optional upgrades use richer inventory
without blocking learners who only have the core kit.

```text
core build -> evidence packet
optional upgrade -> richer surface, same kernel idea
```

## Courses

| Course | Status | Core Build | Optional Upgrade | New Guard Shape |
| --- | --- | --- | --- | --- |
| [001 Reflex Guard](courses/001-reflex-guard/README.md) | locked for launch video | Pot, LED, button, buzzer | Later add-ons only | Value clamp |
| [002 Analog Decisions](courses/002-analog-decisions/README.md) | skeleton | Pot, LED, LDR, buzzer | LED strip response bar | Deadband / region decision |
| [003 Environmental Guard Node](courses/003-environmental-guard-node/README.md) | skeleton | Sensor proxy, LED, buzzer | OLED plus LED strip meter | Freshness / stale-data guard |
| [004 Light Systems](courses/004-light-systems/README.md) | skeleton | Small LED strip | Matrix panel / LED wall | Multi-output power budget |
| [005 Multi-Input Fusion](courses/005-multi-input-fusion/README.md) | skeleton | Pot, button, LDR/sensor, LED/buzzer | Matrix and multiple outputs | Priority and arbitration |

## Core Rule

Required builds should reuse parts from previous courses whenever possible.
Learners should feel their bench is growing, not that every course is a new
shopping list.

## Upgrade Rule

Upgrades are never required for completion. They exist to make repetition feel
modern, visual, and portfolio-worthy while keeping the same evidence grammar.
