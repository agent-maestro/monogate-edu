# Threshold Reflex V0

Small starter kernel for teaching thresholding, rate limiting, and guard
clamping.

## Inputs

- `pot_raw`: normalized value from `0.0` to `1.0`.

## Outputs

- `requested_output`: what the kernel wants.
- `safe_output`: what the guard allows.
- `led`: visible indicator.
- `buzzer`: audible indicator; the ESP32 lesson firmware reports this as a
  hysteresis-based on/off output so the piezo does not chatter near the pot's
  activation edge.
- `stepper`: optional motion indicator.

## Guard

The guard clamps output to `0.85`.

## Files

- `kernel.json`: machine-readable teaching spec.
- `kernel.md`: human explanation.
- `traces/golden_trace.jsonl`: replayable example trace.
- `esp32/`: starter firmware and pin map.
- `fpga/`: FPGA-oriented notes and stubs.
- `dashboard/`: dashboard integration notes.
- `evidence/`: packet checklist.
