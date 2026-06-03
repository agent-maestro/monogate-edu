#!/usr/bin/env python3
"""Create a reusable Monogate course evidence packet starter."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COURSE_ID = "reflex_lab_01"
DEFAULT_PACKET_PREFIX = "reflex_lab_01_reflexcourse"
SCHEMA_VERSION = "monogate-electronics.course-evidence-packet.v0"


COURSE_DEFAULTS = {
    "reflex_lab_01": {
        "course_title": "Reflex Lab 01: Pot to Guarded Output",
        "kernel_id": "threshold_reflex_v0",
        "claim": (
            "Reflex Course runs threshold_reflex_v0 on low-voltage hardware "
            "or simulation and produces replayable evidence of guard behavior."
        ),
        "hardware": "Reflex Course breadboard build: ESP32, potentiometer, LED, piezo buzzer.",
    },
    "analog_decisions": {
        "course_title": "Analog Decisions: ADC Thresholds And Deadband",
        "kernel_id": "analog_decision_v0",
        "claim": (
            "A low-voltage ESP32/UNO bench circuit normalizes potentiometer or "
            "LDR input, applies a documented threshold/deadband rule, and "
            "reports the same decision through trace and visible output."
        ),
        "hardware": "ESP32 or UNO breadboard build: potentiometer, LDR divider, LED/buzzer, optional OLED/LCD.",
    },
    "environment_guard_node": {
        "course_title": "Environmental Guard Node: BME280 And OLED",
        "kernel_id": "environment_guard_v0",
        "claim": (
            "A low-voltage ESP32 bench circuit reads BME280 environmental data, "
            "handles stale or invalid readings explicitly, and reports state "
            "through OLED/display output, trace, and guarded indicators."
        ),
        "hardware": "ESP32 breadboard build: BME280, SSD1306 OLED, LED/buzzer indicators.",
    },
    "soundfield_kernels": {
        "course_title": "Soundfield Kernels",
        "kernel_id": "soundfield_energy_v0",
        "claim": (
            "A simulated or low-voltage audio input maps sound features into "
            "bounded visual output and replayable trace evidence."
        ),
        "hardware": "Simulated audio first; optional microphone and LED matrix after current boundaries are documented.",
    },
    "hydro_guard_node": {
        "course_title": "Hydroponic Guard Node",
        "kernel_id": "hydro_guard_v0",
        "claim": (
            "A low-voltage simulated or bench system applies explicit dry-run, "
            "sensor trust, and environmental lockout behavior before any pump "
            "or field automation claim."
        ),
        "hardware": "Simulated first; water/environment sensors and output indicators only until actuator boundaries are approved.",
    }
}


def write_new(path: Path, text: str) -> bool:
    if path.exists():
        return False
    path.write_text(text, encoding="utf-8")
    return True


def packet_json(course_id: str, packet_id: str, title: str, kernel_id: str, claim: str) -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "packet_id": packet_id,
        "course_id": course_id,
        "course_title": title,
        "kernel_id": kernel_id,
        "evidence_level": "draft",
        "review_status": "draft",
        "claim_flags": {
            "simulated": False,
            "hardware_observed": False,
            "live_serial_capture_performed": False,
            "certified_safety_claim": False,
            "production_controller_claim": False,
        },
        "sections": {
            "course_claim": claim,
            "simulation_evidence": "Pending: expected trace, validation output, replay output.",
            "physical_evidence": "Pending: live trace, wiring photo, dashboard export, demo media.",
            "sim_vs_hardware_comparison": "Pending: compare expected guard behavior with physical capture.",
            "domain_safety_lens": (
                "Low-voltage educational evidence only. No high-current loads, mains voltage, "
                "motors, relays, coils, certified safety, or production-control claims."
            ),
            "blocked_claims": "See blocked_claims list.",
            "artifacts_links": "Pending: local files, screenshots, photos, video links, docs links.",
            "review_status": "Draft packet starter. Human review required before public/supporting claim use.",
        },
        "artifacts": {
            "trace_path": None,
            "validation_output_path": None,
            "replay_output_path": None,
            "dashboard_export_path": None,
            "graph_png_path": None,
            "wiring_photo_paths": [],
            "demo_media_links": [],
            "docs_links": [],
        },
        "hardware_identity": {
            "board_id": None,
            "board_revision": None,
            "esp32_chip_mac": None,
            "firmware_reported": False,
        },
        "blocked_claims": [
            "No certified safety claim.",
            "No production controller claim.",
            "No high-current actuation claim.",
            "No motor, relay, solenoid, coil, or mains-voltage validation claim.",
            "No hardware truth claim unless live capture and operator-supplied physical artifacts are present.",
        ],
    }


def findings_md(packet_id: str, title: str, kernel_id: str, claim: str, hardware: str) -> str:
    return f"""# {title} Evidence Packet Findings

