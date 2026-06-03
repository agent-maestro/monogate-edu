# Course 001 Glossary: Reflex Guard

This course glossary is the small, lab-specific companion to the shared
[Monogate Electronics Living Glossary](../../docs/glossary.md).

Use the shared glossary for general electronics and evidence terms. Use this
page when you need the Course 001 pin names, lab labels, and Reflex Guard
vocabulary.

## Core Course Terms

### Reflex Guard

The Course 001 build path. A potentiometer input is mapped through
`threshold_reflex_v0`, constrained by a guard, and shown through LED and buzzer
outputs.

See also: `threshold_reflex_v0`, guard clamp, safe output.

### Lab 01A

The first physical milestone. The potentiometer on GPIO34 controls the guarded
LED output on GPIO25.

See also: pot raw, GPIO34, GPIO25.

### Lab 01B

The second physical milestone. After Lab 01A works, the learner disconnects USB
and adds the tactile button on GPIO27 plus the passive piezo buzzer on GPIO26.

See also: button mute, GPIO27, GPIO26.

### Lab 02

The proof loop for the same build. Lab 02 captures serial data, replays trace
frames, compares behavior, and prepares a claim-bounded evidence packet.

See also: evidence packet, trace, replay.

### `threshold_reflex_v0`

The first public Monogate Electronics kernel. It maps `pot_raw` through a
threshold and step limit, then the guard caps the final output.

See also: golden trace, guard clamp, safe output.

### Pot Raw

The normalized potentiometer input value. It usually ranges from 0.0 to 1.0
after the firmware converts the ESP32 ADC reading.

See also: potentiometer, ADC, GPIO34.

### Requested Output

The output the kernel asks for before the guard has applied the final limit.

See also: safe output, guard clamp.

### Safe Output

The output value after guard limits have been applied. In Course 001, the LED
and buzzer behavior should follow `safe_output`, not an unconstrained request.

See also: requested output, guard clamp, PWM.

### Guard Clamp

The guard action that caps output at the course limit. The first Reflex Guard
kernel uses this to prevent `safe_output` from rising above the allowed value.

See also: safe output, claim flag.

### Button Mute

The Lab 01B behavior where pressing the tactile button silences the buzzer.
This is a learner-friendly operator input, not a certified safety function.

See also: GPIO27, buzzer, non-claim.

## Pin Names

### GPIO34

The ESP32 analog input pin used for the potentiometer wiper.

### GPIO25

The ESP32 output pin used for the guarded LED channel.

### GPIO27

The ESP32 digital input pin used for the tactile button. The firmware configures
it with `INPUT_PULLUP`.

### GPIO26

The ESP32 output pin used for the passive piezo buzzer through a 1 kOhm series
resistor.

## Evidence Terms Used In Course 001

### Golden Trace

The known baseline trace for `threshold_reflex_v0`. Run this before making
hardware-observed claims.

### Live Capture

Rows recorded from the actual ESP32 over serial during a bench run. A browser
simulation or replay is not live capture.

### Hardware Observed

A claim flag that should only become true after a real hardware session has
device identity, capture context, raw rows, and comparison notes attached.

### Non-Claim

A visible boundary statement. Course 001 is educational and experimental; it
does not claim certified safety, production controller status, formal
equivalence, compiler correctness, or broad performance advantage.
