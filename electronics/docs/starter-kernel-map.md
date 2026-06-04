# Starter Kernel Map

Monogate Electronics teaches guarded physical computing through small starter
kernels. Each course keeps the same pattern:

```text
sensor/input -> starter kernel -> guard -> physical output -> trace -> replay -> evidence
```

## Track Map

| Track | Course | Kernel | Hardware | Status | Learner Outcome |
| --- | --- | --- | --- | --- | --- |
| Reflex Lab Series | 01: Pot to Guarded LED | `threshold_reflex_v0` | Trainer Board v0: potentiometer, LED, resistor, ESP32 | active | Learn thresholding, rate limiting, clamping, and JSONL replay |
| Reflex Lab Series | 02: Guarded Buzzer | `threshold_reflex_v0` extension | Trainer Board v0: piezo on GPIO26 | planned next | Add audible output only after LED safety is understood |
| Forge Logic Series | Arty A7 / FPGA | TBD | Arty A7 and Pmods | roadmap | Move EML/Forge demos into verifiable FPGA signal projects |
| Field Systems Series | Soundfield Kernels | `soundfield_energy_v0` | INMP441 microphone, 64x64 RGB matrix | active scaffold | Map sound features into guarded visual output |
| Field Systems Series | Environmental Guard Node | `environment_guard_v0` | BME280 sensor, SSD1306 OLED, LED, piezo | active scaffold | Sense environment, show local state, handle stale data, replay alerts |
| Field Systems Series | Magnetic Actuator Node | `magnetic_actuator_v0` | Hall sensor, MOSFET, diode, low-voltage electromagnet | planned | Learn feedback, current/time guards, and actuator boundaries |
| Field Systems Series | Hydroponic Guard Node | `hydro_guard_v0` | water level, BME280, optional pH/EC, output indicators | active scaffold | Model pump/fan/light decisions with dry-run and chemistry lockouts |
| Foundation | EE Math Kernels | `rc_transient_v0`, `voltage_divider_v0`, `logic_guard_v0`, `optimization_boundary` | simulated only at first | active scaffold | Turn EE math and high-dimensional optimization behavior into replayable EML traces before hardware |
| Robotics Path | SO-101 Guarded Robot Arm | `bounded_reflex_v0`, `policy_action_gate_v0` candidates | MuJoCo sim first, later SO-101 / SO-ARM101 arm | roadmap | Apply portable EML guard kernels to policy-proposed robot motion with comparable evidence |

## Kernel Progression

### Reflex Lab 01: Threshold Reflex

Core idea:

```text
normalize input -> threshold -> rate limit -> clamp output
```

Best first build because the output can be a single current-limited LED.

### 002: Soundfield

Core idea:

```text
audio features -> visual mapping -> brightness guard -> rendered/replayed matrix frame
```

Best creative build because the same kernel can run in simulation before a large
LED matrix is wired.

### 003: Environmental Guard

Core idea:

```text
humidity/temp/pressure -> state classification -> OLED text -> guarded alert
```

Best embedded-systems build because it combines sensor input, local display,
stale-data behavior, and a low-voltage output.

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
