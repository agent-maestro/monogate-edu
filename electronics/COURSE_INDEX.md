# Course Index

Monogate Electronics courses teach the same evidence-producing loop:

```text
input -> kernel -> guard -> output -> trace -> replay -> evidence
```

## Available Courses

The launch curriculum lives in [ESP32 Launch Track](esp32/README.md).

| Course | Status | Start Here | What You Build |
| --- | --- | --- | --- |
| 001 Reflex Guard | active release target | [Course](courses/001-reflex-guard/README.md) | Lab 01 ESP32 breadboard circuit, then Lab 02 dashboard replay and evidence packet |

## Recommended First Route

1. Read [Start Here](START_HERE.md).
2. Complete the [Starter Bundle](starter-bundle/README.md) sections you need.
3. Open the [ESP32 Launch Track](esp32/README.md).
4. Run the golden trace.
5. Complete Lab 01 to build the breadboard circuit.
6. Complete Lab 02 to capture, replay, compare, and export evidence.

## Shared Files

Learners mainly live in `courses/`. Shared kernels live in `kernels/`, reusable
validators and replay scripts live in `tools/`, and shared standards live in
`docs/`.
