export const boundaryDimensions = [2, 4, 8, 16, 32, 64] as const;
export const boundarySampleCounts = [64, 256, 1024] as const;
export const boundaryModes = ["raw", "guarded", "log-domain candidate", "auto rescue"] as const;

export type BoundaryDimension = (typeof boundaryDimensions)[number];
export type BoundarySampleCount = (typeof boundarySampleCounts)[number];
export type BoundaryMode = (typeof boundaryModes)[number];

export type BoundaryTraceFrame = {
  frame_index: number;
  sample_index: number;
  coordinate_max_abs: number;
  center_distance: number;
  boundary_hit: boolean;
  center_hit: boolean;
  domain_failure: boolean;
  saturation_event: boolean;
  guard_status: "raw_unchecked" | "pass" | "clamp" | "log_stable" | "auto_rescue";
  intervention: "none" | "tree_rewrite" | "phantom_attractor_escape" | "boundary_resample";
  raw_domain_failure: boolean;
  raw_saturation_event: boolean;
  finite_survival_rate: number;
};

export type BoundaryEvidencePacket = {
  schema_version: "monogate-electronics.boundary-run.v0";
  course: "006-ee-math-kernels";
  module: "optimization-boundary";
  simulated: true;
  hardware_observed: false;
  dimension: BoundaryDimension;
  tree_depth: number;
  sample_count: BoundarySampleCount;
  mode: BoundaryMode;
  seed: number;
  center_hits: number;
  boundary_hits: number;
  domain_failures: number;
  saturation_events: number;
  rescue_events: number;
  intervention_counts: Record<BoundaryTraceFrame["intervention"], number>;
  finite_survival_rate: number;
  boundary_flags: {
    live_serial_capture_performed: false;
    hardware_action_performed: false;
    esp32_flash_performed: false;
    fpga_programming_performed: false;
  };
};

export type BoundaryRun = {
  packet: BoundaryEvidencePacket;
  frames: BoundaryTraceFrame[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function treeDepthForDimension(dimension: BoundaryDimension): number {
  return Math.max(2, dimension / 4);
}

export function modeLabel(mode: BoundaryMode): string {
  if (mode === "log-domain candidate") return "log-domain";
  if (mode === "auto rescue") return "auto rescue";
  return mode;
}

export function runOptimizationBoundary({
  dimension,
  sampleCount,
  mode,
  seed
}: {
  dimension: BoundaryDimension;
  sampleCount: BoundarySampleCount;
  mode: BoundaryMode;
  seed: number;
}): BoundaryRun {
  const random = seededRandom(seed + dimension * 97 + sampleCount * 13);
  const treeDepth = treeDepthForDimension(dimension);
  const frameStride = Math.max(1, Math.floor(sampleCount / 12));
  const frames: BoundaryTraceFrame[] = [];
  let centerHits = 0;
  let boundaryHits = 0;
  let domainFailures = 0;
  let saturationEvents = 0;
  let rescueEvents = 0;
  const interventionCounts: Record<BoundaryTraceFrame["intervention"], number> = {
    none: 0,
    tree_rewrite: 0,
    phantom_attractor_escape: 0,
    boundary_resample: 0
  };

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    let maxAbs = 0;
    let sumSquares = 0;
    for (let coordinateIndex = 0; coordinateIndex < dimension; coordinateIndex += 1) {
      const coordinate = random() * 2 - 1;
      const abs = Math.abs(coordinate);
      maxAbs = Math.max(maxAbs, abs);
      sumSquares += coordinate * coordinate;
    }

    const centerDistance = Math.sqrt(sumSquares / dimension);
    const boundaryBand = 1 - 1 / (treeDepth + 3);
    const boundaryHit = maxAbs >= boundaryBand;
    const centerHit = centerDistance <= 0.42 && maxAbs <= 0.62;
    const rawRisk = maxAbs ** treeDepth + centerDistance * 0.32;
    const rawDomainFailure = rawRisk > 1.03 || maxAbs > 0.985;
    const rawSaturationEvent = rawRisk > 0.94;
    const guardClamped = mode === "guarded" && rawRisk > 0.92;
    const logStabilized = mode === "log-domain candidate" && rawRisk > 0.92;
    const phantomAttractor = centerHit && centerDistance > 0.36 && rawRisk > 0.32;
    const intervention =
      mode !== "auto rescue"
        ? "none"
        : rawDomainFailure
          ? "tree_rewrite"
          : phantomAttractor
            ? "phantom_attractor_escape"
            : boundaryHit && rawRisk > 0.52
              ? "boundary_resample"
              : "none";
    const rescued = intervention !== "none";
    const effectiveBoundaryHit = mode === "auto rescue" && intervention === "boundary_resample" ? false : boundaryHit;
    const effectiveCenterHit =
      mode === "auto rescue" && intervention === "phantom_attractor_escape" ? false : centerHit;
    const domainFailure = mode === "raw" ? rawDomainFailure : false;
    const saturationEvent =
      mode === "raw"
        ? rawSaturationEvent
        : mode === "guarded"
          ? guardClamped
          : mode === "auto rescue"
            ? false
            : rawRisk > 1.12 && !logStabilized;

    if (effectiveCenterHit) centerHits += 1;
    if (effectiveBoundaryHit) boundaryHits += 1;
    if (domainFailure) domainFailures += 1;
    if (saturationEvent) saturationEvents += 1;
    if (rescued) rescueEvents += 1;
    interventionCounts[intervention] += 1;

    if (sampleIndex % frameStride === 0 || sampleIndex === sampleCount - 1) {
      frames.push({
        frame_index: frames.length,
        sample_index: sampleIndex,
        coordinate_max_abs: Number(maxAbs.toFixed(4)),
        center_distance: Number(centerDistance.toFixed(4)),
        boundary_hit: effectiveBoundaryHit,
        center_hit: effectiveCenterHit,
        domain_failure: domainFailure,
        saturation_event: saturationEvent,
        guard_status:
          mode === "raw"
            ? "raw_unchecked"
            : mode === "log-domain candidate"
              ? "log_stable"
              : mode === "auto rescue"
                ? rescued
                  ? "auto_rescue"
                  : "pass"
                : guardClamped
                  ? "clamp"
                  : "pass",
        intervention,
        raw_domain_failure: rawDomainFailure,
        raw_saturation_event: rawSaturationEvent,
        finite_survival_rate: Number(((sampleIndex + 1 - domainFailures) / (sampleIndex + 1)).toFixed(4))
      });
    }
  }

  const finiteSurvivalRate = clamp((sampleCount - domainFailures) / sampleCount, 0, 1);

  return {
    packet: {
      schema_version: "monogate-electronics.boundary-run.v0",
      course: "006-ee-math-kernels",
      module: "optimization-boundary",
      simulated: true,
      hardware_observed: false,
      dimension,
      tree_depth: treeDepth,
      sample_count: sampleCount,
      mode,
      seed,
      center_hits: centerHits,
      boundary_hits: boundaryHits,
      domain_failures: domainFailures,
      saturation_events: saturationEvents,
      rescue_events: rescueEvents,
      intervention_counts: interventionCounts,
      finite_survival_rate: Number(finiteSurvivalRate.toFixed(4)),
      boundary_flags: {
        live_serial_capture_performed: false,
        hardware_action_performed: false,
        esp32_flash_performed: false,
        fpga_programming_performed: false
      }
    },
    frames
  };
}
