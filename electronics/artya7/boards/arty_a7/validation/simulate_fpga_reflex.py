#!/usr/bin/env python3
"""Emit simulated Arty A7 reflex JSONL frames for the Robotics Reflex Inspector."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DEMO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = Path("/tmp/arty_a7_reflex_simulated.jsonl")
SCHEMA_VERSION = "substrate-demo-v0.serial-frame.v0"
SOURCE_MODE = "fpga_serial"
MAX_OUTPUT_Q8 = 153
PERTURB_Q8 = 32


def load_kernel_hash() -> str:
    manifest = json.loads((DEMO_ROOT / "manifest.json").read_text(encoding="utf-8"))
    return manifest["kernel_sha256"]


def q8_to_unit(value: int) -> float:
    return round(max(0, min(255, value)) / 255.0, 6)


def frame_for_switch(switch_value: int, kernel_sha256: str) -> dict:
    pot_q8 = switch_value * 17
    perturb = switch_value in {5, 10, 15}
    requested_q8 = min(255, pot_q8 + (PERTURB_Q8 if perturb else 0))
    safe_q8 = min(requested_q8, MAX_OUTPUT_Q8)
    clamped = requested_q8 > MAX_OUTPUT_Q8
    margin_q8 = max(0, MAX_OUTPUT_Q8 - requested_q8)
    safe = q8_to_unit(safe_q8)
    pot_raw = q8_to_unit(pot_q8)
    requested = q8_to_unit(requested_q8)

    return {
        "schema_version": SCHEMA_VERSION,
        "kernel_sha256": kernel_sha256,
        "sample_index": switch_value,
        "timestamp_ms": float(switch_value * 20),
        "pot_raw": pot_raw,
        "switch_bits": f"{switch_value:04b}",
        "source_mode": SOURCE_MODE,
        "outputs": {
            "buzzer": safe,
            "led": pot_raw,
            "status": 1.0 if clamped else 0.0,
            "oled": safe,
        },
        "latency": {"fpga_reflex": {"value": 1.0, "unit": "us"}},
        "guard": {
            "requested_output": requested,
            "safe_output": safe,
            "safety_margin": q8_to_unit(margin_q8),
            "bottleneck": "led_duty_margin" if clamped else "none",
            "guard_action": "clamp_to_safe_output" if clamped else "pass_through",
            "simulated": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    kernel_sha256 = load_kernel_hash()
    frames = [frame_for_switch(value, kernel_sha256) for value in range(16)]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        "".join(json.dumps(frame, sort_keys=True, separators=(",", ":")) + "\n" for frame in frames),
        encoding="utf-8",
    )
    print(f"wrote: {args.out}")
    print(f"frames: {len(frames)}")
    print(f"source_mode: {SOURCE_MODE}")
    print("guard.simulated: false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
