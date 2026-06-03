# Reflex Course Video Shot List

Status: optional tutorial aid.

Use this as a filming checklist for the first EML kernel console demo.

## Opening

- Show the repo file tree with `kernel.eml`, golden trace, validator, replay
  tool, ESP32 sketch, and evidence folder.
- Show the board parts before wiring.
- Say the narrow claim:

```text
The hardware is ordinary. The EML-to-trace loop is the Monogate part.
```

## Simulation First

Capture:

- `kernels/threshold_reflex_v0/kernel.eml`;
- `python tools\validate_kernel_spec.py kernels\threshold_reflex_v0`;
- `python tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl`;
- `python tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl`.

Narration point:

```text
The control behavior exists before the hardware demo.
```

## Wiring

Show:

- ESP32 pin labels;
- potentiometer to 3V3/GND/GPIO34;
- LED with resistor on GPIO25;
- common GND;
- no motors, relays, coils, or external supplies connected.

Avoid:

- powering while wires are moving;
- showing uncertain wiring as final;
- implying that the trainer board is a high-current controller.

## Live Demo

Show:

- potentiometer below threshold;
- LED beginning to brighten near threshold;
- LED clamped at high input;
- serial JSONL frames;
- `guard_action` changing from `pass_through` to `clamp_to_safe_output`.

Narration point:

```text
The visible event is not just the LED. It is the named guard decision.
```

## Evidence

Show:

- saved `live_trace.jsonl`;
- validation result;
- replay result;
- `FINDINGS.md`;
- `PACKET_MANIFEST.json`.

Closing:

```text
The demo is inspectable after the video ends.
```
