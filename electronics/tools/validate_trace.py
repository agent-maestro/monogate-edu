#!/usr/bin/env python3
"""Validate Monogate Electronics JSONL trace frames."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


SCHEMA_VERSION = "monogate-electronics.trace-frame.v0"
REQUIRED_OUTPUTS = ("requested_output", "safe_output", "led", "buzzer", "stepper")


def validate_frame(frame: dict) -> list[str]:
    errors: list[str] = []
    if frame.get("schema_version") != SCHEMA_VERSION:
        errors.append("schema_version mismatch")
    if frame.get("kernel_id") != "threshold_reflex_v0":
        errors.append("kernel_id mismatch")
    for key in ("sample_index", "pot_raw", "outputs", "guard"):
        if key not in frame:
            errors.append(f"missing {key}")
    try:
        pot_raw = float(frame.get("pot_raw"))
        if not 0.0 <= pot_raw <= 1.0:
            errors.append("pot_raw out of range")
    except (TypeError, ValueError):
        errors.append("pot_raw not numeric")
    outputs = frame.get("outputs")
    if not isinstance(outputs, dict):
        errors.append("outputs not object")
    else:
        for key in REQUIRED_OUTPUTS:
            if key not in outputs:
                errors.append(f"missing outputs.{key}")
                continue
            try:
                value = float(outputs[key])
            except (TypeError, ValueError):
                errors.append(f"outputs.{key} not numeric")
                continue
            if not 0.0 <= value <= 1.0:
                errors.append(f"outputs.{key} out of range")
    guard = frame.get("guard")
    if not isinstance(guard, dict):
        errors.append("guard not object")
    else:
        action = guard.get("guard_action")
        if action not in {"pass_through", "clamp_to_safe_output"}:
            errors.append("guard_action invalid")
        try:
            requested = float(guard.get("requested_output"))
            safe = float(guard.get("safe_output"))
            if safe > requested:
                errors.append("safe_output exceeds requested_output")
            if safe > 0.85:
                errors.append("safe_output exceeds safe limit")
        except (TypeError, ValueError):
            errors.append("guard outputs not numeric")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()

    total = 0
    invalid = 0
    for line_no, line in enumerate(args.path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        total += 1
        try:
            frame = json.loads(line)
        except json.JSONDecodeError as exc:
            print(f"line {line_no}: invalid JSON: {exc}")
            invalid += 1
            continue
        errors = validate_frame(frame)
        if errors:
            print(f"line {line_no}: " + "; ".join(errors))
            invalid += 1
    print(f"Trace validation: {total - invalid}/{total} valid, {invalid} invalid")
    return 0 if total > 0 and invalid == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
