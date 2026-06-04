# Reflex Lab 01 Resource Index

This course is the reference implementation for the Monogate Electronics
resource floor.

## Tier 1 Release Floor

| Resource | Status | Location |
| --- | --- | --- |
| Syllabus / learning objectives | ready draft | [syllabus.md](syllabus.md) |
| Bill of materials | ready draft | [hardware/bom.md](hardware/bom.md) |
| Step-by-step build guide | active | [hardware/build-guide.md](hardware/build-guide.md), [Lab Packet](resources/reflexcourse/lab-packet.md) |
| Computer setup guide | ready PDF | [resources/reflexcourse/setup-guide.pdf](resources/reflexcourse/setup-guide.pdf) |
| Reference schematic | ready draft | [hardware/schematic.md](hardware/schematic.md) |
| Working code / firmware / kernel files | implemented | [firmware/README.md](firmware/README.md), `kernels/threshold_reflex_v0/` |
| Evidence packet template | implemented draft | [evidence/evidence-packet-template.json](evidence/evidence-packet-template.json), [Evidence Packet Guide](resources/reflexcourse/evidence-packet-guide.md) |
| Evidence intake contract | implemented draft | [Voltage Divider Evidence Intake](evidence/VOLTAGE_DIVIDER_EVIDENCE_INTAKE.md), `evidence/voltage_divider_evidence_packet_v0.json` |
| Troubleshooting guide | ready draft | [troubleshooting.md](troubleshooting.md) |
| Short theory note | ready draft | [theory/short-theory.md](theory/short-theory.md) |
| Course glossary | implemented | [glossary.md](glossary.md) |
| Parent living glossary | implemented | [../../docs/glossary.md](../../docs/glossary.md) |
| Further reading / datasheets | ready draft | [resources.md](resources.md) |
| Release checklist | active | [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) |
| Local hardware dashboard launcher | ready draft | [lab-bundle/README.md](lab-bundle/README.md) |

## Canonical Runtime Assets

| Asset | Location |
| --- | --- |
| Kernel contract | `kernels/threshold_reflex_v0/kernel.eml` |
| Kernel metadata | `kernels/threshold_reflex_v0/kernel.json` |
| Human kernel explanation | `kernels/threshold_reflex_v0/kernel.md` |
| Golden trace | `kernels/threshold_reflex_v0/traces/golden_trace.jsonl` |
| ESP32 firmware | `kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino` |
| Live dashboard | `dashboards/esp32-arduino/visualizer.html` |
| Local dashboard launcher | `courses/001-reflex-guard/lab-bundle/start-reflex-dashboard.bat` |
| Simulator course path | `apps/electronics-lab/src/components/simulatorCourses.ts` |
| Parent glossary route | `/electronics/glossary` |
| Course 001 glossary route | `/electronics/reflexcourse/glossary` |

## Boundary

This resource index supports the breadboard Course 01 release only. PCB layout,
perfboard soldering, motor control, relays, solenoids, and certified safety
claims are outside this release.
