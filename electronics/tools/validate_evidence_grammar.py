#!/usr/bin/env python3
"""Validate a Monogate Electronics evidence-grammar packet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

REQUIRED_FIELDS = {
    "packet_id",
    "source",
    "capture_mode",
    "trace_path",
    "validator_result",
    "replay_result",
    "claim_flags",
    "review_status",
}

REQUIRED_FLAGS = {
    "simulated",
    "hardware_observed",
    "live_serial_capture_performed",
    "certified_safety_claim",
    "production_controller_claim",
}

ALLOWED_REVIEW_STATUS = {
    "approved_for_surface",
    "candidate_only",
    "blocked",
    "needs_human_review",
}

ALLOWED_CAPTURE_MODES = {"simulated", "live_serial"}
NON_LIVE_FORBIDDEN_COMMAND_PARTS = {
    "arduino-cli upload",
    "arduino-cli monitor",
    "esptool",
    "openocd",
    "vivado",
    "flash",
    "serial capture",
}


def load_trace(path: Path) -> list[dict]:
    frames: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            frames.append(json.loads(line))
    return frames


def command_is_non_live(command: str) -> bool:
    lowered = command.lower()
    return not any(part in lowered for part in NON_LIVE_FORBIDDEN_COMMAND_PARTS)


def validate_packet(packet: dict, base: Path) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED_FIELDS - set(packet))
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")

    capture_mode = packet.get("capture_mode")
    if capture_mode not in ALLOWED_CAPTURE_MODES:
        errors.append(f"invalid capture_mode: {capture_mode}")

    trace_path = packet.get("trace_path")
    resolved_trace_path = None
    if isinstance(trace_path, str):
        resolved_trace_path = base / trace_path
        if not resolved_trace_path.exists():
            errors.append(f"trace_path does not exist: {trace_path}")
    else:
        errors.append("trace_path must be a string")

    source = packet.get("source")
    if not isinstance(source, dict):
        errors.append("source must be an object")
    else:
        source_trace = source.get("source_trace")
        if isinstance(source_trace, str) and not (REPO / source_trace).exists():
            errors.append(f"source.source_trace does not exist: {source_trace}")

    flags = packet.get("claim_flags")
    if not isinstance(flags, dict):
        errors.append("claim_flags must be an object")
    else:
        missing_flags = sorted(REQUIRED_FLAGS - set(flags))
        if missing_flags:
            errors.append(f"missing claim flags: {', '.join(missing_flags)}")
        if flags.get("certified_safety_claim") is not False:
            errors.append("certified_safety_claim must be false")
        if flags.get("production_controller_claim") is not False:
            errors.append("production_controller_claim must be false")
        if flags.get("hardware_observed") is True and flags.get("live_serial_capture_performed") is not True:
            errors.append("hardware_observed requires live_serial_capture_performed")

    review_status = packet.get("review_status")
    if review_status not in ALLOWED_REVIEW_STATUS:
        errors.append(f"invalid review_status: {review_status}")

    validator = packet.get("validator_result")
    if not isinstance(validator, dict) or validator.get("status") != "pass":
        errors.append("validator_result.status must be pass")
    elif isinstance(validator.get("output_path"), str) and not (base / validator["output_path"]).exists():
        errors.append(f"validator_result.output_path does not exist: {validator['output_path']}")
    if isinstance(validator, dict) and isinstance(validator.get("command"), str):
        if packet.get("capture_mode") == "simulated" and not command_is_non_live(validator["command"]):
            errors.append("validator_result.command must be non-live for simulated packets")

    replay = packet.get("replay_result")
    if not isinstance(replay, dict) or replay.get("status") != "pass":
        errors.append("replay_result.status must be pass")
    elif isinstance(replay.get("output_path"), str) and not (base / replay["output_path"]).exists():
        errors.append(f"replay_result.output_path does not exist: {replay['output_path']}")
    if isinstance(replay, dict) and isinstance(replay.get("command"), str):
        if packet.get("capture_mode") == "simulated" and not command_is_non_live(replay["command"]):
            errors.append("replay_result.command must be non-live for simulated packets")
    if isinstance(replay, dict) and resolved_trace_path is not None and resolved_trace_path.exists():
        try:
            frame_count = len(load_trace(resolved_trace_path))
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"trace_path cannot be parsed: {exc}")
        else:
            if "frames" in replay and replay.get("frames") != frame_count:
                errors.append(f"replay_result.frames must match trace frame count: {frame_count}")

    if packet.get("capture_mode") == "simulated" and flags and flags.get("hardware_observed") is not False:
        errors.append("simulated packets must not set hardware_observed")
    if packet.get("capture_mode") == "simulated" and flags and flags.get("simulated") is not True:
        errors.append("simulated packets must set claim_flags.simulated true")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", type=Path)
    args = parser.parse_args()

    packet = json.loads(args.packet.read_text(encoding="utf-8"))
    errors = validate_packet(packet, args.packet.parent)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"Evidence grammar validation PASS: {args.packet}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
