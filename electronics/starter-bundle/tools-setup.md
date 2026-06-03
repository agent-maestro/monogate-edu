# Tools Setup

The shared tools live in `tools/`.

Run the first kernel validation:

```powershell
py -3 tools\validate_kernel_spec.py kernels\threshold_reflex_v0
```

Run the first trace validation and replay:

```powershell
py -3 tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
py -3 tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

If `py -3` is unavailable, try `python` instead.
