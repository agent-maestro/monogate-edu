# Reflex Lab 01 Simulation

The simulation/expected behavior for this course is the golden trace:

```text
kernels/threshold_reflex_v0/traces/golden_trace.jsonl
```

Validate it:

```powershell
python tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

Replay it:

```powershell
python tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

The learner should understand the expected sequence before trusting the
physical board:

```text
pot rises -> requested output rises -> guard limits safe output -> LED/buzzer follow safe output
```

Future work can add notebooks or richer plots here, but the trace is the
canonical Course 01 simulation artifact.
