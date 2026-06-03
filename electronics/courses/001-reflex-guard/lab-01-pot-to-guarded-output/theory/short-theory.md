# Reflex Lab 01 Short Theory

This course teaches a guarded reflex loop.

## Requested Output

The potentiometer is an analog input. The firmware normalizes it into a value
near `0.0` to `1.0`. The requested output is what the simple control rule would
like to send to the output.

## Safe Output

The safe output is the request after the guard has applied course limits. In
this course the guard caps the output near `0.85`, so a request of `1.00` can
be observed as a safe output of `0.85`.

## Guard Clamp

A clamp happens when:

```text
requested_output > safe_output
```

The clamp is not a failure. It is the point of the course: the system is making
a bounded decision and reporting it as evidence.

## LED And Buzzer

The LED and buzzer follow the guarded output, not the raw request. This is why
the graph distinguishes request from safe output.

## Button Mute

The button is a digital input. It does not change the guard math. It mutes the
buzzer path so the learner can see the difference between:

- guarded output still active;
- audible output intentionally muted.

## Evidence Habit

The learning target is not just "the LED turned on." The target is:

```text
claim -> trace -> replay -> physical artifact -> blocked claims
```
