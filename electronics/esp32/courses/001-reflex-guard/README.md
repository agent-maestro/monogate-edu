# Course 001: Reflex Guard

Status: locked for launch video.

Do not add new required inventory before launch. This course stays accurate to
the filmed build.

## Canonical Course Files

Use the existing release course:

- [Course 001 Release Folder](../../../courses/001-reflex-guard/README.md)
- [Lab 01: Pot to Guarded Output](../../../courses/001-reflex-guard/lab-01-pot-to-guarded-output/README.md)
- [Lab 02: Trace, Replay, And Evidence](../../../courses/001-reflex-guard/lab-02-trace-replay-evidence/README.md)

## Pattern Practiced

```text
Potentiometer + button -> Normalize ADC/GPIO -> threshold_reflex_v0 -> Clamp Guard -> LED/Buzzer -> Trace -> Evidence
```

## Launch Boundary

Course 001 required build:

- ESP32;
- breadboard;
- potentiometer;
- current-limited LED;
- tactile button;
- passive piezo buzzer;
- resistors and jumper wires.

Optional LED strips, matrices, displays, sensors, and advanced outputs belong
to later courses or post-launch add-ons.
