import { describe, expect, it } from "vitest";
import { boundaryModes, runOptimizationBoundary, treeDepthForDimension } from "./optimizationBoundary";

describe("optimization boundary simulator", () => {
  it("emits the required simulated evidence packet boundary flags", () => {
    const run = runOptimizationBoundary({
      dimension: 32,
      sampleCount: 256,
      mode: "guarded",
      seed: 1701
    });

    expect(run.packet).toMatchObject({
      schema_version: "monogate-electronics.boundary-run.v0",
      course: "006-ee-math-kernels",
      module: "optimization-boundary",
      simulated: true,
      hardware_observed: false,
      dimension: 32,
      tree_depth: 8,
      sample_count: 256,
      mode: "guarded",
      seed: 1701,
      boundary_flags: {
        live_serial_capture_performed: false,
        hardware_action_performed: false,
        esp32_flash_performed: false,
        fpga_programming_performed: false
      }
    });
    expect(run.packet.finite_survival_rate).toBe(1);
    expect(run.frames.length).toBeGreaterThan(4);
  });

  it("keeps deterministic replay stable for the same seed", () => {
    const first = runOptimizationBoundary({ dimension: 64, sampleCount: 256, mode: "raw", seed: 1701 });
    const second = runOptimizationBoundary({ dimension: 64, sampleCount: 256, mode: "raw", seed: 1701 });

    expect(second).toEqual(first);
  });

  it("shows higher-dimensional runs concentrating on boundary states", () => {
    const low = runOptimizationBoundary({ dimension: 2, sampleCount: 256, mode: "guarded", seed: 1701 });
    const high = runOptimizationBoundary({ dimension: 64, sampleCount: 256, mode: "guarded", seed: 1701 });

    expect(treeDepthForDimension(64)).toBe(16);
    expect(high.packet.boundary_hits).toBeGreaterThan(low.packet.boundary_hits);
    expect(high.packet.center_hits).toBeLessThanOrEqual(low.packet.center_hits);
  });

  it("auto rescue turns raw failures into intervention events on the same sample stream", () => {
    const raw = runOptimizationBoundary({ dimension: 64, sampleCount: 256, mode: "raw", seed: 1701 });
    const rescued = runOptimizationBoundary({ dimension: 64, sampleCount: 256, mode: "auto rescue", seed: 1701 });

    expect(boundaryModes).toContain("auto rescue");
    expect(rescued.packet.mode).toBe("auto rescue");
    expect(rescued.packet.domain_failures).toBeLessThanOrEqual(raw.packet.domain_failures);
    expect(rescued.packet.saturation_events).toBeLessThanOrEqual(raw.packet.saturation_events);
    expect(rescued.packet.rescue_events).toBeGreaterThan(0);
    expect(rescued.packet.intervention_counts.none).toBeLessThan(rescued.packet.sample_count);
    expect(rescued.frames.some((frame) => frame.guard_status === "auto_rescue")).toBe(true);
  });
});
