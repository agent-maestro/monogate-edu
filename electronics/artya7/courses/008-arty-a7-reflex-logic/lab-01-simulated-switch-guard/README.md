# Lab 01: Simulated Switch Guard

Status: planning skeleton

This lab teaches the Arty A7 reflex loop without programming hardware.

## Claim

The simulated FPGA frame stream covers all 16 switch values and includes guard
telemetry showing pass-through and clamp behavior.

## Learner Flow

1. Read the Arty surface map: switches, buttons, LEDs, RGB LEDs, USB-UART.
2. Read `boards/arty_a7/rtl/reflex_kernel.v`.
3. Read `boards/arty_a7/rtl/guard_clamp.v`.
4. Generate simulated FPGA JSONL frames.
5. Validate the frames.
6. Compare pass-through frames against clamped frames.
7. Write the first simulation evidence note.

## Commands

From the repo root:

```powershell
python boards\arty_a7\validation\simulate_fpga_reflex.py --out captures\arty_a7_reflex_simulated.jsonl
python boards\arty_a7\validation\validate_fpga_frame.py captures\arty_a7_reflex_simulated.jsonl
```

## Expected Observations

- `switch_bits` runs from `0000` through `1111`.
- `source_mode` is `fpga_serial`.
- Some frames pass through.
- Some frames clamp to the safe output limit.
- `hardware_observed` must remain false for this lab unless a later packet
  includes real Arty capture.