Packet ID: `{packet_id}`

Kernel: `{kernel_id}`

Review status: draft

## Course Claim

{claim}

## Simulation Evidence

- Expected trace:
- Validation output:
- Replay output:
- Notes:

## Physical Evidence

- Hardware: {hardware}
- Live trace:
- Dashboard export:
- Graph PNG:
- Wiring photo before power:
- Demo photo/video:
- Measurements or observations:

## Sim Vs Hardware Comparison

- Expected guard behavior:
- Observed guard behavior:
- Differences/noise/latency:
- Does the narrow claim still hold:

## Domain Safety Lens

This packet is low-voltage educational evidence. It is not certified safety
evidence and is not a production-controller readiness packet.

## Blocked Claims

This evidence does not claim:

- certified safety;
- production controller readiness;
- autonomous system behavior;
- high-current actuation;
- motor, relay, solenoid, coil, or mains-voltage validation;
- hardware truth without live capture and operator-supplied physical artifacts.

## Artifacts And Links

- Packet JSON: `evidence_packet.json`
- Manifest: `PACKET_MANIFEST.json`
- Docs:
- Video:
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--course-id", default=DEFAULT_COURSE_ID)
    parser.add_argument("--packet-id")
    parser.add_argument("--date", default=date.today().strftime("%Y_%m_%d"))
    parser.add_argument("--root", default=ROOT / "evidence" / "courses", type=Path)
    parser.add_argument(
        "--flat",
        action="store_true",
        help="Create <root>/<packet_id> instead of <root>/<course_id>/<packet_id>.",
    )
    args = parser.parse_args()

    defaults = COURSE_DEFAULTS.get(args.course_id, {})
    title = str(defaults.get("course_title", args.course_id.replace("_", " ").title()))
    kernel_id = str(defaults.get("kernel_id", "unknown"))
    claim = str(defaults.get("claim", "Pending course claim."))
    hardware = str(defaults.get("hardware", "Pending hardware description."))
    prefix = DEFAULT_PACKET_PREFIX if args.course_id == DEFAULT_COURSE_ID else args.course_id
    packet_id = args.packet_id or f"{prefix}_{args.date}"

    folder = args.root / packet_id if args.flat else args.root / args.course_id / packet_id
    folder.mkdir(parents=True, exist_ok=True)

    created = []
    if write_new(folder / "evidence_packet.json", json.dumps(packet_json(args.course_id, packet_id, title, kernel_id, claim), indent=2) + "\n"):
        created.append("evidence_packet.json")
    if write_new(folder / "FINDINGS.md", findings_md(packet_id, title, kernel_id, claim, hardware)):
        created.append("FINDINGS.md")
    readme = f"""# {title} Evidence Packet

Packet ID: `{packet_id}`

This folder follows `monogate-electronics.course-evidence-packet.v0`.

Create a SHA manifest after adding packet artifacts:

```powershell
python tools\\make_packet.py {folder} --out {folder}\\PACKET_MANIFEST.json
python tools\\validate_course_evidence_packet.py {folder}
```
"""
    if write_new(folder / "README.md", readme):
        created.append("README.md")

    print(f"course evidence folder: {folder}")
    print("created: " + ", ".join(created) if created else "no files overwritten")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
