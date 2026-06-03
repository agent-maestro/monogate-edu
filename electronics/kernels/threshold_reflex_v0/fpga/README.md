# FPGA Notes

This folder is for FPGA-style implementations of `threshold_reflex_v0`.

The first educational target is a simulator that emits the same JSONL contract
from switch-like inputs. Vendor-specific project files should be optional.

Suggested progression:

1. Simulate normalized switch inputs.
2. Emit trace frames.
3. Validate trace frames with `tools/validate_trace.py`.
4. Add board-specific UART output later.
