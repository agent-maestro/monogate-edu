# Trace And Replay

A trace is a small recorded history of what the kernel decided.

A replay lets another person inspect the same frames later.

The first course uses:

```text
kernels/threshold_reflex_v0/traces/golden_trace.jsonl
```

Validate it:

```powershell
py -3 tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

Replay it:

```powershell
py -3 tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```
