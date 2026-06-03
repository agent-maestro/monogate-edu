# Monogate Reflex Course: EML Kernel Modes

Status: planned tutorial path.

The Reflex Course should behave like a small EML kernel exerciser, not just
a fixed ESP32 demo board.

The ordinary version of this project would be:

```text
sensor -> microcontroller code -> output
```

The Monogate version is:

```text
input -> EML kernel -> guard decision -> physical output -> trace -> replay -> evidence
```

The board is valuable because the same physical controls can exercise multiple
kernels. A learner should be able to see that the hardware changed behavior
because the kernel contract changed, while the evidence loop stayed the same.

## Tutorial Goal

Use one low-voltage board to teach:

- how an EML kernel defines behavior before hardware is touched;
- how an ESP32 sketch maps board inputs into that kernel contract;
- how the guard decision becomes visible through LED, buzzer, OLED, and serial
  telemetry;
- how a recorded trace can be validated and replayed after the demo;
- how evidence packets keep claims tied to observed behavior.

This makes the trainer board a reusable course object:

```text
one board
many kernels
same evidence habit
```

## First Personality: Kernel Console

The first personality of the trainer board should be a simple kernel console.

Inputs:

- potentiometer;
- mode/run button;
- optional second button or switch input later;
- optional BME280/OLED over I2C.

Outputs:

- guarded LED;
- guarded buzzer;
- OLED state display when available;
- JSONL-style serial telemetry.

The first console demo should avoid motors, relays, coils, electromagnets, and
external high-current loads.

## Kernel Mode Map

| Mode | Kernel | Input | Visible behavior | Evidence |
| --- | --- | --- | --- | --- |
| Reflex | `threshold_reflex_v0` | pot/button | LED/buzzer follows a guarded threshold | trace validation and replay |
| Logic | `logic_guard_v0` | button/switch bits | output is blocked until an interlock is true | Boolean trace replay |
| Voltage | `voltage_divider_v0` | ADC reading | measured ratio is classified on OLED/serial | prediction-vs-measurement note |
| RC | `rc_transient_v0` | time/input step | expected curve window is shown or traced | simulated trace first, hardware later |
| Environment | `environment_guard_v0` | BME280 | stale/out-of-range state drives alert/display | sensor trace replay |

Future permanent trainer boards do not need to support every mode on day one.
They should reserve enough pins and headers that these modes can be added
without rebuilding the whole trainer. Course 01 remains breadboard-only.

## What Makes It Monogate

The board should make these facts obvious in every tutorial:

1. The kernel is read before the hardware is trusted.
2. The control decision is named in telemetry.
3. The guard can block or clamp an output.
4. The trace is saved in a format another person can inspect.
5. The replay explains why the board behaved as it did.

The tutorial should avoid presenting the ESP32 sketch as the main artifact.
The sketch is the adapter between the physical board and the kernel contract.
The kernel, trace, replay, and evidence packet are the Monogate artifact.

## Recommended Video Sequence

1. **Why This Board Exists** - show the board and the kernel/trace/replay loop.
2. **Reflex Mode In Simulation** - validate and replay `threshold_reflex_v0`.
3. **Reflex Mode On LED** - map pot/button input to guarded LED output.
4. **Make The Guard Visible** - add serial fields for input, request, guard,
   output, and reason.
5. **Add Buzzer Carefully** - show the same guard driving a second low-risk
   output.
6. **Swap Kernel, Keep Board** - run a logic interlock or voltage-divider mode
   using the same controls.
7. **Evidence Packet** - collect trace, replay output, wiring note, photo, and
   findings.

## Firmware Shape

The firmware should be organized around a small mode table:

```text
read physical inputs
normalize into kernel input fields
evaluate selected kernel behavior
apply guard/clamp decision
drive physical outputs
emit trace frame
```

Even if the first implementation hand-maps the kernel behavior, the public
tutorial language should keep the contract stable:

```text
EML spec -> firmware adapter -> trace frame -> validator/replay
```

## Evidence Fields To Emit

Each serial frame should include at least:

- `kernel_id`;
- `mode`;
- `input`;
- `request`;
- `guard_state`;
- `guard_reason`;
- `output`;
- `timestamp_ms` or monotonic tick;
- `source`, such as `reflexcourse`.

Course-specific modes can add fields, but these common fields make the board
feel consistent across tutorials.

## Build Boundary

The Reflex Course remains a low-voltage logic, sensor, display, and
indicator board.

Do not use this board as proof for:

- certified safety;
- production control;
- high-current actuation;
- mains switching;
- coil, solenoid, or motor behavior.

Those belong on later driver modules with separate power boundaries and their
own guard evidence.
