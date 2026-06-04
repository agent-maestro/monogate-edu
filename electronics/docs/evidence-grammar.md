# Electronics Evidence Grammar

Status: required for future physical packets
Scope: `monogate-electronics` evidence packets and `monogate.dev/electronics`

This repo keeps hardware truth separate from software research artifacts, but
future physical packets must use the same evidence habit as the rescue suite:

```text
source -> trace -> validator -> replay -> claim flags -> review status
```

## Required Packet Fields

Every future physical evidence packet should include:

- `packet_id`
- `source`
- `capture_mode`
- `trace_path`
- `validator_result`
- `replay_result`
- `claim_flags`
- `review_status`

## Claim Flags

Public or deploy-facing packets must state these flags explicitly:

```json
{
  "simulated": true,
  "hardware_observed": false,
  "live_serial_capture_performed": false,
  "certified_safety_claim": false,
  "production_controller_claim": false
}
```

For a real bench packet, `hardware_observed` and
`live_serial_capture_performed` may become `true` only after operator-approved
capture. Certified safety and production-controller claims remain `false`.

## Review Boundary

Laptop agent owns the bench loop and the `monogate.dev/electronics` source
path. Blackwell/Codex review approves whether an evidence packet is ready to
support a public claim or deployment surface. A packet can be useful while still
being marked `review_status: candidate`.

This document authorizes no hardware action.

## First Course Packet

The Course 001 public release carries a learner-facing evidence template:

```text
courses/001-reflex-guard/evidence/evidence-packet-template.json
```

It is a template, not a live hardware packet. Hardware-observed fields should
remain false until a learner or reviewer attaches real capture metadata and raw
sample rows.

## EE Math Bridge

The first Course 006 bridge manifest is:

```text
evidence/electronics_evidence_bridge_2026_05_27.json
```

It indexes simulated packets for:

- `rc_transient_v0`
- `voltage_divider_v0`
- `logic_guard_v0`

Each packet is generated from a golden trace, local validator output, replay
output, and explicit false hardware claim flags. The bridge is eligible for
simulated surface copy only; it is not a hardware observation.
