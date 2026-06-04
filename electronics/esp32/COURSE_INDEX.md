# ESP32 Course Index

This index is for the first five ESP32 launch courses.

| # | Course | Required Parts Added | Optional Upgrade | Evidence Output |
| --- | --- | --- | --- | --- |
| 001 | [Reflex Guard](courses/001-reflex-guard/README.md) | ESP32, breadboard, pot, LED, button, buzzer, resistors | none before launch | Reflex trace and evidence packet |
| 002 | [Analog Decisions](courses/002-analog-decisions/README.md) | LDR plus 10K divider | LED strip response bar | ADC/deadband trace packet |
| 003 | [Environmental Guard Node](courses/003-environmental-guard-node/README.md) | sensor proxy first; later BME280/DHT | OLED plus LED strip meter | stale-data guard packet |
| 004 | [Light Systems](courses/004-light-systems/README.md) | small LED strip | 64x64 matrix panel / LED wall | power-budget trace packet |
| 005 | [Multi-Input Fusion](courses/005-multi-input-fusion/README.md) | reuse pot, button, LDR/sensor, LED/buzzer | matrix plus multiple outputs | priority/arbitration packet |

## Launch Boundary

Course 001 is locked for the current video and should only receive accuracy
fixes. Courses 002-005 are architecture skeletons until their individual lab
simulators and physical instructions are built.
