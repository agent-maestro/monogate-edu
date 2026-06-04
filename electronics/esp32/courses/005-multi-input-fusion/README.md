# Course 005: Multi-Input Fusion

Status: skeleton.

Course 005 teaches that guarded systems often have more than one input and more
than one output competing for attention.

## Pattern Practiced

```text
Pot + button + sensor -> Normalize + classify -> Fusion Kernel -> Priority Guard -> Outputs -> Trace -> Evidence
```

## Core Build

Reuse the Course 001-003 bench:

- potentiometer;
- button;
- LDR or environmental proxy;
- LED;
- buzzer.

## Optional Upgrade

- matrix status surface;
- LED strip plus buzzer plus display;
- multiple output channels.

## New Guard Shape

The system must arbitrate:

```text
manual override > stale/fault state > alert state > normal display
```

## Lab Skeleton

- [Lab 01: Core Input Fusion](lab-01-core-input-fusion/README.md)
- [Lab 02: Priority Guard](lab-02-priority-guard/README.md)
- [Lab 03: Optional Multi-Output Surface](lab-03-upgrade-multi-output/README.md)
