# Course 008 Syllabus: Arty A7 Reflex Logic

## Learner Outcomes

By the end of this course, the learner should be able to:

- explain why an FPGA reflex loop is different from firmware running in a `loop()`;
- read a small Verilog path from switch input to LED output;
- describe fixed-point `q8` values and why they are useful on FPGA;
- identify where the guard clamp lives in the RTL;
- validate simulated FPGA JSONL frames;
- distinguish simulation evidence from hardware-observed UART evidence;
- state what an Arty A7 evidence packet proves and what it does not prove.

## Concept Progression

1. Board surface: clock, switches, buttons, LEDs, RGB LEDs, USB-UART.
2. Fixed-point input: 4 switch bits become a normalized `q8` request.
3. Kernel: switch value plus optional perturb button becomes requested output.
4. Guard: requested output is clamped to the safe maximum.
5. Output: safe high bits drive LEDs; clamp drives status LED/RGB state.
6. Trace: UART frames describe input, request, safe output, margin, and guard action.
7. Evidence: simulated trace first, optional hardware capture second.

## Course Shape

| Lab | Mode | Output | Evidence |
| --- | --- | --- | --- |
| Lab 01 | simulation | JSONL trace | validator output and replay notes |
| Lab 02 | hardware optional | onboard LEDs and UART | live capture, photos/video, validation |
| Lab 03 | planning | Pmod upgrade decision | blocked-claim upgrade map |

## Tooling Boundary

Vivado and board programming are not required for Lab 01. Lab 02 needs a
working Vivado hardware-manager path and explicit operator approval.

Do not write configuration flash in the first release. Use volatile FPGA
programming only.

