#!/usr/bin/env python3
"""Validate a Monogate Electronics evidence-grammar packet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


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


def validate_packet(packet: dict, base: Path) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED_FIELDS - set(packet))
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")

    trace_path = packet.get("trace_path")
    if isinstance(trace_path, str) and not (base / trace_path).exists():
        errors.append(f"trace_path does not exist: {trace_path}")

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

    replay = packet.get("replay_result")
    if not isinstance(replay, dict) or replay.get("status") != "pass":
        errors.append("replay_result.status must be pass")

    if packet.get("capture_mode") == "simulated" and flags and flags.get("hardware_observed") is not False:
        errors.append("simulated packets must not set hardware_observed")

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
