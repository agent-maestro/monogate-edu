# Lab 03: Pmod Upgrade Map

Status: planning skeleton

This lab keeps Pmods exciting without making them a barrier to Course 008.

## Claim

The learner can choose a Pmod upgrade path and state the new evidence obligation
before wiring or programming the upgrade.

## Upgrade Candidates

| Upgrade | Best First Use | New Obligation |
| --- | --- | --- |
| Pmod 8LD | show safe output on more LEDs | prove output mapping and current boundary |
| Pmod SSD | display switch value or safe output | prove display encoding matches trace |
| Pmod ENC | tune threshold or clamp limit | prove parameter bounds and debounce behavior |

## Later Course Candidates

| Pmod | Save For |
| --- | --- |
| OLEDrgb | Signal Weaver status/pattern display |
| I2S2 | bounded audio generation |
| VGA | generated visual output |
| ALS/COLOR | sensor-driven FPGA guard input |
| KYPD | mode selection after display state exists |

## Rule

No Pmod becomes required for the first Arty course. The core course must remain
onboard-only.

