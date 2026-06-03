#!/usr/bin/env python3
"""Validate a Monogate Electronics EML kernel spec against metadata and trace."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


PARAM_RE = re.compile(r"^param\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?P<value>[-+]?\d+(?:\.\d+)?)\s*$")
META_RE = re.compile(r"^#\s*(?P<key>[A-Za-z_][A-Za-z0-9_]*):\s*(?P<value>.+?)\s*$")


def load_eml(path: Path) -> tuple[dict[str, str], dict[str, float], str]:
    metadata: dict[str, str] = {}
    params: dict[str, float] = {}
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        meta_match = META_RE.match(line)
        if meta_match:
            metadata[meta_match.group("key")] = meta_match.group("value")
            continue
        param_match = PARAM_RE.match(line)
        if param_match:
            params[param_match.group("name")] = float(param_match.group("value"))
    return metadata, params, text


def load_trace(path: Path) -> list[dict]:
    frames: list[dict] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            frames.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_no}: invalid JSON: {exc}") from exc
    return frames


def close_enough(a: float, b: float, tolerance: float = 1e-9) -> bool:
    return abs(a - b) <= tolerance


def validate(kernel_dir: Path) -> list[str]:
    errors: list[str] = []
    eml_path = kernel_dir / "kernel.eml"
    json_path = kernel_dir / "kernel.json"
    trace_path = kernel_dir / "traces" / "golden_trace.jsonl"

    for path in (eml_path, json_path, trace_path):
        if not path.exists():
            errors.append(f"missing {path}")
    if errors:
        return errors

    metadata, eml_params, eml_text = load_eml(eml_path)
    kernel = json.loads(json_path.read_text(encoding="utf-8"))
    try:
        frames = load_trace(trace_path)
    except ValueError as exc:
        return [str(exc)]

    kernel_id = kernel.get("id")
    if metadata.get("kernel_id") != kernel_id:
        errors.append("kernel_id mismatch between kernel.eml and kernel.json")

    expected_schema = "monogate-electronics.eml-kernel.v0"
    if metadata.get("schema_version") != expected_schema:
        errors.append("kernel.eml schema_version mismatch")

    json_params = kernel.get("parameters", {})
    for name, value in eml_params.items():
        if name not in json_params:
            errors.append(f"kernel.json missing parameter {name}")
            continue
        if not close_enough(value, float(json_params[name])):
            errors.append(f"parameter mismatch: {name}")
    for name in json_params:
        if name not in eml_params:
            errors.append(f"kernel.eml missing param {name}")

    actions = set(kernel.get("guard", {}).get("actions", []))
    for action in actions:
        if action not in eml_text:
            errors.append(f"kernel.eml missing guard action {action}")

    safe_limit = eml_params.get("safe_output_limit")
    if safe_limit is not None:
        for frame in frames:
            outputs = frame.get("outputs", {})
            guard = frame.get("guard", {})
            safe_output = float(outputs.get("safe_output", outputs.get("alert_safe", -1.0)))
            guard_safe_output = float(guard.get("safe_output", -1.0))
            if safe_output > safe_limit + 1e-9:
                errors.append(f"frame {frame.get('sample_index')}: safe_output exceeds EML safe_output_limit")
            if guard_safe_output > safe_limit + 1e-9:
                errors.append(f"frame {frame.get('sample_index')}: guard.safe_output exceeds EML safe_output_limit")

    trace_kernel_ids = {frame.get("kernel_id") for frame in frames}
    if trace_kernel_ids != {kernel_id}:
        errors.append("trace kernel_id mismatch")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kernel_dir", type=Path)
    args = parser.parse_args()

    errors = validate(args.kernel_dir)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"Kernel spec validation PASS: {args.kernel_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
