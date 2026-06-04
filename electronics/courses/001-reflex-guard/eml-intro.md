# EML Intro: Your First Guard Kernel

This lesson is the bridge after Reflex Lab 01.

Audience: an electronics student who has completed the ESP32 breadboard build
with potentiometer, LED, buzzer, and tactile button, and has the Guard Trace
Console running. The student can read C/Arduino and serial output, but has not
written EML before.

Goal:

```text
write a guard in EML -> compile it to C -> flash the ESP32 -> watch the guard fire
```

By the end, the student should understand why a proof obligation appeared.

## 1. What Just Happened In Your Circuit

The potentiometer sends a raw value into the firmware. The firmware maps that
raw reading into a requested output. The guard kernel clamps the request to a
safe limit. The LED and buzzer follow the safe output, not the raw request.

Visualizer signals:

- `pot_raw` - the input from the potentiometer.
- `requested_output` - what the firmware would like to output.
- `safe_output` - what the guard allows.
- `guard_action` - `pass_through` or `clamp_to_safe_output`.

```text
pot_raw -> requested_output -> guard kernel -> safe_output -> LED/buzzer
                                   |
                                   +-- clamp boundary: safe_output <= limit
```

## 2. The Guard Kernel In Plain Math

Before EML, the guard is just a function:

```text
safe(request, limit) = if request > limit then limit else request
```

The interesting part is not the `if`. The interesting part is the contract:

- Domain: `limit > 0`.
- Guarantee: `safe_output <= limit`.
- Obligation: the clamped path never returns a value above `limit`.

Those three ideas - domain, guarantee, obligation - are what EML captures.

## 3. Writing The Guard In EML

Save this as `threshold_reflex_v0.eml`:

```eml
module threshold_reflex;

fn guard(request: Real, limit: Real) -> Real
    requires (limit > 0.0)
    ensures (return <= limit)
{
    if request > limit { limit } else { request }
}
```

The parts:

- `module threshold_reflex;` names this EML module.
- `fn guard(...) -> Real` declares a function returning a real number.
- `requires` states what must be true before the function is used.
- `ensures` states what must be true about the returned value.
- The body computes the guarded result.

`requires` and `ensures` are not comments. They become proof obligations that
MachLib/Lean can check later.

## 4. Compiling To C For The ESP32

Compile the EML to C:

```bash
eml-compile threshold_reflex_v0.eml --target c --profile esp32
```

Expected generated C shape:

```c
#include <assert.h>

double threshold_reflex_guard(double request, double limit) {
    assert(limit > 0.0);
    if (request > limit) {
        return limit;
    }
    return request;
}
```

Adapter pattern in the `.ino`:

```cpp
#include "threshold_reflex_v0.h"

void loop() {
    int raw = analogRead(34);
    double pot_raw = raw / 4095.0;
    double requested_output = pot_raw;
    double safe_output = threshold_reflex_guard(requested_output, 0.85);
    const char* guard_action =
        requested_output > safe_output ? "clamp_to_safe_output" : "pass_through";

    Serial.printf(
        "{\"pot_raw\":%.3f,\"requested_output\":%.3f,\"safe_output\":%.3f,\"guard_action\":\"%s\"}\n",
        pot_raw,
        requested_output,
        safe_output,
        guard_action
    );
}
```

In this repository, the current hand-written ESP32 firmware reference lives at:

```text
kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino
```

## 5. The Proof Obligation

Compile the EML to Lean:

```bash
eml-compile threshold_reflex_v0.eml --target lean
```

Expected generated Lean shape:

```lean
def guard (request limit : Real) : Real :=
  if request > limit then limit else request

theorem guard_output_bounded
    (request limit : Real)
    (h_limit : limit > 0.0) :
    guard request limit <= limit := by
  unfold guard
  by_cases h : request > limit
  · simp [h]
  · simp [h]
    exact le_of_not_gt h
```

If the compiler emits `sorry`, that means Lean accepts the structure but the
proof is still open. The useful thing is that the compiler told you exactly
what property has to be proved.

## 6. Watching It In The Visualizer

When the guard fires, the serial frame should include:

```json
{
  "guard_action": "clamp_to_safe_output"
}
```

The visualizer catches that field, logs it, flashes the panel, and plays the
sound. The loop is:

```text
student-written EML -> generated C -> ESP32 firmware -> JSON frame -> visualizer
```

The student wrote the kernel. The compiler generated the proof obligation. The
hardware is running the guarded decision.

## 7. What Is Next

Try one of these:

- Add a second guard parameter for a minimum threshold and inspect the new
  proof obligations.
- Try `--target verilog` and compare the same guard as hardware-shaped logic.
- Open the Evidence Packet Builder and paste the guard expression to see the
  packet shape it generates.

## Evidence Boundary

This course shows the EML -> C -> ESP32 path and the proof obligation shape.
The generated Lean proof uses `sorry` placeholders. Discharging those
placeholders requires MachLib and is covered in the advanced course. No claim
is made that the guard is formally verified until the proof is closed.
