#!/usr/bin/env python3
"""Validate the Monogate Electronics evidence graph."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Any


SUPPORTED_STATUSES = {
    "supported",
    "supported_by_simulated_and_staged_evidence",
    "validated",
    "validated_62_of_62",
}

PLANNED_OR_BLOCKED_STATUSES = {
    "planned",
    "planned_breadboard_first",
    "planned_after_trainer_board",
    "not_yet_supported",
    "simulated_only",
    "optional_future_formal_path",
}


def load_graph(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON: {exc}") from exc


def node_map(graph: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {node["id"]: node for node in graph.get("nodes", []) if isinstance(node, dict) and "id" in node}


def reachable_sources(edges: list[dict[str, Any]], target: str, edge_type: str) -> set[str]:
    reverse: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if edge.get("type") == edge_type:
            reverse[str(edge.get("to"))].append(str(edge.get("from")))

    seen: set[str] = set()
    queue: deque[str] = deque(reverse.get(target, []))
    while queue:
        current = queue.popleft()
        if current in seen:
            continue
        seen.add(current)
        queue.extend(reverse.get(current, []))
    return seen


def validate(graph_path: Path) -> tuple[list[str], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    graph = load_graph(graph_path)
    root = graph_path.parent

    nodes = graph.get("nodes")
    edges = graph.get("edges")
    if not isinstance(nodes, list):
        errors.append("nodes must be a list")
        nodes = []
    if not isinstance(edges, list):
        errors.append("edges must be a list")
        edges = []

    ids = [node.get("id") for node in nodes if isinstance(node, dict)]
    duplicates = sorted(node_id for node_id, count in Counter(ids).items() if count > 1)
    for node_id in duplicates:
        errors.append(f"duplicate node id: {node_id}")

    nodes_by_id = node_map(graph)
    allowed_node_types = set(graph.get("node_types", []))
    allowed_edge_types = set(graph.get("edge_types", []))

    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"node {index}: must be an object")
            continue
        for key in ("id", "type", "label", "status"):
            if key not in node:
                errors.append(f"node {index}: missing {key}")
        node_type = node.get("type")
        if allowed_node_types and node_type not in allowed_node_types:
            errors.append(f"node {node.get('id', index)}: unknown type {node_type}")
        path_value = node.get("path")
        if path_value:
            node_path = root / str(path_value)
            if not node_path.exists():
                warnings.append(f"node {node.get('id')}: path does not exist: {path_value}")

    incoming_by_type: dict[tuple[str, str], int] = Counter()
    outgoing_by_type: dict[tuple[str, str], int] = Counter()
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"edge {index}: must be an object")
            continue
        for key in ("from", "to", "type"):
            if key not in edge:
                errors.append(f"edge {index}: missing {key}")
        source = edge.get("from")
        target = edge.get("to")
        edge_type = edge.get("type")
        if source not in nodes_by_id:
            errors.append(f"edge {index}: missing source node {source}")
        if target not in nodes_by_id:
            errors.append(f"edge {index}: missing target node {target}")
        if allowed_edge_types and edge_type not in allowed_edge_types:
            errors.append(f"edge {index}: unknown type {edge_type}")
        if source and edge_type:
            outgoing_by_type[(str(source), str(edge_type))] += 1
        if target and edge_type:
            incoming_by_type[(str(target), str(edge_type))] += 1

    for node_id, node in sorted(nodes_by_id.items()):
        node_type = node.get("type")
        status = str(node.get("status", ""))
        if node_type == "claim":
            support_count = incoming_by_type[(node_id, "supports")]
            boundary_count = outgoing_by_type[(node_id, "bounded_by")]
            if status in SUPPORTED_STATUSES and support_count == 0:
                errors.append(f"claim {node_id}: supported status but no incoming supports edge")
            if status in SUPPORTED_STATUSES and boundary_count == 0:
                errors.append(f"claim {node_id}: supported status but no outgoing bounded_by edge")
            if status in PLANNED_OR_BLOCKED_STATUSES:
                notes.append(f"planned/blocked claim: {node_id} ({status})")

        if node_type in {"hardware_plan", "board", "roadmap"} and status in PLANNED_OR_BLOCKED_STATUSES:
            blockers = outgoing_by_type[(node_id, "blocked_by")]
            if blockers:
                notes.append(f"blocked hardware/roadmap: {node_id} ({blockers} blocker edge(s))")

    for node_id, node in sorted(nodes_by_id.items()):
        if node.get("type") == "claim" and str(node.get("status")) in SUPPORTED_STATUSES:
            sources = reachable_sources(edges, node_id, "supports")
            evidence_like = [
                source for source in sources
                if nodes_by_id.get(source, {}).get("type") in {"trace", "evidence", "board"}
            ]
            if not evidence_like:
                warnings.append(f"claim {node_id}: no trace/evidence/board source reaches it through supports")

    return errors, warnings, notes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", default="electronics_graph.json", type=Path)
    args = parser.parse_args()

    try:
        errors, warnings, notes = validate(args.path)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    for note in notes:
        print(f"NOTE: {note}")
    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    graph = load_graph(args.path)
    print(
        "Electronics graph validation PASS: "
        f"{len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges, "
        f"{len(warnings)} warnings"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
