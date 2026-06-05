# Lab 02: Onboard LED And UART Bring-Up

Status: optional hardware planning skeleton

This lab should only run after explicit operator approval for FPGA programming
and live UART capture.

## Claim

When the Arty A7 is programmed into volatile FPGA fabric, onboard switches
change the safe output LEDs and USB-UART emits valid JSONL frames with guard
telemetry.

## Hardware Boundary

Allowed:

- Arty A7 by USB only.
- Onboard switches.
- Onboard buttons.
- Onboard LEDs/RGB LEDs.
- USB-UART serial capture.

Not allowed:

- QSPI/configuration flash programming.
- External Pmods unless a later upgrade lab approves them.
- External power supplies.
- Actuators, relays, solenoids, motors, speakers, or LED matrices.

## Draft Bring-Up Steps

1. Confirm board revision and USB cable.
2. Confirm Vivado can see the Arty A7.
3. Program volatile FPGA fabric only.
4. Open serial at `115200` baud.
5. Sweep switches from `0000` to `1111`.
6. Press perturb button and observe clamp behavior.
7. Capture JSONL.
8. Validate capture.
9. Save photo/video plus validation output.

## Evidence

Use the 2026-05-16 handoff as the first reference pattern:

- `evidence/reports/arty_a7_live_bench_handoff_2026_05_16.md`

The new course packet should not reuse old captures as fresh evidence. Old
captures are references until a new operator-approved run exists.

