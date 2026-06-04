# Course 002: Analog Decisions

Status: skeleton for next release candidate.

Course 002 teaches the first feedback instinct: analog readings are
observations, not truth.

## Pattern Practiced

```text
Pot + LDR -> Normalize ADC -> analog_decision_v0 -> Deadband Guard -> LED/Buzzer -> Trace -> Evidence
```

## Core Build

Required parts should reuse Course 001 and add only:

- LDR/photoresistor;
- 10K divider resistor;
- optional second LED header if the lab needs clearer optical feedback.

The core build compares commanded LED behavior with observed LDR response and
uses threshold plus deadband to avoid flicker.

## Optional Upgrade

- LED strip response bar;
- RGB status indicator;
- small matrix decision display.

The upgrade must use the same decision trace and evidence claim as the core
build.

## New Guard Shape

Course 001 clamps a value. Course 002 decides by regions:

```text
below_off -> output off
deadband -> hold previous output
above_on -> output on
```

## Lab Skeleton

- [Lab 01: Core Analog Response](lab-01-core-analog-response/README.md)
- [Lab 02: Deadband And Evidence](lab-02-deadband-evidence/README.md)
- [Lab 03: Optional LED Strip Response Bar](lab-03-upgrade-led-strip/README.md)
