# Threshold Reflex V0 Kernel

This starter kernel turns a normalized input into a requested output.

The portable Monogate specification lives in:

```text
kernels/threshold_reflex_v0/kernel.eml
```

The `.eml` file is the symbolic/control contract for the lesson. It is not
firmware by itself. The Python trace replay, ESP32 sketch, and FPGA examples
should agree with its parameters, guard boundary, and output mapping.

```text
centered = (pot_raw - 0.55) / 0.10
target = clamp(centered + 0.5, 0.0, 1.0)
requested_output = rate_limit(previous_output, target, max_step=0.20)
safe_output = clamp(requested_output, 0.0, 0.85)
```

The ESP32 lesson firmware drives the LED from `safe_output`. The piezo buzzer is
reported as a clean on/off output with hysteresis: it turns on once
`safe_output >= 0.12` and turns off once `safe_output <= 0.06`. That keeps ADC
noise at the edge of the ramp from causing intermittent chirps.

The kernel is intentionally simple:

- below the threshold, output is low;
- near the threshold, output ramps;
- above the safe limit, the guard clamps;
- every frame records requested and safe output.

## Spec Validation

From the repository root:

```powershell
python tools\validate_kernel_spec.py kernels\threshold_reflex_v0
```

This checks that `kernel.eml`, `kernel.json`, and the golden trace agree on the
kernel id, parameters, guard action names, and safe output limit.
