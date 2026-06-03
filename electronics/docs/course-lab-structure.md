# Course And Lab Structure

Status: working convention

Monogate Electronics uses courses for durable learning arcs and labs for the
hands-on units inside those arcs.

```text
course -> labs -> evidence packet
```

## Course

A course owns the big claim, shared kernel, parts boundary, release checklist,
and learner outcome.

Course examples:

- `001-guarded-reflex-loops` - first guarded reflex loop.
- `002-analog-decisions` - ADC, threshold, and deadband decisions.

## Lab

A lab owns a specific builder workflow. It should be small enough to complete,
review, and explain.

Good lab scopes:

- build one circuit stage;
- capture one trace type;
- compare simulation and hardware;
- add one new sensor;
- add one display/output channel;
- produce one evidence packet.

Avoid turning a lab into a second course. If it adds a new conceptual family,
make it a later course instead.

## Recommended Folder Shape

Use this for new or reorganized courses:

```text
courses/<course_id>-<slug>/
|-- README.md
|-- syllabus.md
|-- RELEASE_CHECKLIST.md
|-- lab-01-<slug>/
|   |-- README.md
|   |-- theory/
|   |-- simulation/
|   |-- hardware/
|   |-- firmware/
|   |-- evidence/
|   |-- resources/
|   `-- troubleshooting.md
|-- lab-02-<slug>/
|   `-- README.md
`-- resources/
```

Existing course-level assets can remain at course root while a course is being
stabilized. Do not move files just for neatness if links, exports, or app
downloads depend on the current paths.

## Course 001 Decision

Course 001 is:

```text
Course 001: Reflex Guard
```

Its labs are:

1. `Lab 01: Pot to Guarded Output` - build the ESP32 breadboard reflex loop.
2. `Lab 02: Trace, Replay, And Evidence` - prove and package the same loop.

This keeps Course 001 complete without making Course 002 repeat the shared
dashboard and evidence setup.

## Course 002 Decision

Course 002 is:

```text
Course 002: Analog Decisions
```

It should not inherit unfinished Course 001 release work. It starts after the
Reflex Guard proof loop is stable and introduces a new concept family:

```text
raw ADC -> normalization -> threshold/deadband -> stable decision
```
