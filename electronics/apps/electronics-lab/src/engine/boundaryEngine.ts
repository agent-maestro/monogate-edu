export type BoundaryMode = "raw" | "guarded" | "log-domain candidate" | "auto rescue";
export type BoundaryEventClass =
  | "interior_sample"
  | "corner_concentration"
  | "domain_wall"
  | "overflow_wall"
  | "saturation_shelf"
  | "phantom_attractor"
  | "guard_rescue"
  | "log_domain_rescue"
  | "auto_rescue";

export type BoundaryRunConfig = {
  dimension: number;
  treeDepth: number;
  sampleCount: number;
  mode: BoundaryMode;
  seed: number;
};

export type BoundaryTraceFrame = {
  sample_index: number;
  max_abs_coordinate: number;
  pressure: number;
  boundary_hit: boolean;
  center_hit: boolean;
  domain_failure: boolean;
  saturation_event: boolean;
  finite_survived: boolean;
  event_class: BoundaryEventClass;
};

export type BoundaryRunPacket = {
  schema_version: "monogate-electronics.boundary-run.v0";
  course: "006-ee-math-kernels";
  module: "optimization-boundary";
  simulated: true;
  hardware_observed: false;
  dimension: number;
  tree_depth: number;
  sample_count: number;
  mode: BoundaryMode;
  seed: number;
  center_hits: number;
  boundary_hits: number;
  domain_failures: number;
  saturation_events: number;
  finite_survival_rate: number;
  event_counts: Record<BoundaryEventClass, number>;
  transition_counts: Record<string, number>;
  transition_entropy: number;
  dominant_transition: string | null;
  trace_preview: BoundaryTraceFrame[];
  boundary_flags: {
    live_serial_capture_performed: false;
    hardware_action_performed: false;
    esp32_flash_performed: false;
    fpga_programming_performed: false;
  };
};

const BOUNDARY_EPSILON = 0.12;
const CENTER_RADIUS = 0.33;
const eventClasses: BoundaryEventClass[] = [
  "interior_sample",
  "corner_concentration",
  "domain_wall",
  "overflow_wall",
  "saturation_shelf",
  "phantom_attractor",
  "guard_rescue",
  "log_domain_rescue",
  "auto_rescue",
];

export function dimensionFromPot(potRaw: number): number {
  const dimensions = [2, 4, 8, 16, 32, 64];
  const index = Math.min(dimensions.length - 1, Math.max(0, Math.round(potRaw * (dimensions.length - 1))));
  return dimensions[index];
}

