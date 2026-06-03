# Reflex Course Resources

Canonical resources for the first Monogate Electronics hardware course.

| Layer | Name |
| --- | --- |
| Track | Reflex Lab Series |
| Board | Reflex Course |
| Course | Reflex Lab 01: Pot to Guarded Output |
| Kernel | `threshold_reflex_v0` |

## Primary Learner Documents

- [Quick Start](quick-start.md) - front-door guide for the first EML hardware demo.
- [Lab Packet](lab-packet.md) - Reflex Lab 01 packet for the breadboard Reflex Course build.
- [First Demo Runbook](first-demo-runbook.md) - operator-style runbook for the first physical demo.
- [Kernel Modes](kernel-modes.md) - how Reflex Course maps to reusable EML kernel modes.
- [Evidence Packet Guide](evidence-packet-guide.md) - photo, replay, tutorial, and review checklist for final course evidence.

## Build References

- [Video Shot List](video-shot-list.md) - optional filming checklist.

## Boundary

The first Reflex Course course is breadboard-only:

```text
potentiometer -> threshold_reflex_v0 -> guard clamp -> LED/buzzer -> trace -> replay
```

Soldered/perfboard versions are future work. They are not part of the Course 01
release path.
