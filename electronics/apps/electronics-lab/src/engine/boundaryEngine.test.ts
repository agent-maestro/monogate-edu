import { describe, expect, it } from "vitest";
import {
  buildTransitionCounts,
  classifyBoundaryEvent,
  dimensionFromPot,
  dominantTransition,
  runBoundaryExperiment,
  transitionEntropy,
  type BoundaryTraceFrame,
} from "./boundaryEngine";

describe("boundary optimizer simulator", () => {
  it("maps the trainer-board potentiometer to course dimensions", () => {
    expect(dimensionFromPot(0)).toBe(2);
    expect(dimensionFromPot(0.5)).toBe(16);
    expect(dimensionFromPot(1)).toBe(64);
  });

  it("emits a deterministic simulated evidence packet", () => {
    const config = {
      dimension: 32,
      treeDepth: 8,
      sampleCount: 256,
      mode: "guarded" as const,
      seed: 1701,
    };
    const first = runBoundaryExperiment(config);
    const second = runBoundaryExperiment(config);

    expect(second).toEqual(first);
    expect(first.schema_version).toBe("monogate-electronics.boundary-run.v0");
    expect(first.simulated).toBe(true);
    expect(first.hardware_observed).toBe(false);
    expect(first.boundary_flags.live_serial_capture_performed).toBe(false);
    expect(first.boundary_hits).toBeGreaterThan(first.center_hits);
    expect(first.event_counts.corner_concentration + first.event_counts.guard_rescue).toBeGreaterThan(0);
    expect(Object.keys(first.transition_counts).length).toBeGreaterThan(0);
    expect(first.transition_entropy).toBeGreaterThanOrEqual(0);
    expect(first.dominant_transition).toContain("->");
    expect(first.trace_preview[0].event_class).toBeTruthy();
    expect(first.finite_survival_rate).toBeGreaterThan(0.9);
  });

  it("shows log-domain candidates survive at least as well as raw mode for the same seed", () => {
    const raw = runBoundaryExperiment({
      dimension: 64,
      treeDepth: 8,
      sampleCount: 512,
      mode: "raw",
      seed: 42,
    });
    const logDomain = runBoundaryExperiment({
      dimension: 64,
      treeDepth: 8,
      sampleCount: 512,
      mode: "log-domain candidate",
      seed: 42,
    });

    expect(logDomain.domain_failures).toBeLessThanOrEqual(raw.domain_failures);
    expect(logDomain.finite_survival_rate).toBeGreaterThanOrEqual(raw.finite_survival_rate);
    expect(logDomain.event_counts.log_domain_rescue).toBeGreaterThan(0);
  });

  it("auto rescue classifies bad flows as active interventions", () => {
    const rescued = runBoundaryExperiment({
      dimension: 64,
      treeDepth: 8,
      sampleCount: 512,
      mode: "auto rescue",
      seed: 42,
    });

    expect(rescued.domain_failures).toBe(0);
    expect(rescued.saturation_events).toBe(0);
    expect(rescued.event_counts.auto_rescue).toBeGreaterThan(0);
  });

  it("classifies the boundary taxonomy with stable priority", () => {
    expect(classifyBoundaryEvent({
      mode: "raw",
      boundaryHit: true,
      centerHit: false,
      domainFailure: true,
      saturationEvent: true,
      rawWouldFail: true,
      pressure: 4.9,
    })).toBe("overflow_wall");
    expect(classifyBoundaryEvent({
      mode: "guarded",
      boundaryHit: true,
      centerHit: false,
      domainFailure: false,
      saturationEvent: false,
      rawWouldFail: true,
      pressure: 4.9,
    })).toBe("guard_rescue");
    expect(classifyBoundaryEvent({
      mode: "auto rescue",
      boundaryHit: true,
      centerHit: false,
      domainFailure: false,
      saturationEvent: false,
      rawWouldFail: true,
      pressure: 4.9,
    })).toBe("auto_rescue");
  });

  it("builds transition graphs and entropy from event frames", () => {
    const frames = [
      "interior_sample",
      "corner_concentration",
      "overflow_wall",
      "guard_rescue",
      "guard_rescue",
    ].map((eventClass, index) => ({
      sample_index: index,
      max_abs_coordinate: 0,
      pressure: 0,
      boundary_hit: false,
      center_hit: false,
      domain_failure: false,
      saturation_event: false,
      finite_survived: true,
      event_class: eventClass,
    })) as BoundaryTraceFrame[];
    const transitions = buildTransitionCounts(frames);

    expect(transitions["interior_sample->corner_concentration"]).toBe(1);
    expect(transitions["guard_rescue->guard_rescue"]).toBe(1);
    expect(transitionEntropy(transitions)).toBeGreaterThan(0);
    expect(dominantTransition(transitions)).toBeTruthy();
  });
});