export function runBoundaryExperiment(config: BoundaryRunConfig): BoundaryRunPacket {
  const rand = seededRandom(config.seed);
  const frames: BoundaryTraceFrame[] = [];

  for (let sampleIndex = 0; sampleIndex < config.sampleCount; sampleIndex += 1) {
    let maxAbs = 0;
    let squaredNorm = 0;
    for (let i = 0; i < config.dimension; i += 1) {
      const coord = rand() * 2 - 1;
      const abs = Math.abs(coord);
      maxAbs = Math.max(maxAbs, abs);
      squaredNorm += coord * coord;
    }

    const normalizedRadius = Math.sqrt(squaredNorm / config.dimension);
    const boundaryHit = maxAbs >= 1 - BOUNDARY_EPSILON;
    const centerHit = normalizedRadius <= CENTER_RADIUS;
    const pressure = maxAbs * Math.log2(config.dimension + config.treeDepth);
    const domainDraw = rand();
    const rawWouldFail = pressure > 4.15 || domainDraw < config.dimension / 520;
    const rawWouldSaturate = maxAbs > 0.96;

    let domainFailure = false;
    let saturationEvent = false;
    if (config.mode === "raw") {
      domainFailure = rawWouldFail;
      saturationEvent = rawWouldSaturate;
    } else if (config.mode === "guarded") {
      domainFailure = pressure > 5.8 && domainDraw < 0.08;
      saturationEvent = maxAbs > 0.97;
    } else if (config.mode === "log-domain candidate") {
      domainFailure = false;
      saturationEvent = maxAbs > 0.992;
    } else {
      domainFailure = false;
      saturationEvent = false;
    }
    const eventClass = classifyBoundaryEvent({
      mode: config.mode,
      boundaryHit,
      centerHit,
      domainFailure,
      saturationEvent,
      rawWouldFail,
      pressure,
    });

    frames.push({
      sample_index: sampleIndex,
      max_abs_coordinate: round(maxAbs),
      pressure: round(pressure),
      boundary_hit: boundaryHit,
      center_hit: centerHit,
      domain_failure: domainFailure,
      saturation_event: saturationEvent,
      finite_survived: !domainFailure,
      event_class: eventClass,
    });
  }

  const centerHits = frames.filter((frame) => frame.center_hit).length;
  const boundaryHits = frames.filter((frame) => frame.boundary_hit).length;
  const domainFailures = frames.filter((frame) => frame.domain_failure).length;
  const saturationEvents = frames.filter((frame) => frame.saturation_event).length;
  const finiteSurvivalRate = (config.sampleCount - domainFailures) / config.sampleCount;
  const eventCounts = Object.fromEntries(
    eventClasses.map((eventClass) => [
      eventClass,
      frames.filter((frame) => frame.event_class === eventClass).length,
    ])
  ) as Record<BoundaryEventClass, number>;
  const transitionCounts = buildTransitionCounts(frames);

  return {
    schema_version: "monogate-electronics.boundary-run.v0",
    course: "006-ee-math-kernels",
    module: "optimization-boundary",
    simulated: true,
    hardware_observed: false,
    dimension: config.dimension,
    tree_depth: config.treeDepth,
    sample_count: config.sampleCount,
    mode: config.mode,
    seed: config.seed,
    center_hits: centerHits,
    boundary_hits: boundaryHits,
    domain_failures: domainFailures,
    saturation_events: saturationEvents,
    finite_survival_rate: round(finiteSurvivalRate),
    event_counts: eventCounts,
    transition_counts: transitionCounts,
    transition_entropy: round(transitionEntropy(transitionCounts)),
    dominant_transition: dominantTransition(transitionCounts),
    trace_preview: frames.slice(0, 12),
    boundary_flags: {
      live_serial_capture_performed: false,
      hardware_action_performed: false,
      esp32_flash_performed: false,
      fpga_programming_performed: false,
    },
  };
}

export function classifyBoundaryEvent(input: {
  mode: BoundaryMode;
  boundaryHit: boolean;
  centerHit: boolean;
  domainFailure: boolean;
  saturationEvent: boolean;
  rawWouldFail: boolean;
  pressure: number;
}): BoundaryEventClass {
  if (input.mode === "auto rescue" && (input.rawWouldFail || input.saturationEvent || input.boundaryHit)) {
    return "auto_rescue";
  }
  if (input.mode === "log-domain candidate" && input.rawWouldFail && !input.domainFailure) {
    return "log_domain_rescue";
  }
  if (input.mode === "guarded" && input.rawWouldFail && !input.domainFailure) {
    return "guard_rescue";
  }
  if (input.domainFailure && input.pressure > 4.15) {
    return "overflow_wall";
  }
  if (input.domainFailure) {
    return "domain_wall";
  }
  if (input.saturationEvent) {
    return "saturation_shelf";
  }
  if (input.centerHit && input.pressure >= 3.05 && input.pressure <= 3.3) {
    return "phantom_attractor";
  }
  if (input.boundaryHit) {
    return "corner_concentration";
  }
  return "interior_sample";
}

export function buildTransitionCounts(frames: BoundaryTraceFrame[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 1; i < frames.length; i += 1) {
    const transition = `${frames[i - 1].event_class}->${frames[i].event_class}`;
    counts[transition] = (counts[transition] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function transitionEntropy(transitionCounts: Record<string, number>): number {
  const total = Object.values(transitionCounts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  return Object.values(transitionCounts).reduce((entropy, count) => {
    const p = count / total;
    return entropy - p * Math.log2(p);
  }, 0);
}

export function dominantTransition(transitionCounts: Record<string, number>): string | null {
  const entries = Object.entries(transitionCounts);
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

function seededRandom(seed: number) {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}
