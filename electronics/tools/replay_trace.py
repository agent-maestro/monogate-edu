#!/usr/bin/env python3
"""Print a compact replay summary for a Monogate Electronics JSONL trace."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()

    frames = [json.loads(line) for line in args.path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not frames:
        print("no frames")
        return 1

    clamped = sum(1 for frame in frames if frame["guard"]["guard_action"] == "clamp_to_safe_output")
    pot_values = [float(frame["pot_raw"]) for frame in frames]
    safe_values = [float(frame["guard"]["safe_output"]) for frame in frames]
    print("Trace replay")
    print(f"frames: {len(frames)}")
    print(f"pot_raw: {min(pot_values):.6f}..{max(pot_values):.6f}")
    print(f"safe_output: {min(safe_values):.6f}..{max(safe_values):.6f}")
    print(f"clamped_frames: {clamped}")
    print("timeline:")
    for frame in frames:
        print(
            f"  #{frame['sample_index']} "
            f"pot={float(frame['pot_raw']):.3f} "
            f"safe={float(frame['guard']['safe_output']):.3f} "
            f"action={frame['guard']['guard_action']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
