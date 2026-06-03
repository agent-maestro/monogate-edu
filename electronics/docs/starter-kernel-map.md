# Starter Kernel Map

Monogate Electronics teaches guarded physical computing through small starter
kernels. Each course keeps the same pattern:

```text
sensor/input -> starter kernel -> guard -> physical output -> trace -> replay -> evidence
```

## Track Map

| Track | Course | Kernel | Hardware | Status | Learner Outcome |
| --- | --- | --- | --- | --- | --- |
| Reflex Lab Series | 001: Reflex Guard | `threshold_reflex_v0` | Reflex Course: potentiometer, LED, passive piezo, resistors, ESP32 | active release target | Lab 01 builds the guarded loop; Lab 02 captures, replays, compares, and packets evidence |
| Bench Foundations | 02: Analog Decisions | `analog_decision_v0` | ESP32/UNO, pot, LDR, LED/buzzer, optional OLED/LCD | next release candidate | Convert ADC readings into bounded threshold/deadband decisions with trace/display alignment |
| Bench Foundations | 03: Environmental Guard Node | `environment_guard_v0` | BME280 sensor, SSD1306 OLED, LED, piezo | later release candidate | Sense environment, show local state, handle stale data, replay alerts |
| Forge Logic Series | Arty A7 / FPGA | TBD | Arty A7 and Pmods | roadmap | Move EML/Forge demos into verifiable FPGA signal projects |
| Field Systems Series | Soundfield Kernels | `soundfield_energy_v0` | INMP441 microphone, 64x64 RGB matrix | active scaffold | Map sound features into guarded visual output |
| Field Systems Series | Magnetic Actuator Node | `magnetic_actuator_v0` | Hall sensor, MOSFET, diode, low-voltage electromagnet | planned | Learn feedback, current/time guards, and actuator boundaries |
| Field Systems Series | Hydroponic Guard Node | `hydro_guard_v0` | water level, BME280, optional pH/EC, output indicators | active scaffold | Model pump/fan/light decisions with dry-run and chemistry lockouts |
| Foundation | EE Math Kernels | `rc_transient_v0`, `voltage_divider_v0`, `logic_guard_v0`, `optimization_boundary` | simulated only at first | active scaffold | Turn EE math and high-dimensional optimization behavior into replayable EML traces before hardware |
| Robotics Path | SO-101 Guarded Robot Arm | `bounded_reflex_v0`, `policy_action_gate_v0` candidates | MuJoCo sim first, later SO-101 / SO-ARM101 arm | roadmap | Apply portable EML guard kernels to policy-proposed robot motion with comparable evidence |

## Kernel Progression

### 001: Reflex Guard

Core idea:

```text
normalize input -> threshold -> rate limit -> clamp output -> LED/buzzer
```

Best first build because it starts with a single current-limited LED, then adds
a passive piezo buzzer as a second low-risk output channel. The buzzer is a lab
stage, not a separate course.

Labs:

- **Lab 01: Pot to Guarded Output** - build the ESP32 breadboard circuit.
- **Lab 02: Trace, Replay, And Evidence** - prove and package the same circuit.

### 002: Analog Decisions

Core idea:

```text
raw ADC -> normalized input -> threshold/deadband -> guarded output
```

Best foundation course after Reflex Lab 01 because the learner can compare
raw readings, normalized values, display text, output state, and replayed trace
without adding dangerous hardware. Forge becomes useful when the threshold,
deadband, invalid-input behavior, and output clamp are treated as claims.

### 003: Environmental Guard

Core idea:

```text
humidity/temp/pressure -> state classification -> OLED text -> guarded alert
```

Best embedded-systems build after Analog Decisions because it adds I2C, BME280,
OLED display, stale-data behavior, and local status without crossing into
motors or high-current actuation.

### Soundfield

Core idea:

```text
audio features -> visual mapping -> brightness guard -> rendered/replayed matrix frame
```

Best creative build because the same kernel can run in simulation before a
large LED matrix is wired.

### 004: Magnetic Actuator

Core idea:

```text
hall sensor feedback -> actuator request -> current/time guard -> MOSFET output
```

This course is intentionally planned, not active. It should not be built until
the learner has completed the low-voltage LED, buzzer, stepper, sensor, and
display courses.

### 005: Hydroponic Guard

Core idea:

```text
water/environment readings -> pump/fan/light requests -> lockouts -> replayable trace
```

Best system-level build because it shows why sensor trust, stale data, water
level, and actuator boundaries belong in the kernel before a full IoT dashboard
or automation platform is added.

### 006: EE Math Kernels

Core idea:

```text
EE math model -> simulated trace -> validator -> replay -> future evidence
```

Best bridge course because it keeps electrical-engineering math curated and
simulated before any hardware claim. The first modules cover RC transients,
voltage dividers, Boolean interlocks, and the optimization-boundary blueprint.
The boundary module treats the Trainer Board as a future tactile control
surface for replayable high-dimensional EML experiments, not as a physical
high-dimensional optimizer.

### Robotics Path: Portable Guard Kernels

Core idea:

```text
observation -> policy proposal -> EML guard kernel -> bounded motor command -> trace -> replay -> evidence
```

This path should begin in MuJoCo and only move to SO-101 hardware after a
simulated trace, evidence schema, and operator-approved hardware plan exist.
The first candidate contract is a platform-neutral `bounded_reflex_v0` kernel
that can be mapped to ESP32 PWM, Arty A7 outputs, or robot joint targets through
separate adapters.

See `projects/robotics-roadmap.md`.

## Evidence Habit

Every starter kernel should produce:

- `kernel.json`;
- golden trace;
- validation script;
- replay script;
- wiring plan;
- evidence checklist.

The goal is not just to make hardware move. The goal is to make the control
decision inspectable.
