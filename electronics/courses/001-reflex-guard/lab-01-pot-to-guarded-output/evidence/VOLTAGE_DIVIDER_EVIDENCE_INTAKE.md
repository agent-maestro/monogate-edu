# Voltage Divider Evidence Intake

This page defines the first small electronics evidence-intake contract for
Course 001. It is intentionally modest: it does not say the course has proved a
hardware result. It says we know how to carry one simple circuit relationship
from equation, to expected samples, to capture metadata, to a reviewer action.

The first bridge is the potentiometer voltage divider, not RC decay. Course 001
already uses a potentiometer wiper on ESP32 GPIO34, so the voltage divider is the
least surprising place to define the packet shape. RC decay remains a useful
later bridge after the course has a tighter timing and calibration story.

## Bridge Shape

```text
equation
-> software or simulation artifact
-> capture or simulation metadata
-> sample table
-> comparison status
-> claim flags
-> reviewer action
```

The intake fixture lives at:

```text
evidence/voltage_divider_evidence_packet_v0.json
```

It is a packet-shape fixture, not a live hardware packet.

## Equation

For the Course 001 potentiometer divider:

```text
v_out = v_in * r_bottom / (r_top + r_bottom)
adc_normalized = clamp(v_out / v_ref, 0.0, 1.0)
```

In plain language: the potentiometer turns knob position into a wiper voltage.
The ESP32 reads that wiper on GPIO34, normalizes the reading, and then
`threshold_reflex_v0` uses the normalized value to request a guarded LED output.

## Expected Or Simulated Samples

These rows are acceptable for a simulated or pending intake fixture:

| sample | position | expected normalized ADC | simulated normalized ADC | observed raw ADC | observed normalized ADC |
| --- | --- | ---: | ---: | --- | --- |
| 0 | low | 0.00 | 0.00 | pending | pending |
| 1 | quarter | 0.25 | 0.25 | pending | pending |
| 2 | mid | 0.50 | 0.50 | pending | pending |
| 3 | three quarter | 0.75 | 0.75 | pending | pending |
| 4 | high | 1.00 | 1.00 | pending | pending |

The observed columns stay empty until a real capture is performed.

## Capture Metadata

When no live hardware capture has been performed, the fixture must say so:

```json
{
  "hardware_observed": false,
  "live_serial_capture_performed": false,
  "capture_status": "simulated_or_pending"
}
```

The live-capture fields still belong in the shape, even when blank:

| field | simulated/pending value |
| --- | --- |
| `device_identity` | `null` |
| `tool_used` | `null` |
| `timestamp_utc` | `null` |
| `operator` | `null` |
| `calibration_notes` | `null` |
| `context_notes` | note that no live capture was performed |

If a later packet does perform live capture, those fields must be filled before
any hardware-observed claim is allowed.

## Comparison Status

For this fixture:

```json
{
  "status": "pending_live_capture",
  "method": "expected_normalized_adc_vs_observed_normalized_adc",
  "max_observed_error": null
}
```

A later live packet may add a tolerance and a maximum observed error. Until
then, the comparison is a placeholder for reviewer workflow, not evidence that a
device matched the equation.

## Claim Flags

The fixture must keep the claim boundary visible:

```json
{
  "simulated": true,
  "hardware_observed": false,
  "live_serial_capture_performed": false,
  "certified_safety_claim": false,
  "production_controller_claim": false,
  "compiler_correctness_claim": false,
  "formal_equivalence_claim": false,
  "runtime_performance_claim": false,
  "broad_eml_advantage_claim": false
}
```

Blocked claims stay blocked even after a basic live capture unless a later,
separate review explicitly changes the evidence level.

## Reviewer Action

The stable handoff is the intake JSON shape plus this course-facing explanation.
The reviewer cockpit or evidence packet builder should consume fields, not prose:

- `vertical_id`
- `equation`
- `artifact`
- `capture`
- `samples`
- `comparison`
- `claim_flags`
- `blocked_claims`
- `reviewer_action`

The next reviewer action is:

```text
review_packet_shape_before_live_capture
```

That keeps the first bridge humble and useful: approve the evidence shape first,
then collect real hardware data in a later, clearly marked packet.
