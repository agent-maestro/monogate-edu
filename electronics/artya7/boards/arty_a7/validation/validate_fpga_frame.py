#!/usr/bin/env python3
"""FPGA-specific checks layered on the shared serial-frame validator."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path


DEMO_ROOT = Path(__file__).resolve().parents[3]
VALIDATOR_PATH = DEMO_ROOT / "scripts" / "validate_serial_frame.py"


def load_shared_validator():
    spec = importlib.util.spec_from_file_location("validate_serial_frame", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load validator: {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    args = parser.parse_args()

    manifest = json.loads((DEMO_ROOT / "manifest.json").read_text(encoding="utf-8"))
    kernel_sha256 = manifest["kernel_sha256"]
    shared = load_shared_validator()
    total = 0
    invalid = 0

    for line_no, line in enumerate(args.path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        total += 1
        frame = json.loads(line)
        errors = shared.validate_frame(frame, kernel_sha256)
        if frame.get("source_mode") != "fpga_serial":
            errors.append("source_mode must be fpga_serial")
        guard = frame.get("guard") if isinstance(frame.get("guard"), dict) else {}
        if guard.get("simulated") is not False:
            errors.append("guard.simulated must be false for fpga_serial demo frames")
        if errors:
            invalid += 1
            print(f"line {line_no}: " + "; ".join(errors))

    valid = total - invalid
    print(f"FPGA serial validation: {valid}/{total} valid, {invalid} invalid")
    return 0 if total > 0 and invalid == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
