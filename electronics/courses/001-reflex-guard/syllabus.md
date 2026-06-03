# Course 001: Reflex Guard Syllabus

Course title: Course 001: Reflex Guard

Course claim:

```text
An ESP32 breadboard build can read a potentiometer, run threshold_reflex_v0,
clamp the requested output to a safe bounded value, drive LED/buzzer outputs,
mute the buzzer with a button, and export replayable evidence.
```

## Learning Objectives

By the end, the learner should be able to:

- wire ESP32 3V3 and GND to breadboard rails;
- read a potentiometer as an analog input on GPIO34;
- explain threshold, requested output, safe output, and guard clamp;
- drive an LED output through a resistor;
- drive a passive piezo buzzer through a 1 kOhm resistor;
- use a tactile button on GPIO27 with internal pullup behavior;
- capture JSONL serial evidence from the dashboard;
- replay a capture and jump to logged events;
- explain what the evidence packet proves and what it does not prove.

## Labs

### Lab 01: Pot to Guarded Output

Build the breadboard reflex loop:

```text
potentiometer + button -> threshold_reflex_v0 -> LED/buzzer
```

### Lab 02: Trace, Replay, And Evidence

Use the Lab 01 build to capture, replay, compare, and package evidence.

## Course Stages

1. Simulate the expected trace.
2. Build Lab 01A: pot input and guarded LED output.
3. Program the ESP32 and confirm dashboard readings.
4. Disconnect USB and add Lab 01B: button and buzzer.
5. Start Lab 02 and capture a live run.
6. Export replay HTML, graph, JSONL, and evidence packet starter.
7. Add physical photos and human findings.
8. Review blocked claims.

## Release Boundary

This course is low-voltage breadboard education. It does not claim certified
safety, production-controller readiness, or high-current actuator validation.
