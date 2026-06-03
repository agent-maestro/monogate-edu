# Lab 02: Trace, Replay, And Evidence

Lab 02 turns the Lab 01 Reflex Guard build into a claim-bounded evidence
packet.

It should not add new hardware by default. The point is to prove the circuit
already built in Lab 01:

```text
potentiometer + button -> threshold_reflex_v0 -> guarded LED/buzzer -> trace -> replay -> evidence
```

## Scope

Lab 02 covers:

- start the shared dashboard with the Reflex Guard schema/profile;
- capture a live JSONL trace from the ESP32;
- export replay HTML or replay summary;
- compare the captured trace with the expected kernel behavior;
- add photos or screenshots when useful;
- write short findings;
- generate or fill the evidence packet manifest;
- mark unsupported claims as blocked.

Lab 02 does not cover new sensors, motors, relays, solenoids, electromagnets,
Course 002 ADC/deadband content, production-controller claims, or certified
safety claims.

## Commands

Validate a captured trace:

```powershell
python tools\validate_trace.py path\to\trace.jsonl
```

Replay a captured trace:

```powershell
python tools\replay_trace.py path\to\trace.jsonl
```

Build the packet manifest:

```powershell
python tools\make_packet.py path\to\evidence_folder --out path\to\evidence_folder\PACKET_MANIFEST.json
```

Validate the packet:

```powershell
python tools\validate_course_evidence_packet.py path\to\evidence_folder
```

## Completion Check

- Trace validates with zero invalid frames.
- Replay summary matches observed LED/buzzer behavior.
- Button press mutes the buzzer in the captured run.
- Findings explain any mismatch between simulator, dashboard, and hardware.
- Evidence packet flags simulation versus hardware observation correctly.
- Blocked claims reject certified safety and production use.
