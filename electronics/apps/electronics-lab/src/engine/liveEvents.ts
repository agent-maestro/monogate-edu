export type LabLiveEventType =
  | "bench_loaded"
  | "course_hint"
  | "wire_state_changed"
  | "rail_powered"
  | "component_placed"
  | "fault_detected"
  | "terminal_command"
  | "trace_frame"
  | "dashboard_status";

export type LabLiveEvent = {
  id: string;
  type: LabLiveEventType;
  timestamp_ms: number;
  source: "mgelectronics_lab_sim";
  simulated: true;
  hardware_observed: false;
  live_serial_capture_performed: false;
  certified_safety_claim: false;
  production_controller_claim: false;
  payload: Record<string, unknown>;
};

type Listener = (event: LabLiveEvent) => void;

const listeners = new Set<Listener>();
const history: LabLiveEvent[] = [];
const relayUrl = "http://127.0.0.1:5190/events";

function relayEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem("mgelectronics:relay-events") !== "1") return false;
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
}

function nowId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createLabEvent(type: LabLiveEventType, payload: Record<string, unknown> = {}): LabLiveEvent {
  return {
    id: nowId(),
    type,
    timestamp_ms: Date.now(),
    source: "mgelectronics_lab_sim",
    simulated: true,
    hardware_observed: false,
    live_serial_capture_performed: false,
    certified_safety_claim: false,
    production_controller_claim: false,
    payload
  };
}

export function publishLabEvent(type: LabLiveEventType, payload: Record<string, unknown> = {}): LabLiveEvent {
  const event = createLabEvent(type, payload);
  history.push(event);
  if (history.length > 160) history.shift();
  listeners.forEach((listener) => listener(event));

  if (relayEnabled()) {
    void fetch(relayUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event)
    }).catch(() => {
      // The relay is optional; the in-browser dashboard remains authoritative for the sim.
    });
  }

  return event;
}

export function subscribeLabEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLabEventHistory(): LabLiveEvent[] {
  return [...history];
}
