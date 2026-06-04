# Course 003: Environmental Guard Node

Status: skeleton.

Course 003 teaches temporal trust: stale data can be as unsafe as an
out-of-range value.

## Pattern Practiced

```text
Sensor/proxy -> Timestamp + Normalize -> environment_guard_v0 -> Freshness Guard -> Display/LED/Buzzer -> Trace -> Evidence
```

## Core Build

Required path should reuse Course 001 outputs and Course 002 measurement habits.
The first simulator/core build may use a potentiometer or LDR as a sensor proxy
before physical BME280/DHT hardware.

## Optional Upgrade

- SSD1306 OLED status display;
- LED strip environmental meter;
- BME280 or DHT sensor physical capture.

## New Guard Shape

The guard is no longer only about numeric range. It also asks:

```text
Is this reading fresh enough to trust?
```

## Lab Skeleton

- [Lab 01: Core Environment Proxy](lab-01-core-environment-proxy/README.md)
- [Lab 02: Stale Data Guard](lab-02-stale-data-guard/README.md)
- [Lab 03: Optional OLED And LED Meter](lab-03-upgrade-oled-led-meter/README.md)
