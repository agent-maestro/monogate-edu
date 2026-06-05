# Course 008 Inventory Map

This map turns the current inventory into a conservative Arty A7 course plan.

## Core Required

| Inventory Item | Course Use | Notes |
| --- | --- | --- |
| Digilent Arty A7 | primary board | Use onboard switches, buttons, LEDs, RGB LEDs, and USB-UART only. |
| USB data cable | power/program/UART | Required for simulation-to-hardware path. |

## Optional Course 008 Upgrades

| Inventory Item | Upgrade Role | Why Not Required |
| --- | --- | --- |
| Pmod 8LD | larger visible LED output | Nice immediate output surface, but onboard LEDs already teach the core loop. |
| Pmod SSD | numeric status display | Useful for showing safe output or switch value, but adds interface work. |
| Pmod ENC | live parameter input | Strong later upgrade for threshold/safe-limit tuning. |

## Save For Later Courses

| Inventory Item | Later Course Fit |
| --- | --- |
| Pmod OLEDrgb | Signal Weaver status display and small procedural visuals. |
| Pmod I2S2 | generated audio / bounded signal course. |
| Pmod VGA | monitor-visible procedural graphics. |
| Pmod KYPD | mode/preset selection after a display exists. |
| Pmod ALS | sensor-driven FPGA guard course. |
| Pmod COLOR | color-sensor guard course. |
| Analog Discovery 3 | capture/evidence instrumentation if available. |

## Do Not Use In Course 008

- Relay modules.
- Solenoids/electromagnets.
- Motor drivers.
- External speakers/amplifiers.
- LED matrix panels.
- Unknown-current or unknown-pinout modules.

Course 008 should feel modern because the FPGA is doing the decision in
hardware, not because the first lesson is overloaded with peripherals.

