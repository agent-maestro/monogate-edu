# Monogate Electronics Course Design Standard

Status: draft reusable standard

Every course should teach a real bench habit:

```text
claim -> simulate -> build -> capture -> compare -> constrain
```

The learner should finish with a working circuit or simulation, but the more
important deliverable is a claim-bounded evidence packet.

## Course And Lab Boundary

Courses own the durable learning arc. Labs own the concrete hands-on units
inside that arc.

```text
course -> labs -> evidence packet
```

For example:

```text
Course 001: Reflex Guard
  Lab 01: Pot to Guarded Output
  Lab 02: Trace, Replay, And Evidence
```

Use a new course when the concept family changes. Use a new lab when the same
course claim needs another build, capture, comparison, or evidence step.

See [Course And Lab Structure](course-lab-structure.md).

## Course Shape

Use this structure for reusable Monogate Electronics courses:

1. **Course claim** - the smallest statement the lab will try to support.
2. **Parts and boundary** - what is wired, what is not wired, and what risks are out of scope.
3. **Simulation or expected trace** - expected behavior before physical work.
4. **Physical build** - breadboard or board-specific wiring.
5. **Bring-up** - power-on, first readings, and sanity checks.
6. **Capture** - JSONL trace, dashboard graph, session log, and photos/video when useful.
7. **Compare** - expected behavior versus observed behavior.
8. **Evidence packet** - packet using `monogate-electronics.course-evidence-packet.v0`.

## Release Resource Floor

Every released course must include these Tier 1 resources. These are the
minimum learner-facing and reviewer-facing artifacts.

| Resource | Required Format | Notes |
| --- | --- | --- |
| Course syllabus / learning objectives | Markdown, optional PDF later | State what the learner will build, observe, and be able to explain. |
| Bill of materials | Markdown or CSV | Include exact values, acceptable substitutes, and safety notes. |
| Step-by-step guide | Markdown with photos or screenshots | Simulation-only courses use a step-by-step simulation guide. |
| Reference schematic | Markdown diagram, image, or KiCad export | Required for every course. PCB layout is optional unless the course uses a PCB. |
| Working code / firmware / kernel files | Repo-linked source files | Keep canonical source in `kernels/`, `apps/`, `dashboards/`, or board folders. |
| Evidence packet template | JSON or Markdown guide | Must follow `monogate-electronics.course-evidence-packet.v0`. |
| Troubleshooting guide | Markdown | Include common wiring, toolchain, and interpretation failures. |
| Short theory note | Markdown, optional notebook later | Explain the math/control idea without burying the learner. |
| Further reading / datasheets | Markdown links | Prefer primary docs and datasheets. |
| Release checklist | Markdown | Tracks what is complete, draft-only, and blocked. |

Tier 2 resources are added when they are meaningful: KiCad projects, notebooks,
ngspice/Vivado scripts, scope captures, video timestamp sheets, retrospectives,
filled evidence packets, quizzes, and course badges.

## Folder Convention

Use this shape for new courses when practical:

```text
courses/<course_id>-<slug>/
|-- README.md
|-- syllabus.md
|-- RELEASE_CHECKLIST.md
|-- lab-01-<slug>/
|   |-- README.md
|   |-- simulation/
|   |-- hardware/
|   |-- firmware/
|   |-- theory/
|   |-- evidence/
|   |-- resources/
|   `-- troubleshooting.md
|-- lab-02-<slug>/
|   `-- README.md
`-- resources/
```

Do not duplicate large canonical assets just to satisfy the shape. Link to the
actual kernel, firmware, dashboard, simulator, and evidence tooling.

## When To Use Forge

Forge should appear when the learner is making a claim that benefits from a
machine-checkable boundary. It should not be decorative.

Use Forge for:

- threshold and deadband logic;
- clamp and saturation behavior;
- sensor validity ranges;
- stale sensor behavior;
- PID or filter bounds;
- actuator interlocks;
- timing, duty-cycle, or frequency limits;
- EML-to-C or EML-to-Verilog course paths.

Do not force Forge into:

- first contact with a part;
- simple wiring identification;
- display formatting;
- one-off demo UI text;
- labs where the only claim is "the part turns on."

The recommended pattern is:

```text
observe first -> write the claim -> encode the guard/math -> deploy -> capture evidence
```

## Evidence Packet Minimum

Every course should end with:

- `evidence_packet.json`;
- JSONL trace or simulated trace;
- validation output;
- replay output or replay HTML;
- dashboard graph/session export when applicable;
- wiring notes;
- at least one physical artifact for hardware-observed packets;
- blocked claims;
- review status.

Reusable packet folders live under:

```text
evidence/courses/<course_id>/<packet_id>/
```

## Reference Course

Course 001: Reflex Guard is the reference implementation:

```text
pot -> threshold_reflex_v0 -> guard -> LED/buzzer -> trace -> replay -> evidence
```

Its Lab 01 builds the circuit. Its Lab 02 proves and packages it. Future
courses should copy that shape, not the exact electronics.

## Track Intent

- **Bench Foundations** - measurement, wiring, ADC, I2C, displays, logging.
- **Verified Embedded Systems** - Forge/EML-to-C, guards, thresholds, PID, interlocks.
- **Verified Digital Hardware** - Forge/EML-to-Verilog, Arty A7, Pmods, waveform evidence.
- **Field Systems** - sensor trust, stale data, local state, multi-input evidence packets.

## Claim Boundary

Course evidence supports educational review only. It does not claim certified
safety, production-controller readiness, agency acceptance, or high-power
system validation.
