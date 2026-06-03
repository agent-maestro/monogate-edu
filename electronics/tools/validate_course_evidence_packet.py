#!/usr/bin/env python3
"""Validate a reusable Monogate course evidence packet."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


SCHEMA_VERSION = "monogate-electronics.course-evidence-packet.v0"
REQUIRED_TOP_LEVEL = (
    "schema_version",
    "packet_id",
    "course_id",
    "course_title",
    "kernel_id",
    "evidence_level",
    "review_status",
    "claim_flags",
    "sections",
    "artifacts",
    "blocked_claims",
)
REQUIRED_FLAGS = (
    "simulated",
    "hardware_observed",
    "live_serial_capture_performed",
    "certified_safety_claim",
    "production_controller_claim",
)
REQUIRED_SECTIONS = (
    "course_claim",
    "simulation_evidence",
    "physical_evidence",
    "sim_vs_hardware_comparison",
    "domain_safety_lens",
    "blocked_claims",
    "artifacts_links",
    "review_status",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(folder: Path, errors: list[str]) -> None:
    manifest_path = folder / "PACKET_MANIFEST.json"
    if not manifest_path.exists():
        return
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        errors.append(f"PACKET_MANIFEST.json invalid JSON: {exc}")
        return
    files = manifest.get("files")
    if not isinstance(files, list):
        errors.append("PACKET_MANIFEST.json missing files list")
        return
    for entry in files:
        if not isinstance(entry, dict):
            errors.append("PACKET_MANIFEST.json contains non-object file entry")
            continue
        rel = entry.get("path")
        if not isinstance(rel, str):
            errors.append("PACKET_MANIFEST.json file entry missing path")
            continue
        path = folder / rel
        if not path.exists():
            errors.append(f"manifest references missing file: {rel}")
            continue
        if entry.get("bytes") != path.stat().st_size:
            errors.append(f"manifest byte count mismatch: {rel}")
        if entry.get("sha256") != sha256(path):
            errors.append(f"manifest sha256 mismatch: {rel}")


def referenced_path(folder: Path, value: object) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    path = Path(value)
    return path if path.is_absolute() else folder / path


def validate_packet(folder: Path) -> list[str]:
    errors: list[str] = []
    packet_path = folder / "evidence_packet.json"
    if not packet_path.exists():
        return [f"missing evidence_packet.json in {folder}"]
    try:
        packet = json.loads(packet_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        return [f"evidence_packet.json invalid JSON: {exc}"]
    if not isinstance(packet, dict):
        return ["evidence_packet.json must contain an object"]

    for key in REQUIRED_TOP_LEVEL:
        if key not in packet:
            errors.append(f"missing top-level field: {key}")
    if packet.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")

    flags = packet.get("claim_flags")
    if not isinstance(flags, dict):
        errors.append("claim_flags must be an object")
        flags = {}
    for flag in REQUIRED_FLAGS:
        if not isinstance(flags.get(flag), bool):
            errors.append(f"claim_flags.{flag} must be boolean")
    if flags.get("certified_safety_claim") is not False:
        errors.append("claim_flags.certified_safety_claim must be false")
    if flags.get("production_controller_claim") is not False:
        errors.append("claim_flags.production_controller_claim must be false")

    sections = packet.get("sections")
    if not isinstance(sections, dict):
        errors.append("sections must be an object")
        sections = {}
    for section in REQUIRED_SECTIONS:
        value = sections.get(section)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"sections.{section} must be non-empty text")

    blocked_claims = packet.get("blocked_claims")
    if not isinstance(blocked_claims, list) or not blocked_claims:
        errors.append("blocked_claims must be a non-empty list")
    elif not any("certified safety" in str(item).lower() for item in blocked_claims):
        errors.append("blocked_claims must explicitly block certified safety")
    elif not any("production" in str(item).lower() for item in blocked_claims):
        errors.append("blocked_claims must explicitly block production-controller claims")

    artifacts = packet.get("artifacts")
    if not isinstance(artifacts, dict):
        errors.append("artifacts must be an object")
        artifacts = {}

    evidence_level = packet.get("evidence_level")
    if evidence_level not in {"draft", "simulated", "live_capture"}:
        errors.append("evidence_level must be draft, simulated, or live_capture")

    trace_path = referenced_path(folder, artifacts.get("trace_path"))
    validation_path = referenced_path(folder, artifacts.get("validation_output_path"))
    replay_path = referenced_path(folder, artifacts.get("replay_output_path"))
    live_claim = flags.get("hardware_observed") or flags.get("live_serial_capture_performed") or evidence_level == "live_capture"
    if live_claim and (trace_path is None or not trace_path.exists()):
        errors.append("live/hardware packet must reference an existing trace_path")
    for label, path in (("trace_path", trace_path), ("validation_output_path", validation_path), ("replay_output_path", replay_path)):
        if path is not None and (not path.exists() or path.stat().st_size == 0):
            errors.append(f"artifacts.{label} references a missing or empty file")

    if packet.get("review_status") != "draft":
        if validation_path is None:
            errors.append("non-draft packet must reference validation_output_path")
        if replay_path is None:
            errors.append("non-draft packet must reference replay_output_path")
    if flags.get("hardware_observed") and flags.get("live_serial_capture_performed") is not True:
        errors.append("hardware_observed true requires live_serial_capture_performed true")

    findings = folder / "FINDINGS.md"
    if findings.exists():
        text = findings.read_text(encoding="utf-8")
        for heading in ("Course Claim", "Simulation Evidence", "Physical Evidence", "Sim Vs Hardware Comparison", "Domain Safety Lens", "Blocked Claims"):
            if heading not in text:
                errors.append(f"FINDINGS.md missing heading: {heading}")

    validate_manifest(folder, errors)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    errors = validate_packet(args.folder)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"Course evidence packet validation PASS: {args.folder}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
