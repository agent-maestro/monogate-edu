import { Html, OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { type TouchEvent as ReactTouchEvent, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Esp32BreakoutBoard, type Esp32CoursePinLabels } from "./Esp32BreakoutBoard";
import type { ComponentPinMap, CourseHighlightTarget, SupplyPinMap } from "./CoursePanel";
import {
  Buzzer,
  Ldr,
  Led,
  Potentiometer,
  Resistor,
  RESISTOR_10K_BANDS,
  TactileButton,
  TrainerBoardParts
} from "./TrainerBoardParts";
import {
  partLabelFor,
  partLeadLabelFor,
  trainerPartLeads,
  type TrainerPartId,
  type TrainerPartLabelConfig
} from "./trainerPartCatalog";
import type { FaultId, WireId } from "../engine/labEngine";

type Vec3 = [number, number, number];
type RailKind = "positive" | "negative";
type LeadKind = "positive" | "negative";
type EnergyKind = "positive" | "negative" | "vin" | "short";
type RailId =
  | "top-negative-a"
  | "top-negative-b"
  | "top-negative-c"
  | "top-negative-d"
  | "top-positive-a"
  | "top-positive-b"
  | "top-positive-c"
  | "top-positive-d"
  | "bottom-positive-a"
  | "bottom-positive-b"
  | "bottom-positive-c"
  | "bottom-positive-d"
  | "bottom-negative-a"
  | "bottom-negative-b"
  | "bottom-negative-c"
  | "bottom-negative-d";

type HolePoint = {
  id: string;
  label: string;
  netId: string;
  position: Vec3;
  railId?: RailId;
};

type LeadConnection = HolePoint | null;
type ComponentLeadConnection = Record<string, HolePoint>;
type JumperConnection = {
  id: string;
  from: HolePoint;
  to: HolePoint;
  color: string;
};
type SerializedLabSceneState = {
  leadConnections?: Partial<Record<LeadKind, string | null>>;
  componentConnections?: Record<string, string>;
  jumperConnections?: { from: string; to: string; color: string }[];
};
type CircuitWireState = Partial<Record<WireId, boolean>>;
type CircuitFaultState = Partial<Record<FaultId, boolean>>;
type CircuitSnapshot = {
  connected: (netA: string | undefined, netB: string) => boolean;
  connectedToRailKind: (netId: string, kind: RailKind) => boolean;
  energyForNet: (netId: string | undefined) => EnergyKind | null;
  hasShort: boolean;
  nets: {
    potGnd?: string;
    potWiper?: string;
    potVcc?: string;
    resistorLeft?: string;
    resistorRight?: string;
    ledAnode?: string;
    ledCathode?: string;
    buzzerResistorGpio?: string;
    buzzerResistorBuzzer?: string;
    buzzerPositive?: string;
    buzzerNegative?: string;
    buttonGpio?: string;
    buttonGround?: string;
    ldrVcc?: string;
    ldrSense?: string;
    dividerSense?: string;
    dividerGround?: string;
  };
};

type PotOrientation = "normal" | "inverted" | "floating";
type WiringMode = "component" | "supply";
type CameraView = "overview" | "breadboard" | "esp32";
type TraceRole = "power" | "ground" | "adc" | "output" | "unknown";
export type CourseTraceMode = "idle" | "ground" | "power" | "rails" | "pot" | "led" | "full";

declare global {
  interface Window {
    __mgeLab?: {
      connectLead: (kind: LeadKind, holeId: string) => void;
      connectComponentLead: (leadId: string, holeId: string) => void;
      connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
      selectPart: (partId: TrainerPartId | null) => void;
      getState: () => {
        wiringMode: WiringMode;
        selectedLead: LeadKind;
        selectedComponentLead: string | null;
        leadConnections: Record<LeadKind, string | null>;
        componentConnections: Record<string, string>;
        jumperConnections: { from: string; to: string; color: string }[];
        circuit: {
          shorted: boolean;
          faults: CircuitFaultState;
          rails: Record<string, EnergyKind | null>;
          esp32: Record<string, EnergyKind | null>;
        };
      };
      exportState: () => SerializedLabSceneState;
      importState: (state: SerializedLabSceneState) => void;
      removeLastJumper: () => void;
      undo: () => boolean;
      reset: () => void;
    };
  }
}

const COLUMN_COUNT = 25;
const COLUMN_PITCH = 0.112;
const ROW_PITCH = 0.118;
const FIRST_COLUMN_X = -((COLUMN_COUNT - 1) * COLUMN_PITCH) / 2;
const BOARD_WIDTH = (COLUMN_COUNT - 1) * COLUMN_PITCH + 0.48;
const HOLE_HIT_RADIUS = 0.076;
const ACTIVE_PART_STAGE: Vec3 = [-2.25, 0.12, -1.34];
const ESP32_SCENE_ORIGIN: Vec3 = [2.58, 0, 0.05];
const ESP32_PIN_PITCH = 0.103;
const ESP32_FIRST_PIN_Z = -0.72;
const ESP32_HEADER_X = {
  left: -0.36,
  right: 0.36
} as const;
const ESP32_WING_CENTER_X = {
  left: -0.59,
  right: 0.59
} as const;
const ESP32_WING_COLUMNS = {
  left: [
    { label: "3", offset: -0.045 },
    { label: "4", offset: 0.045 }
  ],
  right: [
    { label: "1", offset: -0.045 },
    { label: "2", offset: 0.045 }
  ]
} as const;
const ESP32_PIN_ROWS = {
  threeV3: 14,
  gpio34: 3,
  gpio25: 7,
  gpio26: 8,
  gpio27: 9,
  ground: 13,
  vin5v: 14
} as const;
type Esp32HeaderPinKind = "gpio" | "ground" | "power" | "system";
type Esp32HeaderPinDef = {
  id: string;
  label: string;
  netId: string;
  side: "left" | "right";
  row: number;
  kind: Esp32HeaderPinKind;
};
const ESP32_HEADER_PIN_DEFS: Esp32HeaderPinDef[] = [
  { id: "en", label: "EN", netId: "esp32:en", side: "left", row: 0, kind: "system" },
  { id: "vp", label: "VP", netId: "esp32:vp", side: "left", row: 1, kind: "system" },
  { id: "vn", label: "VN", netId: "esp32:vn", side: "left", row: 2, kind: "system" },
  { id: "gpio34", label: "GPIO34", netId: "esp32:gpio34", side: "left", row: 3, kind: "gpio" },
  { id: "gpio35", label: "GPIO35", netId: "esp32:gpio35", side: "left", row: 4, kind: "gpio" },
  { id: "gpio32", label: "GPIO32", netId: "esp32:gpio32", side: "left", row: 5, kind: "gpio" },
  { id: "gpio33", label: "GPIO33", netId: "esp32:gpio33", side: "left", row: 6, kind: "gpio" },
  { id: "gpio25", label: "GPIO25", netId: "esp32:gpio25", side: "left", row: 7, kind: "gpio" },
  { id: "gpio26", label: "GPIO26", netId: "esp32:gpio26", side: "left", row: 8, kind: "gpio" },
  { id: "gpio27", label: "GPIO27", netId: "esp32:gpio27", side: "left", row: 9, kind: "gpio" },
  { id: "gpio14", label: "GPIO14", netId: "esp32:gpio14", side: "left", row: 10, kind: "gpio" },
  { id: "gpio12", label: "GPIO12", netId: "esp32:gpio12", side: "left", row: 11, kind: "gpio" },
  { id: "gpio13", label: "GPIO13", netId: "esp32:gpio13", side: "left", row: 12, kind: "gpio" },
  { id: "gnd", label: "ESP32 GND", netId: "esp32:gnd", side: "left", row: 13, kind: "ground" },
  { id: "vin5v", label: "VIN/5V", netId: "esp32:vin5v", side: "left", row: 14, kind: "power" },
  { id: "gpio23", label: "GPIO23", netId: "esp32:gpio23", side: "right", row: 0, kind: "gpio" },
  { id: "gpio22", label: "GPIO22", netId: "esp32:gpio22", side: "right", row: 1, kind: "gpio" },
  { id: "tx0", label: "TX0", netId: "esp32:tx0", side: "right", row: 2, kind: "system" },
  { id: "rx0", label: "RX0", netId: "esp32:rx0", side: "right", row: 3, kind: "system" },
  { id: "gpio21", label: "GPIO21", netId: "esp32:gpio21", side: "right", row: 4, kind: "gpio" },
  { id: "gpio19", label: "GPIO19", netId: "esp32:gpio19", side: "right", row: 5, kind: "gpio" },
  { id: "gpio18", label: "GPIO18", netId: "esp32:gpio18", side: "right", row: 6, kind: "gpio" },
  { id: "gpio5", label: "GPIO5", netId: "esp32:gpio5", side: "right", row: 7, kind: "gpio" },
  { id: "tx2", label: "TX2", netId: "esp32:tx2", side: "right", row: 8, kind: "system" },
  { id: "rx2", label: "RX2", netId: "esp32:rx2", side: "right", row: 9, kind: "system" },
  { id: "gpio4", label: "GPIO4", netId: "esp32:gpio4", side: "right", row: 10, kind: "gpio" },
  { id: "gpio2", label: "GPIO2", netId: "esp32:gpio2", side: "right", row: 11, kind: "gpio" },
  { id: "gpio15", label: "GPIO15", netId: "esp32:gpio15", side: "right", row: 12, kind: "gpio" },
  { id: "gnd-right", label: "ESP32 GND", netId: "esp32:gnd", side: "right", row: 13, kind: "ground" },
  { id: "3v3", label: "ESP32 3V3", netId: "esp32:3v3", side: "right", row: 14, kind: "power" }
];
const ESP32_POWER_BLOCK: Record<LeadKind, Vec3> = {
  positive: [
    ESP32_SCENE_ORIGIN[0] + ESP32_HEADER_X.right,
    0.156,
    ESP32_SCENE_ORIGIN[2] + ESP32_FIRST_PIN_Z + ESP32_PIN_ROWS.threeV3 * ESP32_PIN_PITCH
  ],
  negative: [
    ESP32_SCENE_ORIGIN[0] + ESP32_HEADER_X.left,
    0.156,
    ESP32_SCENE_ORIGIN[2] + ESP32_FIRST_PIN_Z + ESP32_PIN_ROWS.ground * ESP32_PIN_PITCH
  ]
};
const ESP32_SUPPLY_SOURCES: Record<LeadKind, Vec3> = {
  positive: [ESP32_POWER_BLOCK.positive[0], 0.205, ESP32_POWER_BLOCK.positive[2]],
  negative: [ESP32_POWER_BLOCK.negative[0], 0.205, ESP32_POWER_BLOCK.negative[2]]
};
const RESISTOR_330R_BANDS = [
  { x: -0.09, color: "#f47b20" },
  { x: -0.035, color: "#f47b20" },
  { x: 0.025, color: "#4a2713" },
  { x: 0.09, color: "#d1a83b" }
] as const;
const RESISTOR_1K_BANDS = [
  { x: -0.115, color: "#6b3f20" },
  { x: -0.06, color: "#1b1110" },
  { x: -0.005, color: "#1b1110" },
  { x: 0.05, color: "#6b3f20" },
  { x: 0.115, color: "#6b3f20" }
] as const;
type ResistorBand = { x: number; color: string };
const OVERVIEW_CAMERA_POSITION: Vec3 = [0, 4.55, 4.55];
const OVERVIEW_CAMERA_TARGET: Vec3 = [0, 0.08, 0];
const BREADBOARD_CAMERA_POSITION: Vec3 = [0, 5.25, 0.04];
const BREADBOARD_CAMERA_TARGET: Vec3 = [0, 0.08, 0.04];
const ESP32_CAMERA_POSITION: Vec3 = [2.62, 4.05, 0.05];
const ESP32_CAMERA_TARGET: Vec3 = [2.62, 0.1, 0.05];
const MIN_CAMERA_ZOOM = 0.44;
const MAX_CAMERA_ZOOM = 1.9;
const CAMERA_ZOOM_STEP = 0.18;
const MOBILE_STAGE_ROTATION: Vec3 = [0, Math.PI / 2, 0];
const DESKTOP_STAGE_ROTATION: Vec3 = [0, 0, 0];
const MOBILE_STAGE_OFFSET: Vec3 = [0, 0, 0];
const DESKTOP_STAGE_OFFSET: Vec3 = [-0.28, 0, 0.24];

function clampCameraZoom(nextZoom: number): number {
  return Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, Number(nextZoom.toFixed(2))));
}

function compactViewportActive(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
}

const terminalRows = [
  { label: "J", z: -0.58, side: "top" },
  { label: "I", z: -0.58 + ROW_PITCH, side: "top" },
  { label: "H", z: -0.58 + ROW_PITCH * 2, side: "top" },
  { label: "G", z: -0.58 + ROW_PITCH * 3, side: "top" },
  { label: "F", z: -0.58 + ROW_PITCH * 4, side: "top" },
  { label: "A", z: 0.58 - ROW_PITCH * 4, side: "bottom" },
  { label: "B", z: 0.58 - ROW_PITCH * 3, side: "bottom" },
  { label: "C", z: 0.58 - ROW_PITCH * 2, side: "bottom" },
  { label: "D", z: 0.58 - ROW_PITCH, side: "bottom" },
  { label: "E", z: 0.58, side: "bottom" }
] as const;

const railGroups = [
  { suffix: "a", start: 1, end: 5 },
  { suffix: "b", start: 7, end: 11 },
  { suffix: "c", start: 15, end: 19 },
  { suffix: "d", start: 21, end: 25 }
] as const;

const railRows: { prefix: string; kind: RailKind; z: number; label: string }[] = [
  { prefix: "top-negative", kind: "negative", z: -1.08, label: "-" },
  { prefix: "top-positive", kind: "positive", z: -0.91, label: "+" },
  { prefix: "bottom-positive", kind: "positive", z: 0.91, label: "+" },
  { prefix: "bottom-negative", kind: "negative", z: 1.08, label: "-" }
];

const railPrefixLabels: Record<string, string> = {
  // Learner-facing rail target map: TP/TN are top power/negative; BP/BN are bottom power/negative.
  "top-positive": "TP",
  "top-negative": "TN",
  "bottom-positive": "BP",
  "bottom-negative": "BN"
};

function railHoleFriendlyLabel(railId: string, column: number): string {
  const prefix = railId.slice(0, -2);
  const railPrefix = railPrefixLabels[prefix] ?? railId.toUpperCase();
  return `${railPrefix}${column}`;
}

const trainerPartIds = Object.keys(trainerPartLeads) as TrainerPartId[];

function colX(column: number): number {
  return FIRST_COLUMN_X + (column - 1) * COLUMN_PITCH;
}

function esp32PinZ(rowIndex: number): number {
  return ESP32_SCENE_ORIGIN[2] + ESP32_FIRST_PIN_Z + rowIndex * ESP32_PIN_PITCH;
}

function esp32HeaderPoint(side: "left" | "right", rowIndex: number): Vec3 {
  return [ESP32_SCENE_ORIGIN[0] + ESP32_HEADER_X[side], 0.156, esp32PinZ(rowIndex)];
}

function esp32WingPoint(side: "left" | "right", columnOffset: number, rowIndex: number): Vec3 {
  return [ESP32_SCENE_ORIGIN[0] + ESP32_WING_CENTER_X[side] + columnOffset, 0.116, esp32PinZ(rowIndex)];
}

function displayEnergyKind(energy: EnergyKind | null): LeadKind | "short" | null {
  if (energy === "positive" || energy === "vin") return "positive";
  if (energy === "negative") return "negative";
  if (energy === "short") return "short";
  return null;
}

function componentLeadKey(partId: TrainerPartId, leadId: string): string {
  return `${partId}:${leadId}`;
}

function componentLeadLabel(partId: TrainerPartId, leadId: string, partLabels?: TrainerPartLabelConfig): string {
  return partLeadLabelFor(partId, leadId, partLabels);
}

function defaultLeadForPart(partId: TrainerPartId): string {
  if (partId === "led") return "anode";
  if (partId === "potentiometer") return "gnd";
  if (partId === "buzzer") return "positive";
  if (partId === "button") return "gpio";
  if (partId === "buzzerResistor") return "gpio";
  if (partId === "ldr") return "vcc";
  if (partId === "dividerResistor") return "sense";
  return "left";
}

function breadboardPlacementText(partId: TrainerPartId, leadId: string, partLabels?: TrainerPartLabelConfig): string {
  if (partId === "led" && leadId === "anode") {
    return "LED long leg: click the same row as the free end of the 330 ohm resistor";
  }
  if (partId === "led" && leadId === "cathode") {
    return "LED short leg: click a different empty row for ground";
  }
  if (partId === "resistor" && leadId === "left") {
    return "First 330 ohm resistor lead: click an empty row";
  }
  if (partId === "resistor" && leadId === "right") {
    return "Second 330 ohm resistor lead: click a different empty row";
  }
  if (partId === "potentiometer" && leadId === "wiper") {
    return "Pot middle leg: click a nearby empty row for the GPIO34 signal";
  }
  if (partId === "ldr" && leadId === "vcc") {
    return "LDR 3V3 side: click an empty row that will connect to the 3V3 rail";
  }
  if (partId === "ldr" && leadId === "sense") {
    return "LDR sense side: click a different row for the GPIO35/light ADC node";
  }
  if (partId === "dividerResistor" && leadId === "sense") {
    return "10K divider sense side: click the same row as the LDR sense side";
  }
  if (partId === "dividerResistor" && leadId === "ground") {
    return "10K divider ground side: click a different row that will connect to GND";
  }
  return `${componentLeadLabel(partId, leadId, partLabels)}: click a breadboard hole`;
}

function nextUnplacedLeadForPart(
  partId: TrainerPartId,
  currentLeadId: string,
  connections: ComponentLeadConnection
): string | null {
  return (
    trainerPartLeads[partId].find(
      (lead) => lead.id !== currentLeadId && !connections[componentLeadKey(partId, lead.id)]
    )?.id ?? null
  );
}

function applyCameraPose(camera: THREE.Camera, position: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]) {
  camera.position.set(...position);
  camera.up.set(...up);
  camera.lookAt(...target);
  const maybeProjectionCamera = camera as THREE.Camera & { updateProjectionMatrix?: () => void };
  if (maybeProjectionCamera.updateProjectionMatrix) {
    maybeProjectionCamera.updateProjectionMatrix();
  }
}

function buildBreadboardHoles(): HolePoint[] {
  const holes: HolePoint[] = [];

  for (let column = 1; column <= COLUMN_COUNT; column += 1) {
    terminalRows.forEach((row) => {
      holes.push({
        id: `${row.label}${column}`,
        label: `${row.label}${column}`,
        netId: `terminal:${row.side}:${column}`,
        position: [colX(column), 0.206, row.z]
      });
    });
  }

  railRows.forEach((railRow) => {
    railGroups.forEach((group) => {
      const id = `${railRow.prefix}-${group.suffix}` as RailId;
      for (let column = group.start; column <= group.end; column += 1) {
        holes.push({
          id: `${id}:${column}`,
          label: railHoleFriendlyLabel(id, column),
          netId: `rail:${id}`,
          railId: id,
          position: [colX(column), 0.206, railRow.z]
        });
      }
    });
  });

  ESP32_HEADER_PIN_DEFS.forEach((pin) => {
    holes.push({
      id: `esp32:${pin.id}`,
      label: pin.label,
      netId: pin.netId,
      position: esp32HeaderPoint(pin.side, pin.row)
    });
    ESP32_WING_COLUMNS[pin.side].forEach((column) => {
      holes.push({
        id: `esp32-wing:${pin.side}:${column.label}:${pin.id}`,
        label: `C${column.label} ${pin.label}`,
        netId: pin.netId,
        position: esp32WingPoint(pin.side, column.offset, pin.row)
      });
    });
  });

  return holes;
}

const BREADBOARD_HOLES = buildBreadboardHoles();

function findHoleById(holeId: string): HolePoint | null {
  return BREADBOARD_HOLES.find((hole) => hole.id === holeId) ?? null;
}

function displayHoleLabel(hole: HolePoint | null): string {
  if (!hole) return "no hole";
  if (hole.id.startsWith("esp32-wing:")) return `ESP32 ${hole.label}`;
  if (hole.id.startsWith("esp32:")) return `ESP32 ${hole.label}`;
  if (hole.railId) {
    const idParts = hole.id.split(":");
    const column = Number(idParts[idParts.length - 1]);
    if (Number.isFinite(column)) return railHoleFriendlyLabel(hole.railId, column);
  }
  return hole.label;
}

function Box({
  position,
  scale,
  color,
  emissive = "#000000",
  emissiveIntensity = 0
}: {
  position: Vec3;
  scale: Vec3;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.56}
      />
    </mesh>
  );
}

function BoardHole({
  hole,
  color = "#11191c",
  poweredBy,
  signalRole = null,
  selected = false,
  hovered = false,
  armed = false,
  occupiedLabel = null,
  fried = false,
  onConnect,
  onHover
}: {
  hole: HolePoint;
  color?: string;
  poweredBy: LeadKind | "short" | null;
  signalRole?: Extract<TraceRole, "adc" | "output"> | null;
  selected?: boolean;
  hovered?: boolean;
  armed?: boolean;
  occupiedLabel?: string | null;
  fried?: boolean;
  onConnect: (hole: HolePoint) => void;
  onHover: (hole: HolePoint | null) => void;
}) {
  const poweredColor = poweredBy === "short" ? "#fff2a6" : poweredBy === "positive" ? "#ff1f3d" : "#20d875";
  const signalColor = signalRole ? "#ffd45f" : null;
  const fill = fried ? "#1a1212" : poweredBy ? poweredColor : signalColor ?? color;
  const occupiedHovered = Boolean(occupiedLabel && hovered && armed);

  return (
    <group position={hole.position}>
      <mesh
        position={[0, 0.012, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onConnect(hole);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          document.body.style.cursor = armed ? "crosshair" : "default";
          onHover(hole);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = armed ? "crosshair" : "default";
          onHover(hole);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "default";
          onHover(null);
        }}
      >
        <sphereGeometry args={[HOLE_HIT_RADIUS, 14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {poweredBy ? (
        <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.042, 24]} />
          <meshBasicMaterial color={poweredColor} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
      {signalRole ? (
        <mesh position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.046, 24]} />
          <meshBasicMaterial color="#ffd45f" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ) : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[poweredBy || signalRole ? 0.028 : 0.022, 18]} />
        <meshBasicMaterial color={fill} />
      </mesh>
      <mesh position={[0, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.023, selected || hovered ? 0.044 : armed ? 0.036 : 0.029, 18]} />
        <meshBasicMaterial
          color={occupiedHovered ? "#ff5468" : selected ? "#fff2a6" : hovered ? "#fff8cd" : armed ? "#8ee0b2" : "#d9e0df"}
          transparent
          opacity={occupiedHovered ? 0.98 : selected ? 0.96 : hovered ? 0.92 : armed ? 0.42 : poweredBy ? 0 : 0.3}
        />
      </mesh>
      {armed && !selected && !occupiedLabel && !hovered ? (
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.045, 0.064, 30]} />
          <meshBasicMaterial color="#8ee0b2" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
      {selected ? (
        <>
          <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.043, 0.058, 26]} />
            <meshBasicMaterial color="#fff2a6" transparent opacity={0.64} depthWrite={false} />
          </mesh>
          <pointLight position={[0, 0.08, 0]} color="#fff2a6" intensity={0.18} distance={0.42} />
        </>
      ) : null}
      {hovered ? (
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.043, 0.052, 24]} />
          <meshBasicMaterial color={occupiedHovered ? "#ff5468" : "#fff8cd"} transparent opacity={0.72} depthWrite={false} />
        </mesh>
      ) : null}
      {occupiedHovered ? (
        <>
          <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <boxGeometry args={[0.092, 0.011, 0.011]} />
            <meshBasicMaterial color="#ff5468" transparent opacity={0.94} depthWrite={false} />
          </mesh>
          <Html position={[0, 0.12, 0]} center style={{ pointerEvents: "none" }}>
            <div className="occupied-hole-label">occupied</div>
          </Html>
        </>
      ) : null}
    </group>
  );
}

function nearestBoardHole(point: THREE.Vector3): HolePoint | null {
  let nearest: HolePoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  BREADBOARD_HOLES.forEach((hole) => {
    const dx = hole.position[0] - point.x;
    const dz = hole.position[2] - point.z;
    const distance = Math.hypot(dx, dz);
    if (distance < nearestDistance) {
      nearest = hole;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= 0.082 ? nearest : null;
}

function boardLocalPointerPoint(event: ThreeEvent<PointerEvent>): THREE.Vector3 {
  const point = event.point.clone();
  event.object.parent?.worldToLocal(point);
  return point;
}

function BoardPickSurface({
  armed,
  fried,
  onConnect,
  onHoverHole
}: {
  armed: boolean;
  fried: boolean;
  onConnect: (hole: HolePoint) => void;
  onHoverHole: (hole: HolePoint | null) => void;
}) {
  if (!armed || fried) return null;

  return (
    <mesh
      position={[0, 0.192, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(event) => {
        const nearest = nearestBoardHole(boardLocalPointerPoint(event));
        document.body.style.cursor = nearest ? "crosshair" : "default";
        onHoverHole(nearest);
      }}
      onPointerDown={(event) => {
        const nearest = nearestBoardHole(boardLocalPointerPoint(event));
        if (!nearest) return;
        event.stopPropagation();
        onConnect(nearest);
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
        onHoverHole(null);
      }}
    >
      <planeGeometry args={[BOARD_WIDTH + 0.12, 2.42]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function signalRoleForNet(circuitSnapshot: CircuitSnapshot, netId: string, traceMode: CourseTraceMode): Extract<TraceRole, "adc" | "output"> | null {
  if (traceMode === "idle") return null;
  if (
    circuitSnapshot.connected(netId, "esp32:gpio34") ||
    circuitSnapshot.connected(netId, "esp32:gpio35") ||
    circuitSnapshot.connected(netId, "esp32:gpio27") ||
    (circuitSnapshot.nets.potWiper && circuitSnapshot.connected(netId, circuitSnapshot.nets.potWiper)) ||
    (circuitSnapshot.nets.ldrSense && circuitSnapshot.connected(netId, circuitSnapshot.nets.ldrSense))
  ) {
    return traceRoleEnabled("adc", traceMode) ? "adc" : null;
  }

  if (
    circuitSnapshot.connected(netId, "esp32:gpio25") ||
    circuitSnapshot.connected(netId, "esp32:gpio26") ||
    (circuitSnapshot.nets.resistorLeft && circuitSnapshot.connected(netId, circuitSnapshot.nets.resistorLeft)) ||
    (circuitSnapshot.nets.resistorRight && circuitSnapshot.connected(netId, circuitSnapshot.nets.resistorRight)) ||
    (circuitSnapshot.nets.buzzerResistorGpio && circuitSnapshot.connected(netId, circuitSnapshot.nets.buzzerResistorGpio))
  ) {
    return traceRoleEnabled("output", traceMode) ? "output" : null;
  }

  return null;
}

function BoardText({
  label,
  position,
  color = "#6a767b",
  size = 0.045
}: {
  label: string;
  position: Vec3;
  color?: string;
  size?: number;
}) {
  return (
    <Text position={position} rotation={[-Math.PI / 2, 0, 0]} fontSize={size} color={color}>
      {label}
    </Text>
  );
}

function TerminalStrip({
  circuitSnapshot,
  selectedHoleIds,
  traceMode,
  fried,
  armed,
  onConnect,
  onHoverHole,
  hoveredHoleId
}: {
  circuitSnapshot: CircuitSnapshot;
  selectedHoleIds: Set<string>;
  traceMode: CourseTraceMode;
  fried: boolean;
  armed: boolean;
  onConnect: (hole: HolePoint) => void;
  onHoverHole: (hole: HolePoint | null) => void;
  hoveredHoleId: string | null;
}) {
  const holes: JSX.Element[] = [];

  for (let column = 1; column <= COLUMN_COUNT; column += 1) {
    terminalRows.forEach((row) => {
      const hole: HolePoint = {
        id: `${row.label}${column}`,
        label: `${row.label}${column}`,
        netId: `terminal:${row.side}:${column}`,
        position: [colX(column), 0.206, row.z]
      };
      const poweredBy = displayEnergyKind(circuitSnapshot.energyForNet(hole.netId));
      const signalRole = signalRoleForNet(circuitSnapshot, hole.netId, traceMode);
      const selected = selectedHoleIds.has(hole.id);
      const hovered = hoveredHoleId === hole.id;
      holes.push(
        <BoardHole
          key={`terminal-${hole.id}`}
          hole={hole}
          color="#11191c"
          poweredBy={poweredBy}
          signalRole={signalRole}
          selected={selected}
          hovered={hovered}
          armed={armed}
          occupiedLabel={selected ? "occupied" : null}
          fried={fried}
          onConnect={onConnect}
          onHover={onHoverHole}
        />
      );
    });
  }

  return (
    <group>
      <Box position={[0, 0.055, 0]} scale={[BOARD_WIDTH, 0.12, 1.55]} color={fried ? "#c9c9c5" : "#e7ebe9"} />
      <Box position={[0, 0.151, 0]} scale={[BOARD_WIDTH - 0.2, 0.028, 0.13]} color="#cfd7d7" />
      <Box position={[0, 0.168, 0]} scale={[BOARD_WIDTH - 0.28, 0.018, 0.075]} color="#b9c3c5" />
      {holes}

      {terminalRows.map((row) => (
        <BoardText
          key={`label-left-${row.label}`}
          label={row.label}
          position={[-BOARD_WIDTH / 2 + 0.07, 0.216, row.z]}
        />
      ))}

      {[1, 5, 10, 15, 20, 25].map((column) => (
        <BoardText
          key={`col-${column}`}
          label={String(column)}
          position={[colX(column), 0.216, -0.69]}
          color="#728086"
          size={0.046}
        />
      ))}
    </group>
  );
}

function RailSegment({
  id,
  kind,
  start,
  end,
  z,
  circuitSnapshot,
  selectedHoleIds,
  fried,
  armed,
  onConnect,
  onHoverHole,
  hoveredHoleId
}: {
  id: RailId;
  kind: RailKind;
  start: number;
  end: number;
  z: number;
  circuitSnapshot: CircuitSnapshot;
  selectedHoleIds: Set<string>;
  fried: boolean;
  armed: boolean;
  onConnect: (hole: HolePoint) => void;
  onHoverHole: (hole: HolePoint | null) => void;
  hoveredHoleId: string | null;
}) {
  const baseColor = kind === "positive" ? "#cf3045" : "#176dcc";
  const netId = `rail:${id}`;
  const poweredBy = displayEnergyKind(circuitSnapshot.energyForNet(netId));
  const x1 = colX(start);
  const x2 = colX(end);
  const centerX = (x1 + x2) / 2;
  const stripLength = x2 - x1 + 0.16;
  const holes: JSX.Element[] = [];

  for (let column = start; column <= end; column += 1) {
    const hole: HolePoint = {
      id: `${id}:${column}`,
      label: `${id} ${column}`,
      netId,
      railId: id,
      position: [colX(column), 0.206, z]
    };
    const selected = selectedHoleIds.has(hole.id);
    const hovered = hoveredHoleId === hole.id;
    holes.push(
      <BoardHole
        key={`${id}-${column}`}
        hole={hole}
        color={kind === "positive" ? "#671b25" : "#153f76"}
        poweredBy={poweredBy}
        selected={selected}
        hovered={hovered}
        armed={armed}
        occupiedLabel={selected ? "occupied" : null}
        fried={fried}
        onConnect={onConnect}
        onHover={onHoverHole}
      />
    );
  }

  return (
    <group>
      <mesh position={[centerX, 0.13, z]} castShadow receiveShadow>
        <boxGeometry args={[stripLength, 0.036, 0.064]} />
        <meshStandardMaterial
          color={baseColor}
          emissive="#000000"
          emissiveIntensity={0}
          roughness={0.5}
        />
      </mesh>
      {holes}
    </group>
  );
}

function PowerRails({
  circuitSnapshot,
  selectedHoleIds,
  fried,
  armed,
  onConnect,
  onHoverHole,
  hoveredHoleId
}: {
  circuitSnapshot: CircuitSnapshot;
  selectedHoleIds: Set<string>;
  fried: boolean;
  armed: boolean;
  onConnect: (hole: HolePoint) => void;
  onHoverHole: (hole: HolePoint | null) => void;
  hoveredHoleId: string | null;
}) {
  return (
    <group>
      <Box position={[0, 0.052, -1.0]} scale={[BOARD_WIDTH, 0.105, 0.36]} color={fried ? "#d3d6d2" : "#e6ebe9"} />
      <Box position={[0, 0.052, 1.0]} scale={[BOARD_WIDTH, 0.105, 0.36]} color={fried ? "#d3d6d2" : "#e6ebe9"} />
      {railRows.map((railRow) => (
        <group key={railRow.prefix}>
          {railGroups.map((group) => {
            const id = `${railRow.prefix}-${group.suffix}` as RailId;
            return (
              <RailSegment
                key={id}
                id={id}
                kind={railRow.kind}
                start={group.start}
                end={group.end}
                z={railRow.z}
                circuitSnapshot={circuitSnapshot}
                selectedHoleIds={selectedHoleIds}
                fried={fried}
                armed={armed}
                onConnect={onConnect}
                onHoverHole={onHoverHole}
                hoveredHoleId={hoveredHoleId}
              />
            );
          })}
          {[-1, 1].map((side) => (
            <BoardText
              key={`${railRow.prefix}-${side < 0 ? "left" : "right"}-polarity`}
              label={railRow.label}
              position={[side * (BOARD_WIDTH / 2 - 0.08), 0.216, railRow.z]}
              color={railRow.kind === "positive" ? "#ff2f45" : "#226ddd"}
              size={0.116}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

const esp32TargetIds = BREADBOARD_HOLES.filter((hole) => hole.id.startsWith("esp32:") || hole.id.startsWith("esp32-wing:")).map(
  (hole) => hole.id
);

function esp32TargetColor(holeId: string): string {
  const hole = findHoleById(holeId);
  if (hole?.netId === "esp32:3v3" || hole?.netId === "esp32:vin5v") return "#ff4f65";
  if (hole?.netId === "esp32:gnd") return "#60d394";
  if (hole?.netId.includes(":tx") || hole?.netId.includes(":rx") || hole?.netId === "esp32:en" || hole?.netId === "esp32:vp" || hole?.netId === "esp32:vn") {
    return "#ffe38a";
  }
  return "#eef4f2";
}

function Esp32PadHitTarget({
  hole,
  color,
  signalRole = null,
  selected,
  hovered,
  armed,
  occupiedLabel = null,
  fried,
  onConnect,
  onHover
}: {
  hole: HolePoint;
  color: string;
  signalRole?: Extract<TraceRole, "adc" | "output"> | null;
  selected: boolean;
  hovered: boolean;
  armed: boolean;
  occupiedLabel?: string | null;
  fried: boolean;
  onConnect: (hole: HolePoint) => void;
  onHover: (hole: HolePoint | null) => void;
}) {
  const isWingHole = hole.id.startsWith("esp32-wing:");
  const hitRadius = isWingHole ? 0.044 : 0.056;
  const hoverInnerRadius = isWingHole ? 0.03 : 0.042;
  const hoverOuterRadius = isWingHole ? 0.041 : 0.052;
  const occupiedHovered = Boolean(occupiedLabel && hovered && armed);

  return (
    <group position={hole.position}>
      <mesh
        position={[0, isWingHole ? 0.02 : 0.028, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onConnect(hole);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          document.body.style.cursor = occupiedHovered ? "not-allowed" : armed ? "crosshair" : "default";
          onHover(hole);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = occupiedHovered ? "not-allowed" : armed ? "crosshair" : "default";
          onHover(hole);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "default";
          onHover(null);
        }}
      >
        <sphereGeometry args={[hitRadius, 14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected || hovered ? (
        <mesh position={[0, isWingHole ? 0.012 : 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hoverInnerRadius, occupiedHovered ? hoverOuterRadius + 0.012 : hoverOuterRadius, 24]} />
          <meshBasicMaterial color={occupiedHovered ? "#ff5468" : selected ? "#fff2a6" : color} transparent opacity={selected ? 0.98 : 0.88} depthWrite={false} />
        </mesh>
      ) : null}
      {signalRole ? (
        <mesh position={[0, isWingHole ? 0.006 : 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[isWingHole ? 0.035 : 0.046, 24]} />
          <meshBasicMaterial color="#ffd45f" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
      {occupiedHovered ? (
        <mesh position={[0, isWingHole ? 0.018 : 0.026, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <boxGeometry args={[isWingHole ? 0.076 : 0.098, 0.011, 0.011]} />
          <meshBasicMaterial color="#ff5468" transparent opacity={0.94} depthWrite={false} />
        </mesh>
      ) : null}
      {hovered ? (
        <Html position={[0, 0.12, 0]} center style={{ pointerEvents: "none" }}>
          <div className="esp32-pin-hover-label">{hole.label}</div>
        </Html>
      ) : null}
      {!selected && !hovered && armed && !fried ? (
        <mesh position={[0, isWingHole ? 0.01 : 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[isWingHole ? 0.029 : 0.039, isWingHole ? 0.042 : 0.056, 22]} />
          <meshBasicMaterial color="#8ee0b2" transparent opacity={0.36} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function Esp32PinTargets({
  selectedHoleIds,
  circuitSnapshot,
  traceMode,
  fried,
  armed,
  onConnect,
  onHoverHole,
  hoveredHoleId
}: {
  selectedHoleIds: Set<string>;
  circuitSnapshot: CircuitSnapshot;
  traceMode: CourseTraceMode;
  fried: boolean;
  armed: boolean;
  onConnect: (hole: HolePoint) => void;
  onHoverHole: (hole: HolePoint | null) => void;
  hoveredHoleId: string | null;
}) {
  return (
    <group>
      {esp32TargetIds.map((id) => {
        const hole = findHoleById(id);
        if (!hole) return null;
        const selected = selectedHoleIds.has(hole.id);
        return (
          <Esp32PadHitTarget
            key={hole.id}
            hole={hole}
            color={esp32TargetColor(hole.id)}
            signalRole={signalRoleForNet(circuitSnapshot, hole.netId, traceMode)}
            selected={selected}
            hovered={hoveredHoleId === hole.id}
            armed={armed}
            occupiedLabel={selected ? "occupied" : null}
            fried={fried}
            onConnect={onConnect}
            onHover={onHoverHole}
          />
        );
      })}
    </group>
  );
}

function SupplyLead({
  kind,
  selected,
  connection,
  traceMode,
  onSelect
}: {
  kind: LeadKind;
  selected: boolean;
  connection: LeadConnection;
  traceMode: CourseTraceMode;
  onSelect: (kind: LeadKind) => void;
}) {
  const color = kind === "positive" ? "#ff5468" : "#60d394";
  const source = ESP32_SUPPLY_SOURCES[kind];
  const traceRole: TraceRole = kind === "positive" ? "power" : "ground";
  const traceActive = traceMode !== "idle" && traceRoleEnabled(traceRole, traceMode);

  return (
    <group>
      <mesh
        position={source}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(kind);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "crosshair";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected ? (
        <>
          <mesh position={[source[0], source[1] + 0.014, source[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.044, 0.056, 24]} />
            <meshBasicMaterial color="#fff5b6" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <mesh position={[source[0], source[1] + 0.012, source[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.034, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      {connection ? (
        <LeadWire
          from={source}
          to={connection.position}
          color={color}
          animated={traceActive}
          pulseColor={traceColorForRole(traceRole)}
          pulseSpeed={traceSpeedForRole(traceRole, 0.55, traceMode)}
        />
      ) : null}
    </group>
  );
}

function LeadWire({
  from,
  to,
  color,
  animated = false,
  pulseColor = "#fff8c6",
  pulseSpeed = 1.7,
  pulseLevel = 1
}: {
  from: Vec3;
  to: Vec3;
  color: string;
  animated?: boolean;
  pulseColor?: string;
  pulseSpeed?: number;
  pulseLevel?: number;
}) {
  const pulse = useRef<THREE.Group>(null);
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(to[0], to[1] + 0.066, to[2]);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.y += 0.24;
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const geometry = new THREE.TubeGeometry(curve, 30, 0.016, 9, false);

  useFrame(({ clock }) => {
    if (!pulse.current || !animated) return;
    const point = curve.getPoint((clock.elapsedTime * Math.max(0.02, pulseSpeed)) % 1);
    pulse.current.position.copy(point);
  });

  const level = Math.max(0, Math.min(1, pulseLevel));

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={color}
          emissive={animated ? pulseColor : "#000000"}
          emissiveIntensity={animated ? 0.08 + level * 0.2 : 0}
          roughness={0.32}
        />
      </mesh>
      {animated ? (
        <group ref={pulse}>
          <mesh>
            <sphereGeometry args={[0.022 + level * 0.022, 16, 12]} />
            <meshBasicMaterial color={pulseColor} transparent opacity={0.28 + level * 0.44} />
          </mesh>
          <pointLight color={pulseColor} intensity={0.18 + level * 0.64} distance={0.28 + level * 0.28} />
        </group>
      ) : null}
      <JumperPlugEnd point={from} color={color} lift={0} />
      <JumperPlugEnd point={to} color={color} lift={0} />
    </group>
  );
}

function JumperPlugEnd({ point, color, lift = 0 }: { point: Vec3; color: string; lift?: number }) {
  const y = point[1] + lift;
  return (
    <group>
      <mesh position={[point[0], y + 0.026, point[2]]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.074, 16]} />
        <meshStandardMaterial color="#c8d1d4" metalness={0.5} roughness={0.28} />
      </mesh>
      <mesh position={[point[0], y + 0.081, point[2]]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.076, 16]} />
        <meshStandardMaterial color={color} roughness={0.34} />
      </mesh>
      <mesh position={[point[0], y + 0.005, point[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.024, 0.039, 20]} />
        <meshBasicMaterial color="#0b1113" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function traceColorForRole(role: TraceRole): string {
  if (role === "power") return "#ff5468";
  if (role === "ground") return "#60d394";
  if (role === "adc") return "#fff2a6";
  if (role === "output") return "#ffd45f";
  return "#dbe8e4";
}

function defaultJumperColorForRole(role: TraceRole): string | null {
  if (role === "power") return "#ff5468";
  if (role === "ground") return "#60d394";
  if (role === "adc" || role === "output") return "#ffd45f";
  return null;
}

function traceSpeedForRole(role: TraceRole, potValue: number, mode: CourseTraceMode): number {
  const modeBoost = mode === "full" ? 1 : 0.82;
  if (role === "power" || role === "ground") return 0.55 * modeBoost;
  if (role === "adc") return (0.04 + potValue * 0.95) * modeBoost;
  if (role === "output") return (0.03 + potValue * 1.1) * modeBoost;
  return 0.36 * modeBoost;
}

function traceRoleEnabled(role: TraceRole, mode: CourseTraceMode): boolean {
  if (mode === "idle") return false;
  if (mode === "full") return role !== "unknown";
  if (mode === "rails") return role === "power" || role === "ground";
  if (mode === "ground") return role === "ground";
  if (mode === "power") return role === "power";
  if (mode === "pot") return role === "power" || role === "ground" || role === "adc";
  if (mode === "led") return role === "output" || role === "ground";
  return false;
}

function CylinderBetween({
  from,
  to,
  radius,
  color,
  metalness = 0.45,
  roughness = 0.26
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  if (length < 0.001) return null;
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  return (
    <mesh position={midpoint.toArray() as Vec3} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function PartAttentionPulse({
  active,
  position = [0, 0.018, 0],
  radius = 0.22,
  color = "#fff2a6"
}: {
  active?: boolean;
  position?: Vec3;
  radius?: number;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const wave = (Math.sin(clock.elapsedTime * 13) + 1) / 2;
    group.current.scale.setScalar(0.94 + wave * 0.22);
    group.current.visible = wave > 0.18;
    group.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (material) material.opacity = 0.22 + wave * 0.42;
    });
  });

  if (!active) return null;

  return (
    <group ref={group} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.68, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.18, 0]} color={color} intensity={0.85} distance={0.7} />
    </group>
  );
}

function ResistorPlacement({
  left,
  right,
  partLabels,
  partId = "resistor",
  bands = RESISTOR_330R_BANDS,
  highlighted = false
}: {
  left: HolePoint;
  right: HolePoint;
  partLabels?: TrainerPartLabelConfig;
  partId?: "resistor" | "buzzerResistor" | "dividerResistor";
  bands?: readonly ResistorBand[];
  highlighted?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const start = new THREE.Vector3(left.position[0], left.position[1] + 0.045, left.position[2]);
  const end = new THREE.Vector3(right.position[0], right.position[1] + 0.045, right.position[2]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const angleY = -Math.atan2(delta.z, delta.x);
  const direction = delta.clone().normalize();
  const bodyLength = 0.32;
  const bodyCenter = midpoint.clone().setY(midpoint.y + 0.105);
  const leftBodyEnd = bodyCenter.clone().add(direction.clone().multiplyScalar(-bodyLength / 2));
  const rightBodyEnd = bodyCenter.clone().add(direction.clone().multiplyScalar(bodyLength / 2));
  const leftHoleTop = start.clone().setY(start.y + 0.015);
  const rightHoleTop = end.clone().setY(end.y + 0.015);

  useFrame(({ clock }) => {
    if (!group.current) return;
    startTime.current ??= clock.elapsedTime;
    const settle = Math.min(1, (clock.elapsedTime - startTime.current) * 2.2);
    const eased = 1 - Math.pow(1 - settle, 3);
    group.current.position.y = 0.28 * (1 - eased);
    group.current.rotation.z = Math.sin((1 - eased) * Math.PI) * 0.06;
  });

  return (
    <group ref={group}>
      <PartAttentionPulse active={highlighted} position={[bodyCenter.x, bodyCenter.y + 0.02, bodyCenter.z]} radius={0.26} />
      <group position={bodyCenter.toArray() as Vec3} rotation={[0, angleY, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, bodyLength, 28]} />
        <meshStandardMaterial color="#d5b16c" roughness={0.36} />
      </mesh>
      {bands.map((band) => (
        <mesh key={`${band.x}-${band.color}`} position={[band.x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.044, 0.044, 0.018, 20]} />
          <meshStandardMaterial color={band.color} roughness={0.38} />
        </mesh>
      ))}
      <BoardText label={partLabelFor(partId, partLabels)} position={[0, 0.064, 0.078]} color="#4a2713" size={0.034} />
      </group>
      <CylinderBetween from={leftHoleTop} to={leftBodyEnd} radius={0.008} color="#c8c3ad" />
      <CylinderBetween from={rightHoleTop} to={rightBodyEnd} radius={0.008} color="#c8c3ad" />
      <mesh position={[left.position[0], left.position[1] + 0.035, left.position[2]]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.072, 14]} />
        <meshStandardMaterial color="#c8c3ad" metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh position={[right.position[0], right.position[1] + 0.035, right.position[2]]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.072, 14]} />
        <meshStandardMaterial color="#c8c3ad" metalness={0.45} roughness={0.26} />
      </mesh>
      <pointLight position={[bodyCenter.x, bodyCenter.y + 0.18, bodyCenter.z]} color="#fff2a6" intensity={0.4} distance={0.9} />
    </group>
  );
}

function LdrPlacement({
  vcc,
  sense,
  partLabels,
  highlighted = false
}: {
  vcc: HolePoint;
  sense: HolePoint;
  partLabels?: TrainerPartLabelConfig;
  highlighted?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const vccPoint = new THREE.Vector3(vcc.position[0], vcc.position[1] + 0.07, vcc.position[2]);
  const sensePoint = new THREE.Vector3(sense.position[0], sense.position[1] + 0.07, sense.position[2]);
  const midpoint = vccPoint.clone().add(sensePoint).multiplyScalar(0.5);
  const vccLocal = vccPoint.clone().sub(midpoint);
  const senseLocal = sensePoint.clone().sub(midpoint);
  const rawSpanDirection = senseLocal.clone().sub(vccLocal);
  const spanDirection =
    rawSpanDirection.lengthSq() > 0.0001 ? rawSpanDirection.normalize() : new THREE.Vector3(1, 0, 0);
  const faceY = 0.18;
  const leadBaseY = 0.07;
  const vccAnchor = spanDirection.clone().multiplyScalar(-0.055).setY(leadBaseY);
  const senseAnchor = spanDirection.clone().multiplyScalar(0.055).setY(leadBaseY);
  const vccSocket = vccLocal.clone().setY(-0.055);
  const senseSocket = senseLocal.clone().setY(-0.055);
  const traceSegments: { position: Vec3; scale: Vec3 }[] = [
    { position: [-0.058, faceY + 0.02, 0], scale: [0.014, 0.006, 0.15] as Vec3 },
    { position: [-0.024, faceY + 0.02, 0], scale: [0.014, 0.006, 0.15] as Vec3 },
    { position: [0.01, faceY + 0.02, 0], scale: [0.014, 0.006, 0.15] as Vec3 },
    { position: [0.044, faceY + 0.02, 0], scale: [0.014, 0.006, 0.15] as Vec3 },
    { position: [-0.041, faceY + 0.02, -0.075], scale: [0.048, 0.006, 0.014] as Vec3 },
    { position: [-0.007, faceY + 0.02, 0.075], scale: [0.048, 0.006, 0.014] as Vec3 },
    { position: [0.027, faceY + 0.02, -0.075], scale: [0.048, 0.006, 0.014] as Vec3 },
    { position: [0.061, faceY + 0.02, 0.075], scale: [0.048, 0.006, 0.014] as Vec3 }
  ];

  useFrame(({ clock }) => {
    if (!group.current) return;
    startTime.current ??= clock.elapsedTime;
    const settle = Math.min(1, (clock.elapsedTime - startTime.current) * 2.3);
    group.current.position.y = midpoint.y + 0.24 * Math.pow(1 - settle, 3);
  });

  return (
    <group ref={group} position={[midpoint.x, midpoint.y + 0.24, midpoint.z]}>
      <PartAttentionPulse active={highlighted} position={[0, faceY + 0.012, 0]} radius={0.24} color="#8ee7ff" />
      <CylinderBetween from={vccAnchor} to={vccSocket} radius={0.007} color="#d7d3bd" />
      <CylinderBetween from={senseAnchor} to={senseSocket} radius={0.007} color="#d7d3bd" />
      <CylinderBetween
        from={vccSocket.clone().setY(-0.015)}
        to={vccSocket.clone().setY(-0.09)}
        radius={0.011}
        color="#d7d3bd"
        metalness={0.5}
        roughness={0.24}
      />
      <CylinderBetween
        from={senseSocket.clone().setY(-0.015)}
        to={senseSocket.clone().setY(-0.09)}
        radius={0.011}
        color="#d7d3bd"
        metalness={0.5}
        roughness={0.24}
      />
      <mesh position={[0, faceY, 0]} castShadow>
        <cylinderGeometry args={[0.105, 0.108, 0.034, 48]} />
        <meshStandardMaterial color="#9b321e" roughness={0.34} metalness={0.02} />
      </mesh>
      <mesh position={[0, faceY + 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.094, 48]} />
        <meshStandardMaterial color="#d8c893" roughness={0.42} />
      </mesh>
      {traceSegments.map((segment, index) => (
        <mesh key={index} position={segment.position}>
          <boxGeometry args={segment.scale} />
          <meshStandardMaterial color="#b63a24" emissive="#6f1e16" emissiveIntensity={0.1} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.054, faceY + 0.021, -0.012]} castShadow>
        <sphereGeometry args={[0.014, 14, 10]} />
        <meshStandardMaterial color="#d7d3bd" metalness={0.45} roughness={0.22} />
      </mesh>
      <mesh position={[0.054, faceY + 0.021, 0.012]} castShadow>
        <sphereGeometry args={[0.014, 14, 10]} />
        <meshStandardMaterial color="#d7d3bd" metalness={0.45} roughness={0.22} />
      </mesh>
      <BoardText label={partLabelFor("ldr", partLabels)} position={[0, faceY + 0.065, 0.085]} color="#fff1bd" size={0.032} />
    </group>
  );
}

function LedLightSpill({ visibleGlow }: { visibleGlow: number }) {
  if (visibleGlow <= 0) return null;

  const warmCore = Math.pow(visibleGlow, 0.8);

  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.115 + visibleGlow * 0.05, 32, 22]} />
        <meshBasicMaterial
          color="#ff5a63"
          transparent
          opacity={0.1 + warmCore * 0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.018, 0.225, -0.026]}>
        <sphereGeometry args={[0.018 + visibleGlow * 0.012, 18, 12]} />
        <meshBasicMaterial
          color="#fff2a6"
          transparent
          opacity={0.2 + warmCore * 0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0.24, 0]} color="#ff364c" intensity={0.24 + visibleGlow * 1.45} distance={0.35 + visibleGlow * 0.46} />
    </group>
  );
}

function LedPlacement({
  anode,
  cathode,
  ledOutput,
  noResistorFault,
  reversed,
  blown,
  partLabels,
  highlighted = false
}: {
  anode: HolePoint;
  cathode: HolePoint;
  ledOutput: number;
  noResistorFault: boolean;
  reversed: boolean;
  blown: boolean;
  partLabels?: TrainerPartLabelConfig;
  highlighted?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const glow = noResistorFault || reversed || blown ? 0 : Math.max(0, Math.min(1, ledOutput));
  const visibleGlow = glow <= 0.025 ? 0 : Math.pow(glow, 1.25);
  const anodePoint = new THREE.Vector3(anode.position[0], anode.position[1] + 0.07, anode.position[2]);
  const cathodePoint = new THREE.Vector3(cathode.position[0], cathode.position[1] + 0.07, cathode.position[2]);
  const midpoint = anodePoint.clone().add(cathodePoint).multiplyScalar(0.5);
  const bodyY = 0.18;
  const baseY = 0.085;
  const anodeLocal = anodePoint.clone().sub(midpoint);
  const cathodeLocal = cathodePoint.clone().sub(midpoint);
  const rawSpanDirection = cathodeLocal.clone().sub(anodeLocal);
  const spanDirection =
    rawSpanDirection.lengthSq() > 0.0001 ? rawSpanDirection.normalize() : new THREE.Vector3(1, 0, 0);
  const anodeAnchor = spanDirection.clone().multiplyScalar(-0.04).setY(baseY);
  const cathodeAnchor = spanDirection.clone().multiplyScalar(0.04).setY(baseY);
  const anodeSocket = anodeLocal.clone().setY(-0.055);
  const cathodeSocket = cathodeLocal.clone().setY(-0.055);

  useFrame(({ clock }) => {
    if (!group.current) return;
    startTime.current ??= clock.elapsedTime;
    const settle = Math.min(1, (clock.elapsedTime - startTime.current) * 2.2);
    const eased = 1 - Math.pow(1 - settle, 3);
    group.current.position.y = midpoint.y + 0.28 * (1 - eased);
  });

  return (
    <group ref={group} position={[midpoint.x, midpoint.y + 0.28, midpoint.z]}>
      <PartAttentionPulse active={highlighted} position={[0, bodyY + 0.012, 0]} radius={0.22} color="#ff8795" />
      <mesh position={[0, bodyY, 0]} castShadow>
        <sphereGeometry args={[0.09, 28, 18]} />
        <meshStandardMaterial
          color={blown ? "#281516" : noResistorFault ? "#2b1517" : reversed ? "#4a1f25" : visibleGlow > 0 ? "#ff5868" : "#8f2732"}
          emissive={blown ? "#000000" : noResistorFault ? "#ff9b54" : reversed ? "#361319" : glow > 0.02 ? "#ff3046" : "#000000"}
          emissiveIntensity={blown ? 0 : noResistorFault ? 0.42 : reversed ? 0.05 : visibleGlow > 0 ? 0.08 + visibleGlow * 2.6 : 0}
          transparent
          opacity={blown ? 0.78 : noResistorFault ? 0.82 : 0.62 + visibleGlow * 0.34}
          roughness={0.08}
        />
      </mesh>
      {blown ? (
        <>
          <BoardText label="BLOWN" position={[0, 0.34, 0.075]} color="#ffb9c0" size={0.034} />
          <mesh position={[0.028, bodyY + 0.072, -0.008]} rotation={[0.6, 0, 0.9]}>
            <boxGeometry args={[0.012, 0.012, 0.17]} />
            <meshBasicMaterial color="#12090a" transparent opacity={0.82} />
          </mesh>
          <mesh position={[-0.026, bodyY + 0.072, 0.01]} rotation={[0.4, 0, -0.82]}>
            <boxGeometry args={[0.01, 0.01, 0.13]} />
            <meshBasicMaterial color="#12090a" transparent opacity={0.72} />
          </mesh>
        </>
      ) : noResistorFault ? (
        <>
          <mesh position={[0, bodyY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.13, 0.185, 30]} />
            <meshBasicMaterial color="#ff9b54" transparent opacity={0.34} depthWrite={false} />
          </mesh>
          <BoardText label="NO RESISTOR" position={[0, 0.34, 0.075]} color="#ffb36d" size={0.034} />
          <pointLight position={[0, 0.3, 0]} color="#ff9b54" intensity={1.3} distance={0.9} />
        </>
      ) : visibleGlow > 0 ? (
        <LedLightSpill visibleGlow={visibleGlow} />
      ) : reversed ? (
        <BoardText label="REVERSED" position={[0, 0.34, 0.075]} color="#ffb9c0" size={0.034} />
      ) : null}
      <CylinderBetween from={anodeAnchor} to={anodeSocket} radius={0.007} color="#c8c3ad" />
      <CylinderBetween from={cathodeAnchor} to={cathodeSocket} radius={0.007} color="#c8c3ad" />
      <CylinderBetween
        from={anodeSocket.clone().setY(-0.015)}
        to={anodeSocket.clone().setY(-0.09)}
        radius={0.011}
        color="#d7d3bd"
        metalness={0.5}
        roughness={0.24}
      />
      <CylinderBetween
        from={cathodeSocket.clone().setY(-0.015)}
        to={cathodeSocket.clone().setY(-0.09)}
        radius={0.011}
        color="#d7d3bd"
        metalness={0.5}
        roughness={0.24}
      />
      <BoardText label={partLabelFor("led", partLabels)} position={[0, 0.255, 0.06]} color="#ffe4e8" size={0.034} />
      <pointLight position={[0, 0.24, 0]} color="#ff4258" intensity={visibleGlow > 0 ? 0.14 + visibleGlow * 2.7 : 0} distance={0.42 + visibleGlow * 0.68} />
    </group>
  );
}

function componentLeadColor(partId: TrainerPartId, leadId: string): string {
  if (partId === "led") return leadId === "anode" ? "#ff5468" : "#60d394";
  if (partId === "buzzer") return leadId === "positive" ? "#ffd45f" : "#60d394";
  if (partId === "button") return leadId === "gpio" ? "#fff2a6" : "#60d394";
  if (partId === "ldr") return leadId === "vcc" ? "#ff8795" : "#fff2a6";
  if (partId === "dividerResistor") return leadId === "sense" ? "#fff2a6" : "#60d394";
  if (partId === "potentiometer") {
    if (leadId === "vcc") return "#ff8795";
    if (leadId === "gnd") return "#60d394";
    return "#fff2a6";
  }
  if (partId === "buzzerResistor") return "#ffd45f";
  return "#fff2a6";
}

function ComponentLeadPlacementMarker({
  partId,
  leadId,
  hole,
  partLabels
}: {
  partId: TrainerPartId;
  leadId: string;
  hole: HolePoint;
  partLabels?: TrainerPartLabelConfig;
}) {
  const color = componentLeadColor(partId, leadId);
  const leadLabel = componentLeadLabel(partId, leadId, partLabels);

  return (
    <group position={[hole.position[0], hole.position[1] + 0.095, hole.position[2]]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.034, 0.034, 0.052, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} roughness={0.34} />
      </mesh>
      <mesh position={[0, -0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, 0.052, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.74} />
      </mesh>
      <BoardText label={leadLabel} position={[0, 0.055, 0.064]} color={color} size={0.03} />
    </group>
  );
}

function PlacedPotControl({
  connections,
  potValue,
  partLabels,
  highlighted = false
}: {
  connections: ComponentLeadConnection;
  potValue: number;
  partLabels?: TrainerPartLabelConfig;
  highlighted?: boolean;
}) {
  const gnd = connections[componentLeadKey("potentiometer", "gnd")];
  const wiper = connections[componentLeadKey("potentiometer", "wiper")];
  const vcc = connections[componentLeadKey("potentiometer", "vcc")];
  if (!gnd || !wiper || !vcc) return null;

  const averageLeadX = (gnd.position[0] + wiper.position[0] + vcc.position[0]) / 3;
  const averageLeadZ = (gnd.position[2] + wiper.position[2] + vcc.position[2]) / 3;
  const aboveBreadboard = averageLeadZ < 0;
  const bodyPosition: Vec3 = [Math.max(-1.08, Math.min(0.56, averageLeadX)), 0.19, aboveBreadboard ? -1.54 : 1.54];
  const bodyRotationY = aboveBreadboard ? 0 : Math.PI;
  const leadAnchorZ = bodyPosition[2] + (aboveBreadboard ? 0.18 : -0.18);
  const labelZ = bodyPosition[2] + (aboveBreadboard ? -0.33 : 0.33);
  const leadScale = 0.72;

  return (
    <group>
      <PartAttentionPulse active={highlighted} position={[bodyPosition[0], bodyPosition[1] + 0.04, bodyPosition[2]]} radius={0.26} />
      <group position={bodyPosition} rotation={[0, bodyRotationY, 0]} scale={[leadScale, leadScale, leadScale]}>
        <Potentiometer position={[0, 0, 0]} value={potValue} label="" />
      </group>
      <BoardText
        label={partLabelFor("potentiometer", partLabels)}
        position={[bodyPosition[0], bodyPosition[1] + 0.15, labelZ]}
        color="#edf7f4"
        size={0.043}
      />
      {[
        { hole: gnd, offset: -0.11, color: "#60d394" },
        { hole: wiper, offset: 0, color: "#fff2a6" },
        { hole: vcc, offset: 0.11, color: "#ff8795" }
      ].map((lead) => (
        <CylinderBetween
          key={lead.hole.id}
          from={new THREE.Vector3(
            bodyPosition[0] + (aboveBreadboard ? lead.offset : -lead.offset) * leadScale,
            bodyPosition[1] + 0.08,
            leadAnchorZ
          )}
          to={new THREE.Vector3(lead.hole.position[0], lead.hole.position[1] + 0.035, lead.hole.position[2])}
          radius={0.008}
          color={lead.color}
        />
      ))}
    </group>
  );
}

function PlacedComponents({
  connections,
  potValue,
  ledOutput,
  buzzerOutput,
  ledNoResistorFault,
  ledReversedFault,
  fried,
  partLabels,
  highlightedPartId = null
}: {
  connections: ComponentLeadConnection;
  potValue: number;
  ledOutput: number;
  buzzerOutput: number;
  ledNoResistorFault: boolean;
  ledReversedFault: boolean;
  fried: boolean;
  partLabels?: TrainerPartLabelConfig;
  highlightedPartId?: TrainerPartId | null;
}) {
  const resistorLeft = connections[componentLeadKey("resistor", "left")];
  const resistorRight = connections[componentLeadKey("resistor", "right")];
  const buzzerResistorGpio = connections[componentLeadKey("buzzerResistor", "gpio")];
  const buzzerResistorBuzzer = connections[componentLeadKey("buzzerResistor", "buzzer")];
  const ledAnode = connections[componentLeadKey("led", "anode")];
  const ledCathode = connections[componentLeadKey("led", "cathode")];
  const buzzerPositive = connections[componentLeadKey("buzzer", "positive")];
  const buzzerNegative = connections[componentLeadKey("buzzer", "negative")];
  const buttonGpio = connections[componentLeadKey("button", "gpio")];
  const buttonGround = connections[componentLeadKey("button", "ground")];
  const ldrVcc = connections[componentLeadKey("ldr", "vcc")];
  const ldrSense = connections[componentLeadKey("ldr", "sense")];
  const dividerSense = connections[componentLeadKey("dividerResistor", "sense")];
  const dividerGround = connections[componentLeadKey("dividerResistor", "ground")];
  const connectedLedKeys = new Set(
    [componentLeadKey("led", "anode"), componentLeadKey("led", "cathode")].filter((key) => Boolean(connections[key]))
  );
  const connectedResistorKeys = new Set(
    [componentLeadKey("resistor", "left"), componentLeadKey("resistor", "right")].filter((key) => Boolean(connections[key]))
  );
  const connectedBuzzerResistorKeys = new Set(
    [componentLeadKey("buzzerResistor", "gpio"), componentLeadKey("buzzerResistor", "buzzer")].filter((key) => Boolean(connections[key]))
  );
  const connectedPotKeys = new Set(
    ["gnd", "wiper", "vcc"].map((leadId) => componentLeadKey("potentiometer", leadId)).filter((key) => Boolean(connections[key]))
  );
  const connectedBuzzerKeys = new Set(
    [componentLeadKey("buzzer", "positive"), componentLeadKey("buzzer", "negative")].filter((key) => Boolean(connections[key]))
  );
  const connectedButtonKeys = new Set(
    [componentLeadKey("button", "gpio"), componentLeadKey("button", "ground")].filter((key) => Boolean(connections[key]))
  );
  const connectedLdrKeys = new Set(
    [componentLeadKey("ldr", "vcc"), componentLeadKey("ldr", "sense")].filter((key) => Boolean(connections[key]))
  );
  const connectedDividerKeys = new Set(
    [componentLeadKey("dividerResistor", "sense"), componentLeadKey("dividerResistor", "ground")].filter((key) => Boolean(connections[key]))
  );

  return (
    <group>
      {Object.entries(connections).map(([key, hole]) => {
        if (connectedLedKeys.has(key) && ledAnode && ledCathode) return null;
        if (connectedResistorKeys.has(key) && resistorLeft && resistorRight) return null;
        if (connectedBuzzerResistorKeys.has(key) && buzzerResistorGpio && buzzerResistorBuzzer) return null;
        if (connectedPotKeys.has(key) && connectedPotKeys.size === 3) return null;
        if (connectedBuzzerKeys.has(key) && buzzerPositive && buzzerNegative) return null;
        if (connectedButtonKeys.has(key) && buttonGpio && buttonGround) return null;
        if (connectedLdrKeys.has(key) && ldrVcc && ldrSense) return null;
        if (connectedDividerKeys.has(key) && dividerSense && dividerGround) return null;
        const [partId, leadId] = key.split(":") as [TrainerPartId, string];
        return <ComponentLeadPlacementMarker key={key} partId={partId} leadId={leadId} hole={hole} partLabels={partLabels} />;
      })}
      <PlacedPotControl
        connections={connections}
        potValue={potValue}
        partLabels={partLabels}
        highlighted={highlightedPartId === "potentiometer"}
      />
      {ledAnode && ledCathode ? (
        <LedPlacement
          anode={ledAnode}
          cathode={ledCathode}
          ledOutput={fried ? 0 : ledOutput}
          noResistorFault={ledNoResistorFault}
          reversed={ledReversedFault}
          blown={fried}
          partLabels={partLabels}
          highlighted={highlightedPartId === "led"}
        />
      ) : null}
      {resistorLeft && resistorRight ? (
        <ResistorPlacement
          left={resistorLeft}
          right={resistorRight}
          partLabels={partLabels}
          highlighted={highlightedPartId === "resistor"}
        />
      ) : null}
      {buzzerResistorGpio && buzzerResistorBuzzer ? (
        <ResistorPlacement
          left={buzzerResistorGpio}
          right={buzzerResistorBuzzer}
          partId="buzzerResistor"
          partLabels={partLabels}
          bands={RESISTOR_1K_BANDS}
          highlighted={highlightedPartId === "buzzerResistor"}
        />
      ) : null}
      {dividerSense && dividerGround ? (
        <ResistorPlacement
          left={dividerSense}
          right={dividerGround}
          partId="dividerResistor"
          partLabels={partLabels}
          bands={RESISTOR_10K_BANDS}
          highlighted={highlightedPartId === "dividerResistor"}
        />
      ) : null}
      {buzzerPositive && buzzerNegative ? (
        <BuzzerPlacement
          positive={buzzerPositive}
          negative={buzzerNegative}
          outputLevel={buzzerOutput}
          partLabels={partLabels}
          highlighted={highlightedPartId === "buzzer"}
        />
      ) : null}
      {ldrVcc && ldrSense ? (
        <LdrPlacement
          vcc={ldrVcc}
          sense={ldrSense}
          partLabels={partLabels}
          highlighted={highlightedPartId === "ldr"}
        />
      ) : null}
      {buttonGpio && buttonGround ? (
        <ButtonPlacement
          gpio={buttonGpio}
          ground={buttonGround}
          partLabels={partLabels}
          highlighted={highlightedPartId === "button"}
        />
      ) : null}
    </group>
  );
}

function ButtonPlacement({
  gpio,
  ground,
  partLabels,
  highlighted = false
}: {
  gpio: HolePoint;
  ground: HolePoint;
  partLabels?: TrainerPartLabelConfig;
  highlighted?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const gpioPoint = new THREE.Vector3(gpio.position[0], gpio.position[1] + 0.018, gpio.position[2]);
  const groundPoint = new THREE.Vector3(ground.position[0], ground.position[1] + 0.018, ground.position[2]);
  const midpoint = gpioPoint.clone().add(groundPoint).multiplyScalar(0.5);
  const gpioLocal = gpioPoint.clone().sub(midpoint);
  const groundLocal = groundPoint.clone().sub(midpoint);

  useFrame(({ clock }) => {
    if (!group.current) return;
    startTime.current ??= clock.elapsedTime;
    const settle = Math.min(1, (clock.elapsedTime - startTime.current) * 2.4);
    group.current.position.y = midpoint.y + 0.12 * Math.pow(1 - settle, 3);
  });

  return (
    <group ref={group} position={[midpoint.x, midpoint.y + 0.12, midpoint.z]}>
      <PartAttentionPulse active={highlighted} position={[0, 0.088, 0]} radius={0.24} />
      <CylinderBetween from={gpioLocal.clone().setY(-0.03)} to={gpioLocal.clone().setY(0.055)} radius={0.007} color="#fff2a6" />
      <CylinderBetween from={groundLocal.clone().setY(-0.03)} to={groundLocal.clone().setY(0.055)} radius={0.007} color="#9debbf" />
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.07, 0.28]} />
        <meshStandardMaterial color="#2a3032" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.145, 0]} castShadow>
        <boxGeometry args={[0.15, 0.04, 0.15]} />
        <meshStandardMaterial color="#c8d0cc" metalness={0.1} roughness={0.28} />
      </mesh>
      <BoardText label={partLabelFor("button", partLabels)} position={[0, 0.18, 0.105]} color="#edf7f4" size={0.032} />
    </group>
  );
}

function BuzzerPlacement({
  positive,
  negative,
  outputLevel,
  partLabels,
  highlighted = false
}: {
  positive: HolePoint;
  negative: HolePoint;
  outputLevel: number;
  partLabels?: TrainerPartLabelConfig;
  highlighted?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const positivePoint = new THREE.Vector3(positive.position[0], positive.position[1] + 0.018, positive.position[2]);
  const negativePoint = new THREE.Vector3(negative.position[0], negative.position[1] + 0.018, negative.position[2]);
  const midpoint = positivePoint.clone().add(negativePoint).multiplyScalar(0.5);
  const positiveLocal = positivePoint.clone().sub(midpoint);
  const negativeLocal = negativePoint.clone().sub(midpoint);
  const bodyY = 0.106;
  const buzzLevel = Math.max(0, Math.min(1, outputLevel));

  useFrame(({ clock }) => {
    if (!group.current) return;
    startTime.current ??= clock.elapsedTime;
    const settle = Math.min(1, (clock.elapsedTime - startTime.current) * 2.4);
    group.current.position.y = midpoint.y + 0.14 * Math.pow(1 - settle, 3) + Math.sin(clock.elapsedTime * 58) * 0.0025 * buzzLevel;
  });

  return (
    <group ref={group} position={[midpoint.x, midpoint.y + 0.14, midpoint.z]}>
      <PartAttentionPulse active={highlighted} position={[0, bodyY + 0.008, 0]} radius={0.27} color="#ffd45f" />
      <CylinderBetween from={positiveLocal.clone().setY(-0.03)} to={positiveLocal.clone().setY(0.075)} radius={0.007} color="#dcc976" />
      <CylinderBetween from={negativeLocal.clone().setY(-0.03)} to={negativeLocal.clone().setY(0.075)} radius={0.007} color="#c8d4d6" />
      <mesh position={[positiveLocal.x, -0.018, positiveLocal.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.012, 0.026, 24]} />
        <meshBasicMaterial color="#ffd45f" transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh position={[negativeLocal.x, -0.018, negativeLocal.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.012, 0.026, 24]} />
        <meshBasicMaterial color="#9debbf" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, bodyY, 0]} castShadow>
        <cylinderGeometry args={[0.128, 0.128, 0.074, 48]} />
        <meshStandardMaterial color="#101517" roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh position={[0, bodyY + 0.039, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.038, 0.084, 48]} />
        <meshStandardMaterial color="#050708" roughness={0.34} metalness={0.12} />
      </mesh>
      <mesh position={[0, bodyY + 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 32]} />
        <meshBasicMaterial color="#090d0e" />
      </mesh>
      <mesh position={[positiveLocal.x * 0.62, bodyY + 0.043, positiveLocal.z * 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 28]} />
        <meshBasicMaterial color="#f4f1e8" />
      </mesh>
      <BoardText label="+" position={[positiveLocal.x * 0.62, bodyY + 0.047, positiveLocal.z * 0.62]} color="#101517" size={0.052} />
      {buzzLevel > 0.02 ? (
        <mesh position={[0, bodyY + 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18 + buzzLevel * 0.03, 0.25 + buzzLevel * 0.09, 42]} />
          <meshBasicMaterial color="#ffd45f" transparent opacity={0.1 + buzzLevel * 0.22} depthWrite={false} />
        </mesh>
      ) : null}
      <BoardText label={partLabelFor("buzzer", partLabels)} position={[0, bodyY + 0.052, 0.092]} color="#fff2a6" size={0.03} />
    </group>
  );
}

function isPositiveRail(hole: HolePoint): boolean {
  return Boolean(hole.railId?.includes("positive"));
}

function isNegativeRail(hole: HolePoint): boolean {
  return Boolean(hole.railId?.includes("negative"));
}

function holeMatchesConnection(hole: HolePoint, connection: HolePoint | undefined): boolean {
  return Boolean(connection && hole.id === connection.id);
}

function endpointRankForRole(hole: HolePoint, role: TraceRole, connections: ComponentLeadConnection): number {
  const potVcc = connections[componentLeadKey("potentiometer", "vcc")];
  const potWiper = connections[componentLeadKey("potentiometer", "wiper")];
  const potGnd = connections[componentLeadKey("potentiometer", "gnd")];
  const resistorLeft = connections[componentLeadKey("resistor", "left")];
  const resistorRight = connections[componentLeadKey("resistor", "right")];
  const ledAnode = connections[componentLeadKey("led", "anode")];
  const ledCathode = connections[componentLeadKey("led", "cathode")];
  const buzzerResistorGpio = connections[componentLeadKey("buzzerResistor", "gpio")];
  const buzzerResistorBuzzer = connections[componentLeadKey("buzzerResistor", "buzzer")];
  const buzzerPositive = connections[componentLeadKey("buzzer", "positive")];
  const buzzerNegative = connections[componentLeadKey("buzzer", "negative")];
  const buttonGpio = connections[componentLeadKey("button", "gpio")];
  const buttonGround = connections[componentLeadKey("button", "ground")];
  const ldrVcc = connections[componentLeadKey("ldr", "vcc")];
  const ldrSense = connections[componentLeadKey("ldr", "sense")];
  const dividerSense = connections[componentLeadKey("dividerResistor", "sense")];
  const dividerGround = connections[componentLeadKey("dividerResistor", "ground")];

  if (role === "power") {
    if (hole.id === "esp32:3v3") return 5;
    if (isPositiveRail(hole)) return 4;
    if (holeMatchesConnection(hole, potVcc)) return 2;
    if (holeMatchesConnection(hole, ldrVcc)) return 2;
  }

  if (role === "adc") {
    if (holeMatchesConnection(hole, potWiper)) return 4;
    if (hole.id === "esp32:gpio34") return 1;
    if (holeMatchesConnection(hole, ldrSense)) return 4;
    if (holeMatchesConnection(hole, dividerSense)) return 3;
    if (hole.id === "esp32:gpio35") return 1;
  }

  if (role === "output") {
    if (hole.id === "esp32:gpio25") return 5;
    if (hole.id === "esp32:gpio26") return 5;
    if (hole.id === "esp32:gpio27") return 5;
    if (holeMatchesConnection(hole, buzzerResistorGpio)) return 4;
    if (holeMatchesConnection(hole, buttonGpio)) return 4;
    if (holeMatchesConnection(hole, buzzerResistorBuzzer)) return 3;
    if (holeMatchesConnection(hole, resistorLeft)) return 4;
    if (holeMatchesConnection(hole, resistorRight)) return 3;
    if (holeMatchesConnection(hole, ledAnode)) return 2;
    if (holeMatchesConnection(hole, buzzerPositive)) return 2;
  }

  if (role === "ground") {
    if (hole.id === "esp32:gnd") return 6;
    if (isNegativeRail(hole)) return 5;
    if (holeMatchesConnection(hole, potGnd)) return 4;
    if (holeMatchesConnection(hole, dividerGround)) return 4;
    if (holeMatchesConnection(hole, ledCathode)) return 3;
    if (holeMatchesConnection(hole, buzzerNegative)) return 3;
    if (holeMatchesConnection(hole, buttonGround)) return 3;
  }

  return 0;
}

function jumperTouchesConnection(jumper: JumperConnection, connection: HolePoint | undefined): boolean {
  return Boolean(connection && (jumper.from.id === connection.id || jumper.to.id === connection.id));
}

function flowLevelForJumper(
  jumper: JumperConnection,
  role: TraceRole,
  mode: CourseTraceMode,
  connections: ComponentLeadConnection,
  potValue: number,
  outputLevel: number
): number {
  if (!traceRoleEnabled(role, mode)) return 0;
  const live = mode === "full";
  const potWiper = connections[componentLeadKey("potentiometer", "wiper")];
  const ldrSense = connections[componentLeadKey("ldr", "sense")];
  const ledCathode = connections[componentLeadKey("led", "cathode")];
  const buzzerNegative = connections[componentLeadKey("buzzer", "negative")];

  if (role === "adc" && jumperTouchesConnection(jumper, ldrSense)) return live ? Math.max(0, Math.min(1, potValue * 0.82 + 0.08)) : 0.68;
  if (role === "adc") return live ? Math.max(0, Math.min(1, potValue)) : 0.72;
  if (role === "output") return live ? Math.max(0, Math.min(1, outputLevel)) : 0.72;
  if (role === "ground" && jumperTouchesConnection(jumper, ledCathode)) {
    return live ? Math.max(0, Math.min(1, outputLevel)) : 0.62;
  }
  if (role === "ground" && jumperTouchesConnection(jumper, buzzerNegative)) {
    return live ? Math.max(0, Math.min(1, outputLevel)) : 0.54;
  }
  if (role === "ground") return live ? 0.36 : 0.58;
  if (role === "power" && jumperTouchesConnection(jumper, potWiper)) {
    return live ? Math.max(0, Math.min(1, potValue)) : 0.62;
  }
  if (role === "power") return live ? 0.58 : 0.72;
  return 0;
}

function traceRoleForJumper(jumper: JumperConnection, connections: ComponentLeadConnection): TraceRole {
  const points = [jumper.from, jumper.to];
  const hasPoint = (id: string) => points.some((point) => point.id === id);
  const hasPositive = points.some(isPositiveRail) || hasPoint("esp32:3v3");
  const hasGround = points.some(isNegativeRail) || hasPoint("esp32:gnd");
  const potVcc = connections[componentLeadKey("potentiometer", "vcc")];
  const potGnd = connections[componentLeadKey("potentiometer", "gnd")];
  const potWiper = connections[componentLeadKey("potentiometer", "wiper")];
  const resistorLeft = connections[componentLeadKey("resistor", "left")];
  const resistorRight = connections[componentLeadKey("resistor", "right")];
  const ledAnode = connections[componentLeadKey("led", "anode")];
  const ledCathode = connections[componentLeadKey("led", "cathode")];
  const buzzerResistorGpio = connections[componentLeadKey("buzzerResistor", "gpio")];
  const buzzerResistorBuzzer = connections[componentLeadKey("buzzerResistor", "buzzer")];
  const buzzerPositive = connections[componentLeadKey("buzzer", "positive")];
  const buzzerNegative = connections[componentLeadKey("buzzer", "negative")];
  const buttonGpio = connections[componentLeadKey("button", "gpio")];
  const buttonGround = connections[componentLeadKey("button", "ground")];
  const ldrVcc = connections[componentLeadKey("ldr", "vcc")];
  const ldrSense = connections[componentLeadKey("ldr", "sense")];
  const dividerSense = connections[componentLeadKey("dividerResistor", "sense")];
  const dividerGround = connections[componentLeadKey("dividerResistor", "ground")];

  if (hasPositive || points.some((point) => holeMatchesConnection(point, potVcc) || holeMatchesConnection(point, ldrVcc))) return "power";
  if (
    hasGround ||
    points.some(
      (point) =>
        holeMatchesConnection(point, potGnd) ||
        holeMatchesConnection(point, dividerGround) ||
        holeMatchesConnection(point, ledCathode) ||
        holeMatchesConnection(point, buzzerNegative) ||
        holeMatchesConnection(point, buttonGround)
    )
  ) {
    return "ground";
  }
  if (
    hasPoint("esp32:gpio34") ||
    hasPoint("esp32:gpio35") ||
    points.some((point) => holeMatchesConnection(point, potWiper) || holeMatchesConnection(point, ldrSense) || holeMatchesConnection(point, dividerSense))
  ) {
    return "adc";
  }
  if (
    hasPoint("esp32:gpio25") ||
    hasPoint("esp32:gpio26") ||
    hasPoint("esp32:gpio27") ||
    points.some(
      (point) =>
        holeMatchesConnection(point, resistorLeft) ||
        holeMatchesConnection(point, resistorRight) ||
        holeMatchesConnection(point, ledAnode) ||
        holeMatchesConnection(point, buzzerResistorGpio) ||
        holeMatchesConnection(point, buzzerResistorBuzzer) ||
        holeMatchesConnection(point, buzzerPositive) ||
        holeMatchesConnection(point, buttonGpio)
    )
  ) {
    return "output";
  }

  return "unknown";
}

function PlacedJumpers({
  jumpers,
  traceMode,
  componentConnections,
  potValue,
  outputLevel
}: {
  jumpers: JumperConnection[];
  traceMode: CourseTraceMode;
  componentConnections: ComponentLeadConnection;
  potValue: number;
  outputLevel: number;
}) {
  return (
    <group>
      {jumpers.map((jumper) => {
        const role = traceRoleForJumper(jumper, componentConnections);
        const pulseLevel = flowLevelForJumper(jumper, role, traceMode, componentConnections, potValue, outputLevel);
        const fromRank = endpointRankForRole(jumper.from, role, componentConnections);
        const toRank = endpointRankForRole(jumper.to, role, componentConnections);
        const directedFrom = fromRank >= toRank ? jumper.from : jumper.to;
        const directedTo = fromRank >= toRank ? jumper.to : jumper.from;
        return (
          <LeadWire
            key={jumper.id}
            from={[directedFrom.position[0], directedFrom.position[1] + 0.045, directedFrom.position[2]]}
            to={directedTo.position}
            color={jumper.color}
            animated={pulseLevel > 0.02}
            pulseColor={traceColorForRole(role)}
            pulseSpeed={traceSpeedForRole(role, pulseLevel, traceMode)}
            pulseLevel={pulseLevel}
          />
        );
      })}
    </group>
  );
}

function placedPartIdsFromConnections(connections: ComponentLeadConnection): Set<TrainerPartId> {
  const placed = new Set<TrainerPartId>();
  trainerPartIds.forEach((partId) => {
    const allPlaced = trainerPartLeads[partId].every((lead) =>
      Boolean(connections[componentLeadKey(partId, lead.id)])
    );
    if (allPlaced) placed.add(partId);
  });
  return placed;
}

function ActivePartModel({
  partId,
  potValue,
  highlightedLeadId,
  partLabels
}: {
  partId: TrainerPartId;
  potValue: number;
  highlightedLeadId: string | null;
  partLabels?: TrainerPartLabelConfig;
}) {
  if (partId === "potentiometer") {
    return <Potentiometer position={[0, 0, 0]} value={potValue} highlightedLeadId={highlightedLeadId} label={partLabelFor("potentiometer", partLabels)} />;
  }
  if (partId === "led") return <Led position={[0, 0, 0]} highlightedLeadId={highlightedLeadId} label={partLabelFor("led", partLabels)} />;
  if (partId === "button") {
    return <TactileButton position={[0, 0.02, 0]} highlightedLeadId={highlightedLeadId} label={partLabelFor("button", partLabels)} />;
  }
  if (partId === "buzzer") return <Buzzer position={[0, 0.03, 0]} highlightedLeadId={highlightedLeadId} label={partLabelFor("buzzer", partLabels)} />;
  if (partId === "ldr") return <Ldr position={[0, 0.06, 0]} highlightedLeadId={highlightedLeadId} label={partLabelFor("ldr", partLabels)} />;
  if (partId === "dividerResistor") {
    return (
      <Resistor
        position={[0, 0.08, 0.03]}
        highlightedLeadId={highlightedLeadId}
        label={partLabelFor("dividerResistor", partLabels)}
        bands={RESISTOR_10K_BANDS}
      />
    );
  }
  if (partId === "buzzerResistor") {
    return (
      <Resistor
        position={[0, 0.08, 0.03]}
        highlightedLeadId={highlightedLeadId}
        label={partLabelFor("buzzerResistor", partLabels)}
        bands={RESISTOR_1K_BANDS}
      />
    );
  }
  return <Resistor position={[0, 0.08, 0.03]} highlightedLeadId={highlightedLeadId} label={partLabelFor("resistor", partLabels)} />;
}

function PartToolPanel({
  partId,
  selectedLeadId,
  connections,
  isPlaced,
  partLabels,
  onSelectLead,
  onHoverLead,
  onClearLead,
  onDone
}: {
  partId: TrainerPartId;
  selectedLeadId: string | null;
  connections: ComponentLeadConnection;
  isPlaced: boolean;
  partLabels?: TrainerPartLabelConfig;
  onSelectLead: (leadId: string) => void;
  onHoverLead: (leadId: string | null) => void;
  onClearLead: () => void;
  onDone: () => void;
}) {
  const selectedLead = trainerPartLeads[partId].find((lead) => lead.id === selectedLeadId);
  const allLeadsPlaced = trainerPartLeads[partId].every((lead) =>
    Boolean(connections[componentLeadKey(partId, lead.id)])
  );

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="part-tool-layer">
        <section className="part-tool-panel" aria-label="Active component placement">
          <div className="part-tool-header">
            <span>Part tool</span>
            <strong>{partLabelFor(partId, partLabels)}</strong>
          </div>
          <div className="part-tool-status">
            {isPlaced
              ? "Placed on breadboard"
              : selectedLead
                ? breadboardPlacementText(partId, selectedLead.id, partLabels)
                : "Select a lead below, then click a breadboard hole"}
          </div>
          <div className="part-tool-leads">
            {trainerPartLeads[partId].map((lead) => {
              const connection = connections[componentLeadKey(partId, lead.id)];
              const stateClass =
                selectedLeadId === lead.id ? " is-selected" : connection ? " is-connected" : "";

              return (
                <button
                  type="button"
                  className={`part-tool-lead${stateClass}`}
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  onPointerEnter={() => onHoverLead(lead.id)}
                  onPointerLeave={() => onHoverLead(null)}
                >
                  <span>{componentLeadLabel(partId, lead.id, partLabels)}</span>
                  <strong>{connection?.label ?? "not placed"}</strong>
                </button>
              );
            })}
          </div>
          <button className="part-tool-clear" type="button" onClick={onClearLead} disabled={!selectedLeadId}>
            Clear lead
          </button>
          <button className="part-tool-done" type="button" onClick={onDone} disabled={!allLeadsPlaced}>
            Done placing
          </button>
        </section>
      </div>
    </Html>
  );
}

function ActiveWorkbenchPart({
  partId,
  potValue,
  selectedLeadId,
  hoveredLeadId,
  connections,
  placedPartIds,
  partLabels,
  onDone,
  onHoverLead,
  onClearLead,
  onSelectLead
}: {
  partId: TrainerPartId | null;
  potValue: number;
  selectedLeadId: string | null;
  hoveredLeadId: string | null;
  connections: ComponentLeadConnection;
  placedPartIds: Set<TrainerPartId>;
  partLabels?: TrainerPartLabelConfig;
  onDone: () => void;
  onHoverLead: (leadId: string | null) => void;
  onClearLead: () => void;
  onSelectLead: (leadId: string) => void;
}) {
  const isResistorPlaced =
    partId === "resistor" &&
    Boolean(connections[componentLeadKey("resistor", "left")]) &&
    Boolean(connections[componentLeadKey("resistor", "right")]);

  return (
    <>
      <group position={ACTIVE_PART_STAGE}>
        <Box position={[0, 0.012, 0.04]} scale={[1.16, 0.024, 0.78]} color="#20292d" />
        {partId ? (
          isResistorPlaced ? (
            <BoardText
              label={`${partLabelFor("resistor", partLabels)} placed on breadboard`}
              position={[0, 0.14, 0]}
              color="#fff2a6"
              size={0.052}
            />
          ) : (
            <ActivePartModel
              partId={partId}
              potValue={potValue}
              highlightedLeadId={hoveredLeadId ?? selectedLeadId}
              partLabels={partLabels}
            />
          )
        ) : (
          <BoardText
            label="select a component from inventory"
            position={[0, 0.13, 0]}
            color="#8ea2a2"
            size={0.052}
          />
        )}
      </group>
      {partId ? (
        <PartToolPanel
          partId={partId}
          selectedLeadId={selectedLeadId}
          connections={connections}
          isPlaced={placedPartIds.has(partId)}
          partLabels={partLabels}
          onSelectLead={onSelectLead}
          onHoverLead={onHoverLead}
          onClearLead={onClearLead}
          onDone={onDone}
        />
      ) : null}
    </>
  );
}

function FriedSmoke({ impactActive }: { impactActive: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * (impactActive ? 2.2 : 1.1)) * 0.08;
    group.current.position.y = 0.42 + Math.sin(clock.elapsedTime * 1.8) * 0.03;
  });

  return (
    <group ref={group} position={[0, 0.45, -0.18]}>
      {[
        { rotation: [0, 0, 0] as Vec3, scale: [0.026, 0.026, impactActive ? 0.62 : 0.38] as Vec3 },
        { rotation: [0, 0, Math.PI / 3] as Vec3, scale: [0.021, 0.021, impactActive ? 0.48 : 0.3] as Vec3 },
        { rotation: [0, 0, -Math.PI / 3] as Vec3, scale: [0.021, 0.021, impactActive ? 0.48 : 0.3] as Vec3 },
        { rotation: [0, 0, Math.PI / 2] as Vec3, scale: [0.018, 0.018, impactActive ? 0.42 : 0.22] as Vec3 }
      ].map((spark, index) => (
        <mesh key={`spark-${index}`} rotation={spark.rotation}>
          <boxGeometry args={spark.scale} />
          <meshBasicMaterial
            color={index === 0 ? "#fff8cd" : index === 3 ? "#ff5468" : "#ff9b54"}
            transparent
            opacity={impactActive ? 0.94 : 0.52}
            toneMapped={false}
          />
        </mesh>
      ))}
      {impactActive ? (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.34, 42]} />
          <meshBasicMaterial color="#fff2a6" transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ) : null}
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh
          key={index}
          position={[(index - 2) * 0.08, index * 0.055, Math.sin(index) * 0.04]}
        >
          <sphereGeometry args={[0.09 + index * 0.018, 18, 18]} />
          <meshStandardMaterial color="#1a1d1f" transparent opacity={(impactActive ? 0.12 : 0.24) - index * 0.018} />
        </mesh>
      ))}
      <pointLight color="#ff7654" intensity={impactActive ? 4.4 : 1.45} distance={impactActive ? 2.05 : 1.25} />
    </group>
  );
}

function FriedNotice({ onReset }: { onReset: () => void }) {
  return (
    <Html position={[0, 0.92, -0.18]} center>
      <div className="fried-notice" role="alert">
        <strong>Board is fried.</strong>
        <span>3V3 and GND are on the same net, so current would rush straight through the supply instead of through a load.</span>
        <button type="button" aria-label="Refresh board" onClick={onReset}>
          Refresh board
        </button>
      </div>
    </Html>
  );
}

function cameraPoseForView(view: CameraView): { position: Vec3; target: Vec3; up: Vec3 } {
  if (view === "breadboard") {
    return { position: BREADBOARD_CAMERA_POSITION, target: BREADBOARD_CAMERA_TARGET, up: [0, 0, -1] };
  }
  if (view === "esp32") {
    return { position: ESP32_CAMERA_POSITION, target: ESP32_CAMERA_TARGET, up: [0, 0, -1] };
  }
  return { position: OVERVIEW_CAMERA_POSITION, target: OVERVIEW_CAMERA_TARGET, up: [0, 1, 0] };
}

function CameraRig({
  placementLocked,
  view,
  zoomLevel,
  resetKey
}: {
  placementLocked: boolean;
  view: CameraView;
  zoomLevel: number;
  resetKey: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const pose = placementLocked && view !== "esp32"
      ? { position: BREADBOARD_CAMERA_POSITION, target: BREADBOARD_CAMERA_TARGET, up: [0, 0, -1] as Vec3 }
      : cameraPoseForView(view);
    applyCameraPose(camera, pose.position, pose.target, pose.up);
    const zoomCamera = camera as THREE.Camera & { zoom?: number; updateProjectionMatrix?: () => void };
    zoomCamera.zoom = zoomLevel;
    zoomCamera.updateProjectionMatrix?.();
  }, [camera, placementLocked, view, zoomLevel, resetKey]);

  return null;
}

function CameraViewPanel({
  view,
  placementLocked,
  onViewChange,
  onReset,
  schematicAvailable = false,
  schematicOpen = false,
  onSchematicToggle
}: {
  view: CameraView;
  placementLocked: boolean;
  onViewChange: (view: CameraView) => void;
  onReset: () => void;
  schematicAvailable?: boolean;
  schematicOpen?: boolean;
  onSchematicToggle?: () => void;
}) {
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="camera-view-panel" aria-label="Camera view controls">
        {(["overview", "breadboard", "esp32"] as CameraView[]).map((item) => (
          <button
            key={item}
            type="button"
            className={view === item ? "is-active" : ""}
            onClick={() => onViewChange(item)}
          >
            {item === "esp32" ? "ESP32" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
        {schematicAvailable ? (
          <button
            type="button"
            className={`camera-schematic-button${schematicOpen ? " is-active" : ""}`}
            aria-pressed={schematicOpen}
            onClick={onSchematicToggle}
          >
            Schematic
          </button>
        ) : null}
        <button
          type="button"
          className="camera-reset-button"
          aria-label="Reset camera"
          title="Reset camera"
          onClick={onReset}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </Html>
  );
}

function ShortLessonCard({ onClose }: { onClose: () => void }) {
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="short-lesson-card" role="status">
        <strong>Short reset complete.</strong>
        <span>3V3 and GND were tied together, so current skipped the load path. On real hardware, remove power before moving wires.</span>
        <button type="button" onClick={onClose}>
          Got it
        </button>
      </div>
    </Html>
  );
}

function ShortRiskCard() {
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="short-lesson-card is-risk" role="alert">
        <strong>Short risk found.</strong>
        <span>3V3 and GND are connected, but USB is not inserted. Nothing is powered yet. Remove the short before inserting USB.</span>
      </div>
    </Html>
  );
}

function compactViewportDefaults() {
  return { view: "breadboard" as CameraView, zoom: 0.46 };
}

function ZoomControlPanel({
  zoomLevel,
  onZoomChange
}: {
  zoomLevel: number;
  onZoomChange: (zoomLevel: number) => void;
}) {
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="zoom-control-panel" aria-label="Zoom controls">
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={zoomLevel <= MIN_CAMERA_ZOOM}
          onClick={() => onZoomChange(clampCameraZoom(zoomLevel - CAMERA_ZOOM_STEP))}
        >
          <ZoomOut aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={zoomLevel >= MAX_CAMERA_ZOOM}
          onClick={() => onZoomChange(clampCameraZoom(zoomLevel + CAMERA_ZOOM_STEP))}
        >
          <ZoomIn aria-hidden="true" />
        </button>
      </div>
    </Html>
  );
}

function BenchStatusPanel({
  activePart,
  jumperToolActive,
  implicitJumperMode,
  jumperStart,
  placementWarning,
  removeMode,
  wiringMode,
  selectedLead,
  selectedComponentLead,
  hoveredHole,
  placementCameraLocked,
  partLabels
}: {
  activePart: TrainerPartId | null;
  jumperToolActive: boolean;
  implicitJumperMode: boolean;
  jumperStart: HolePoint | null;
  placementWarning: string | null;
  removeMode: boolean;
  wiringMode: WiringMode;
  selectedLead: LeadKind;
  selectedComponentLead: string | null;
  hoveredHole: HolePoint | null;
  placementCameraLocked: boolean;
  partLabels?: TrainerPartLabelConfig;
}) {
  const jumperPlacementMode = jumperToolActive || implicitJumperMode;
  const toolLabel =
    removeMode
      ? "remove mode"
      : jumperPlacementMode
      ? jumperStart
        ? `jumper from ${jumperStart.label}`
        : "jumper start"
      : activePart && wiringMode === "component"
      ? selectedComponentLead
        ? breadboardPlacementText(activePart, selectedComponentLead, partLabels)
        : `${partLabelFor(activePart, partLabels)} lead`
      : wiringMode === "supply"
        ? selectedLead === "positive"
          ? "+3V3 lead"
          : "GND lead"
        : "select tool";

  const targetLabel = displayHoleLabel(hoveredHole);
  const actionLabel =
    placementWarning
      ? placementWarning
      : removeMode
      ? hoveredHole
        ? `click removes ${displayHoleLabel(hoveredHole)} if occupied`
        : "click placed leads or jumper endpoints"
      : jumperPlacementMode
      ? jumperStart
        ? "click second hole to place wire"
        : "click first hole"
      : activePart && wiringMode === "component" && !selectedComponentLead
      ? "choose lead"
      : hoveredHole
        ? selectedComponentLead && activePart
          ? `click to place: ${breadboardPlacementText(activePart, selectedComponentLead, partLabels)}`
          : `click places ${toolLabel}`
        : "hover breadboard hole";

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="bench-status-panel" aria-label="Breadboard placement status">
        <span>{placementCameraLocked ? "Breadboard placement" : toolLabel}</span>
        <strong>{targetLabel}</strong>
        <em>{actionLabel}</em>
      </div>
    </Html>
  );
}

function TapTargetHelper({
  hoveredHole,
  lastTouchedHole,
  jumperStart
}: {
  hoveredHole: HolePoint | null;
  lastTouchedHole: HolePoint | null;
  jumperStart: HolePoint | null;
}) {
  const focusHole = hoveredHole ?? lastTouchedHole;
  if (!focusHole) return null;

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div className="tap-target-helper" aria-label="Tap target helper">
        <span>{jumperStart ? "wire end" : "target hole"}</span>
        <strong>{displayHoleLabel(focusHole)}</strong>
      </div>
    </Html>
  );
}

function LastTouchedHolePulse({ hole, pulseKey }: { hole: HolePoint | null; pulseKey: number }) {
  const group = useRef<THREE.Group>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = performance.now();
    if (group.current) group.current.visible = Boolean(hole);
  }, [hole, pulseKey]);

  useFrame(() => {
    if (!group.current || !hole) return;
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    const life = Math.max(0, 1 - elapsed / 0.7);
    const scale = 1 + (1 - life) * 1.25;
    group.current.visible = life > 0.02;
    group.current.scale.set(scale, 1, scale);
    group.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (material) material.opacity = life * 0.58;
    });
  });

  if (!hole) return null;

  return (
    <group ref={group} position={[hole.position[0], hole.position[1] + 0.03, hole.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.048, 0.082, 34]} />
        <meshBasicMaterial color="#fff2a6" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.08, 0]} color="#fff2a6" intensity={0.34} distance={0.48} />
    </group>
  );
}

function CourseHighlight({ target }: { target: CourseHighlightTarget | null }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 16) * 0.08;
    group.current.scale.set(pulse, 1, pulse);
    group.current.visible = Math.sin(clock.elapsedTime * 18) > -0.35;
  });

  if (!target) return null;
  if (["potentiometer", "resistor", "led", "button", "buzzer", "ldr", "dividerResistor"].includes(target)) return null;

  const highlight =
    target === "ground-rail"
      ? { position: [0, 0.255, 1.08] as Vec3, scale: [3.18, 0.012, 0.2] as Vec3, color: "#60d394", label: "GND rail" }
      : target === "power-rail"
        ? { position: [0, 0.255, 0.91] as Vec3, scale: [3.18, 0.012, 0.2] as Vec3, color: "#ff5468", label: "3V3 rail" }
        : target === "potentiometer"
          ? { position: [-2.63, 0.29, -0.27] as Vec3, scale: [0.52, 0.012, 0.52] as Vec3, color: "#fff2a6", label: "10K POT" }
          : target === "resistor"
            ? { position: [-2.23, 0.29, 0.16] as Vec3, scale: [0.82, 0.012, 0.38] as Vec3, color: "#fff2a6", label: "330R" }
            : target === "led"
              ? { position: [-1.9, 0.31, -0.27] as Vec3, scale: [0.5, 0.012, 0.52] as Vec3, color: "#ff5468", label: "LED" }
              : target === "button"
                ? { position: [-2.63, 0.31, 0.36] as Vec3, scale: [0.5, 0.012, 0.5] as Vec3, color: "#fff2a6", label: "BTN" }
              : target === "buzzer"
                ? { position: [-1.83, 0.31, 0.6] as Vec3, scale: [0.52, 0.012, 0.52] as Vec3, color: "#ffd45f", label: "BUZZER" }
                : target === "usb"
                  ? { position: [2.58, 0.37, 0.86] as Vec3, scale: [0.58, 0.012, 0.28] as Vec3, color: "#d7e8e6", label: "USB-C" }
                  : { position: [2.58, 0.32, -0.5] as Vec3, scale: [1.15, 0.012, 1.0] as Vec3, color: "#fff2a6", label: "ESP32" };

  return (
    <group ref={group}>
      <mesh position={highlight.position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[highlight.scale[0], highlight.scale[2]]} />
        <meshBasicMaterial color={highlight.color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[highlight.position[0], highlight.position[1] + 0.01, highlight.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(highlight.scale[0], highlight.scale[2]) * 0.26, Math.max(highlight.scale[0], highlight.scale[2]) * 0.52, 48]} />
        <meshBasicMaterial color={highlight.color} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <pointLight position={[highlight.position[0], 0.65, highlight.position[2]]} color={highlight.color} intensity={0.75} distance={1.4} />
    </group>
  );
}

function componentPinMapFromConnections(connections: ComponentLeadConnection): ComponentPinMap {
  return Object.fromEntries(
    trainerPartIds.map((partId) => [
      partId,
      Object.fromEntries(
        trainerPartLeads[partId].map((lead) => {
          const connection = connections[componentLeadKey(partId, lead.id)];
          return [lead.id, connection ? displayHoleLabel(connection) : "not placed"];
        })
      )
    ])
  ) as ComponentPinMap;
}

function railKindForHole(hole: HolePoint | null): RailKind | null {
  if (!hole?.railId) return null;
  return hole.railId.includes("positive") ? "positive" : "negative";
}

function buildCircuitSnapshot({
  componentConnections,
  jumperConnections,
  leadConnections
}: {
  componentConnections: ComponentLeadConnection;
  jumperConnections: JumperConnection[];
  leadConnections: Record<LeadKind, LeadConnection>;
}): CircuitSnapshot {
  const parents = new Map<string, string>();

  function find(net: string): string {
    const parent = parents.get(net);
    if (!parent) {
      parents.set(net, net);
      return net;
    }
    if (parent === net) return net;
    const root = find(parent);
    parents.set(net, root);
    return root;
  }

  function union(a: string, b: string) {
    parents.set(find(a), find(b));
  }

  BREADBOARD_HOLES.forEach((hole) => find(hole.netId));
  if (leadConnections.positive) union("esp32:3v3", leadConnections.positive.netId);
  if (leadConnections.negative) union("esp32:gnd", leadConnections.negative.netId);
  jumperConnections.forEach((jumper) => union(jumper.from.netId, jumper.to.netId));

  const sourceKinds: Record<string, EnergyKind> = {
    "esp32:3v3": "positive",
    "esp32:gnd": "negative",
    "esp32:vin5v": "vin"
  };
  const sourcesByRoot = new Map<string, Set<EnergyKind>>();

  Object.entries(sourceKinds).forEach(([netId, sourceKind]) => {
    const root = find(netId);
    const current = sourcesByRoot.get(root) ?? new Set<EnergyKind>();
    current.add(sourceKind);
    sourcesByRoot.set(root, current);
  });

  function connected(netA: string | undefined, netB: string): boolean {
    if (!netA) return false;
    return find(netA) === find(netB);
  }

  function connectedToRailKind(netId: string, kind: RailKind): boolean {
    return BREADBOARD_HOLES.some(
      (hole) => hole.railId && railKindForHole(hole) === kind && connected(hole.netId, netId)
    );
  }

  function energyForNet(netId: string | undefined): EnergyKind | null {
    if (!netId) return null;
    const sources = sourcesByRoot.get(find(netId));
    if (!sources || sources.size === 0) return null;
    if (sources.has("negative") && (sources.has("positive") || sources.has("vin"))) return "short";
    if (sources.has("positive") && sources.has("vin")) return "short";
    if (sources.has("vin")) return "vin";
    if (sources.has("positive")) return "positive";
    if (sources.has("negative")) return "negative";
    return null;
  }

  const potGnd = componentConnections[componentLeadKey("potentiometer", "gnd")]?.netId;
  const potWiper = componentConnections[componentLeadKey("potentiometer", "wiper")]?.netId;
  const potVcc = componentConnections[componentLeadKey("potentiometer", "vcc")]?.netId;
  const resistorLeft = componentConnections[componentLeadKey("resistor", "left")]?.netId;
  const resistorRight = componentConnections[componentLeadKey("resistor", "right")]?.netId;
  const ledAnode = componentConnections[componentLeadKey("led", "anode")]?.netId;
  const ledCathode = componentConnections[componentLeadKey("led", "cathode")]?.netId;
  const buzzerResistorGpio = componentConnections[componentLeadKey("buzzerResistor", "gpio")]?.netId;
  const buzzerResistorBuzzer = componentConnections[componentLeadKey("buzzerResistor", "buzzer")]?.netId;
  const buzzerPositive = componentConnections[componentLeadKey("buzzer", "positive")]?.netId;
  const buzzerNegative = componentConnections[componentLeadKey("buzzer", "negative")]?.netId;
  const buttonGpio = componentConnections[componentLeadKey("button", "gpio")]?.netId;
  const buttonGround = componentConnections[componentLeadKey("button", "ground")]?.netId;
  const ldrVcc = componentConnections[componentLeadKey("ldr", "vcc")]?.netId;
  const ldrSense = componentConnections[componentLeadKey("ldr", "sense")]?.netId;
  const dividerSense = componentConnections[componentLeadKey("dividerResistor", "sense")]?.netId;
  const dividerGround = componentConnections[componentLeadKey("dividerResistor", "ground")]?.netId;
  const hasShort = Array.from(sourcesByRoot.values()).some((sources) => {
    return (
      (sources.has("negative") && (sources.has("positive") || sources.has("vin"))) ||
      (sources.has("positive") && sources.has("vin"))
    );
  });

  return {
    connected,
    connectedToRailKind,
    energyForNet,
    hasShort,
    nets: {
      potGnd,
      potWiper,
      potVcc,
      resistorLeft,
      resistorRight,
      ledAnode,
      ledCathode,
      buzzerResistorGpio,
      buzzerResistorBuzzer,
      buzzerPositive,
      buzzerNegative,
      buttonGpio,
      buttonGround,
      ldrVcc,
      ldrSense,
      dividerSense,
      dividerGround
    }
  };
}

function circuitWireStateFromConnections(inputs: {
  componentConnections: ComponentLeadConnection;
  jumperConnections: JumperConnection[];
  leadConnections: Record<LeadKind, LeadConnection>;
}): CircuitWireState {
  const { connected, connectedToRailKind, energyForNet, nets } = buildCircuitSnapshot(inputs);
  const connectedToAnyRail = (netId: string) => BREADBOARD_HOLES.some((hole) => hole.railId && connected(hole.netId, netId));
  const potGndEnergy = energyForNet(nets.potGnd);
  const potVccEnergy = energyForNet(nets.potVcc);
  const potOuterHasGround = potGndEnergy === "negative" || potVccEnergy === "negative";
  const potOuterHasPower = potGndEnergy === "positive" || potVccEnergy === "positive";
  const resistorTouchesGpio25 = Boolean(
    (nets.resistorLeft && connected(nets.resistorLeft, "esp32:gpio25")) ||
      (nets.resistorRight && connected(nets.resistorRight, "esp32:gpio25"))
  );
  const resistorTouchesLedAnode = Boolean(
    nets.ledAnode &&
      ((nets.resistorLeft && connected(nets.resistorLeft, nets.ledAnode)) ||
        (nets.resistorRight && connected(nets.resistorRight, nets.ledAnode)))
  );
  const buzzerResistorTouchesGpio26 = Boolean(
    (nets.buzzerResistorGpio && connected(nets.buzzerResistorGpio, "esp32:gpio26")) ||
      (nets.buzzerResistorBuzzer && connected(nets.buzzerResistorBuzzer, "esp32:gpio26"))
  );
  const buzzerResistorTouchesBuzzerPositive = Boolean(
    nets.buzzerPositive &&
      ((nets.buzzerResistorGpio && connected(nets.buzzerResistorGpio, nets.buzzerPositive)) ||
        (nets.buzzerResistorBuzzer && connected(nets.buzzerResistorBuzzer, nets.buzzerPositive)))
  );
  const buttonTouchesGpio27 = Boolean(
    (nets.buttonGpio && connected(nets.buttonGpio, "esp32:gpio27")) ||
      (nets.buttonGround && connected(nets.buttonGround, "esp32:gpio27"))
  );
  const ldrSenseTouchesGpio35 = Boolean(
    (nets.ldrSense && connected(nets.ldrSense, "esp32:gpio35")) ||
      (nets.dividerSense && connected(nets.dividerSense, "esp32:gpio35"))
  );
  const ldrSenseTouchesDivider = Boolean(
    nets.ldrSense &&
      nets.dividerSense &&
      connected(nets.ldrSense, nets.dividerSense)
  );

  return {
    esp32_gnd_to_ground_rail:
      connectedToAnyRail("esp32:gnd") ||
      railKindForHole(inputs.leadConnections.negative) === "negative" ||
      connectedToRailKind("esp32:gnd", "negative") ||
      BREADBOARD_HOLES.some((hole) => hole.railId && railKindForHole(hole) === "negative" && energyForNet(hole.netId) === "negative"),
    esp32_3v3_to_power_rail:
      connectedToAnyRail("esp32:3v3") ||
      railKindForHole(inputs.leadConnections.positive) === "positive" ||
      connectedToRailKind("esp32:3v3", "positive") ||
      BREADBOARD_HOLES.some((hole) => hole.railId && railKindForHole(hole) === "positive" && energyForNet(hole.netId) === "positive"),
    pot_low_to_ground_rail: potOuterHasGround,
    pot_high_to_power_rail: potOuterHasPower,
    pot_wiper_to_gpio34: connected(nets.potWiper, "esp32:gpio34"),
    ldr_high_to_power_rail: energyForNet(nets.ldrVcc) === "positive",
    ldr_sense_to_gpio35: ldrSenseTouchesGpio35,
    ldr_sense_to_divider_resistor: ldrSenseTouchesDivider,
    divider_resistor_to_ground_rail: energyForNet(nets.dividerGround) === "negative",
    gpio25_to_resistor: resistorTouchesGpio25,
    resistor_to_led_anode: resistorTouchesLedAnode,
    led_cathode_to_ground_rail: connected(nets.ledCathode, "esp32:gnd"),
    gpio27_to_button: buttonTouchesGpio27,
    button_to_ground_rail: connected(nets.buttonGpio, "esp32:gnd") || connected(nets.buttonGround, "esp32:gnd"),
    gpio26_to_buzzer_resistor: buzzerResistorTouchesGpio26,
    buzzer_resistor_to_buzzer_positive: buzzerResistorTouchesBuzzerPositive,
    gpio26_to_buzzer_positive: connected(nets.buzzerPositive, "esp32:gpio26"),
    buzzer_negative_to_ground_rail: connected(nets.buzzerNegative, "esp32:gnd")
  };
}

function circuitFaultStateFromConnections(inputs: {
  componentConnections: ComponentLeadConnection;
  jumperConnections: JumperConnection[];
  leadConnections: Record<LeadKind, LeadConnection>;
}): CircuitFaultState {
  const { connected, energyForNet, hasShort, nets } = buildCircuitSnapshot(inputs);
  const directGpio25ToLedAnode = Boolean(nets.ledAnode && connected(nets.ledAnode, "esp32:gpio25"));
  const resistorBetween = (firstNet: string | undefined, secondNet: string | undefined): boolean =>
    Boolean(
      firstNet &&
        secondNet &&
        nets.resistorLeft &&
        nets.resistorRight &&
        ((connected(nets.resistorLeft, firstNet) && connected(nets.resistorRight, secondNet)) ||
          (connected(nets.resistorRight, firstNet) && connected(nets.resistorLeft, secondNet)))
    );
  const resistorInLedPath = resistorBetween("esp32:gpio25", nets.ledAnode);
  const resistorDrivesLedCathode = resistorBetween("esp32:gpio25", nets.ledCathode);
  const resistorTouchesLedCathode = Boolean(
    nets.resistorLeft &&
      nets.resistorRight &&
      nets.ledCathode &&
      (connected(nets.resistorLeft, nets.ledCathode) || connected(nets.resistorRight, nets.ledCathode))
  );
  const ledPlaced = Boolean(nets.ledAnode || nets.ledCathode);
  const potPlaced = Boolean(nets.potGnd || nets.potWiper || nets.potVcc);
  const ldrDividerPlaced = Boolean(nets.ldrVcc || nets.ldrSense || nets.dividerSense || nets.dividerGround);
  const buzzerPlaced = Boolean(nets.buzzerPositive || nets.buzzerNegative);
  const buttonPlaced = Boolean(nets.buttonGpio || nets.buttonGround);
  const potGrounded = energyForNet(nets.potGnd) === "negative" || energyForNet(nets.potVcc) === "negative";
  const ledGrounded = energyForNet(nets.ledCathode) === "negative";
  const ledAnodeGrounded = energyForNet(nets.ledAnode) === "negative";
  const ledReversed = Boolean(
    ledPlaced &&
      ledAnodeGrounded &&
      nets.ledCathode &&
      (connected(nets.ledCathode, "esp32:gpio25") || resistorDrivesLedCathode || resistorTouchesLedCathode)
  );
  const potWiperOnWrongKnownPin = Boolean(
    nets.potWiper &&
      !connected(nets.potWiper, "esp32:gpio34") &&
      (connected(nets.potWiper, "esp32:gpio25") ||
        connected(nets.potWiper, "esp32:gpio26") ||
        connected(nets.potWiper, "esp32:gpio27") ||
        connected(nets.potWiper, "esp32:3v3") ||
        connected(nets.potWiper, "esp32:gnd") ||
        connected(nets.potWiper, "esp32:vin5v"))
  );
  const resistorDrivenByWrongPin = Boolean(
    [nets.resistorLeft, nets.resistorRight].some(
      (resistorNet) =>
        resistorNet &&
        !connected(resistorNet, "esp32:gpio25") &&
        (connected(resistorNet, "esp32:gpio26") ||
          connected(resistorNet, "esp32:gpio27") ||
          connected(resistorNet, "esp32:3v3") ||
          connected(resistorNet, "esp32:vin5v"))
    )
  );

  return {
    rail_short: hasShort,
    pot_to_vin:
      energyForNet(nets.potVcc) === "vin" ||
      energyForNet(nets.potWiper) === "vin" ||
      energyForNet(nets.potGnd) === "vin",
    pot_wiper_wrong_pin: potWiperOnWrongKnownPin,
    ldr_divider_incomplete: Boolean(
      ldrDividerPlaced &&
        !(
          energyForNet(nets.ldrVcc) === "positive" &&
          nets.ldrSense &&
          nets.dividerSense &&
          connected(nets.ldrSense, nets.dividerSense) &&
          connected(nets.ldrSense, "esp32:gpio35") &&
          energyForNet(nets.dividerGround) === "negative"
        )
    ),
    led_no_resistor: directGpio25ToLedAnode && !resistorInLedPath,
    led_reversed: ledReversed,
    led_wrong_gpio: resistorDrivenByWrongPin,
    buzzer_enabled: buzzerPlaced,
    button_miswire: Boolean(buttonPlaced && (energyForNet(nets.buttonGpio) === "positive" || energyForNet(nets.buttonGround) === "positive")),
    missing_common_ground: (potPlaced && !potGrounded) || (ledPlaced && !ledGrounded && !ledReversed)
  };
}

function potOrientationFromSnapshot(snapshot: CircuitSnapshot): PotOrientation {
  const gndEnergy = snapshot.energyForNet(snapshot.nets.potGnd);
  const vccEnergy = snapshot.energyForNet(snapshot.nets.potVcc);
  if (gndEnergy === "negative" && vccEnergy === "positive") return "normal";
  if (gndEnergy === "positive" && vccEnergy === "negative") return "inverted";
  return "floating";
}

function Breadboard({
  activePart,
  highlightedPartId,
  checkAnimationActive,
  traceMode,
  removeMode,
  jumperColor,
  jumperToolActive,
  ledOutput,
  buzzerOutput = 0,
  potValue,
  partLabels,
  onActivePartChange,
  onActivePinMapChange,
  onComponentPinMapChange,
  onPotValueChange,
  onCircuitFaultStateChange,
  onCircuitWireStateChange,
  onPlacedPartIdsChange,
  onSupplyPinMapChange,
  onEffectivePotValueChange,
  onPlacementCameraLockChange,
  onHoleSelectSound,
  onPlacementSound,
  onShortSound,
  usbPowered = false,
  schematicAvailable = false,
  schematicOpen = false,
  onSchematicToggle
}: {
  activePart: TrainerPartId | null;
  highlightedPartId?: TrainerPartId | null;
  checkAnimationActive: boolean;
  traceMode: CourseTraceMode;
  removeMode: boolean;
  jumperColor: string;
  jumperToolActive: boolean;
  ledOutput: number;
  buzzerOutput?: number;
  potValue: number;
  partLabels?: TrainerPartLabelConfig;
  onActivePartChange: (part: TrainerPartId | null) => void;
  onActivePinMapChange: (pinMap: Record<string, string>) => void;
  onComponentPinMapChange: (pinMap: ComponentPinMap) => void;
  onPotValueChange: (value: number) => void;
  onCircuitFaultStateChange: (faultState: CircuitFaultState) => void;
  onCircuitWireStateChange: (wireState: CircuitWireState) => void;
  onPlacedPartIdsChange: (partIds: Set<TrainerPartId>) => void;
  onSupplyPinMapChange: (pinMap: SupplyPinMap) => void;
  onEffectivePotValueChange: (value: number, orientation: PotOrientation) => void;
  onPlacementCameraLockChange: (locked: boolean) => void;
  onHoleSelectSound?: () => void;
  onPlacementSound?: () => void;
  onShortSound?: () => void;
  usbPowered?: boolean;
  schematicAvailable?: boolean;
  schematicOpen?: boolean;
  onSchematicToggle?: () => void;
}) {
  const [selectedLead, setSelectedLead] = useState<LeadKind>("positive");
  const [wiringMode, setWiringMode] = useState<WiringMode>("component");
  const [selectedComponentLead, setSelectedComponentLead] = useState<string | null>(null);
  const [hoveredComponentLead, setHoveredComponentLead] = useState<string | null>(null);
  const [hoveredHole, setHoveredHole] = useState<HolePoint | null>(null);
  const [leadConnections, setLeadConnections] = useState<Record<LeadKind, LeadConnection>>({
    positive: null,
    negative: null
  });
  const [componentConnections, setComponentConnections] = useState<ComponentLeadConnection>({});
  const [jumperStart, setJumperStart] = useState<HolePoint | null>(null);
  const [jumperConnections, setJumperConnections] = useState<JumperConnection[]>([]);
  const [undoStack, setUndoStack] = useState<SerializedLabSceneState[]>([]);
  const [resistorPlacementWarning, setResistorPlacementWarning] = useState<string | null>(null);
  const [showFriedNotice, setShowFriedNotice] = useState(false);
  const [shortImpactActive, setShortImpactActive] = useState(false);
  const [showShortLesson, setShowShortLesson] = useState(false);
  const [lastTouchedHole, setLastTouchedHole] = useState<HolePoint | null>(null);
  const [lastTouchedPulseKey, setLastTouchedPulseKey] = useState(0);
  const [supplyCameraSession, setSupplyCameraSession] = useState(false);
  const shortSoundPlayedRef = useRef(false);
  const circuitSnapshot = useMemo(
    () =>
      buildCircuitSnapshot({
        componentConnections,
        jumperConnections,
        leadConnections
      }),
    [componentConnections, jumperConnections, leadConnections]
  );
  const shortRisk = circuitSnapshot.hasShort;
  const fried = usbPowered && shortRisk;
  const selectedHoleIds = new Set(
    [
      leadConnections.positive?.id,
      leadConnections.negative?.id,
      jumperStart?.id,
      ...jumperConnections.flatMap((jumper) => [jumper.from.id, jumper.to.id]),
      ...Object.values(componentConnections).map((hole) => hole.id)
    ].filter((holeId): holeId is string => Boolean(holeId))
  );
  const placedPartIds = useMemo(() => placedPartIdsFromConnections(componentConnections), [componentConnections]);
  const activePartIsPlaced = Boolean(activePart && placedPartIds.has(activePart));
  const circuitFaultState = useMemo(
    () => circuitFaultStateFromConnections({ componentConnections, jumperConnections, leadConnections }),
    [componentConnections, jumperConnections, leadConnections]
  );
  const implicitJumperMode = !activePart && wiringMode === "component" && !selectedComponentLead;
  const jumperPlacementMode = jumperToolActive || implicitJumperMode;
  const placementArmed = !fried && (removeMode || jumperPlacementMode || wiringMode === "supply" || Boolean(selectedComponentLead));
  const supplyPairIncomplete = !leadConnections.positive || !leadConnections.negative;
  const placementCameraLocked = Boolean(
    !fried &&
      (wiringMode === "supply" ||
        (supplyCameraSession && supplyPairIncomplete) ||
        (activePart && wiringMode === "component" && selectedComponentLead))
  );

  function markTouchedHole(hole: HolePoint | null) {
    setLastTouchedHole(hole);
    if (hole) setLastTouchedPulseKey((current) => current + 1);
  }

  function currentSceneState(): SerializedLabSceneState {
    return {
      leadConnections: {
        positive: leadConnections.positive?.id ?? null,
        negative: leadConnections.negative?.id ?? null
      },
      componentConnections: Object.fromEntries(
        Object.entries(componentConnections).map(([key, hole]) => [key, hole.id])
      ),
      jumperConnections: jumperConnections.map((jumper) => ({
        from: jumper.from.id,
        to: jumper.to.id,
        color: jumper.color
      }))
    };
  }

  function pushUndoSnapshot() {
    const snapshot = currentSceneState();
    setUndoStack((current) => [...current.slice(-19), snapshot]);
  }

  function restoreSceneState(state: SerializedLabSceneState) {
    const restoredLeadConnections: Record<LeadKind, LeadConnection> = { positive: null, negative: null };
    (["positive", "negative"] as LeadKind[]).forEach((kind) => {
      const holeId = state.leadConnections?.[kind];
      restoredLeadConnections[kind] = holeId ? findHoleById(holeId) ?? null : null;
    });

    const restoredComponentConnections: ComponentLeadConnection = {};
    Object.entries(state.componentConnections ?? {}).forEach(([key, holeId]) => {
      const hole = findHoleById(holeId);
      if (hole) restoredComponentConnections[key] = hole;
    });

    const restoredJumpers = (state.jumperConnections ?? []).flatMap((jumper, index) => {
      const from = findHoleById(jumper.from);
      const to = findHoleById(jumper.to);
      if (!from || !to || from.id === to.id) return [];
      return [{ id: `restored-jumper-${Date.now()}-${index}`, from, to, color: jumper.color || jumperColor }];
    });

    setLeadConnections(restoredLeadConnections);
    setComponentConnections(restoredComponentConnections);
    setJumperConnections(restoredJumpers);
    setJumperStart(null);
    setResistorPlacementWarning(null);
    setSelectedLead("positive");
    setWiringMode("component");
    setSelectedComponentLead(null);
    setHoveredComponentLead(null);
    setHoveredHole(null);
    markTouchedHole(null);
    setShowFriedNotice(false);
    setSupplyCameraSession(false);
    setShowShortLesson(false);
  }

  function undoLastChange(): boolean {
    let restored = false;
    setUndoStack((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      restored = true;
      window.setTimeout(() => restoreSceneState(previous), 0);
      return current.slice(0, -1);
    });
    return restored;
  }

  useEffect(() => {
    onPlacementCameraLockChange(placementCameraLocked);
  }, [onPlacementCameraLockChange, placementCameraLocked]);

  useEffect(() => {
    onPlacedPartIdsChange(new Set(placedPartIds));
  }, [onPlacedPartIdsChange, placedPartIds]);

  useEffect(() => {
    onSupplyPinMapChange({
      positive: leadConnections.positive ? displayHoleLabel(leadConnections.positive) : null,
      negative: leadConnections.negative ? displayHoleLabel(leadConnections.negative) : null
    });
  }, [leadConnections.negative, leadConnections.positive, onSupplyPinMapChange]);

  useEffect(() => {
    onCircuitWireStateChange(
      circuitWireStateFromConnections({
        componentConnections,
        jumperConnections,
        leadConnections
      })
    );
  }, [componentConnections, jumperConnections, leadConnections, onCircuitWireStateChange]);

  useEffect(() => {
    onCircuitFaultStateChange(circuitFaultState);
  }, [circuitFaultState, onCircuitFaultStateChange]);

  useEffect(() => {
    const orientation = potOrientationFromSnapshot(circuitSnapshot);
    onEffectivePotValueChange(orientation === "inverted" ? 1 - potValue : potValue, orientation);
  }, [circuitSnapshot, onEffectivePotValueChange, potValue]);

  useEffect(() => {
    if (!activePart || !activePartIsPlaced) return;
    setSelectedComponentLead(null);
    setHoveredComponentLead(null);
    setHoveredHole(null);
    setWiringMode("component");
    onActivePartChange(null);
  }, [activePart, activePartIsPlaced, onActivePartChange]);

  function occupiedHoleLabel(hole: HolePoint, options: { ignoreComponentKey?: string; ignoreLeadKind?: LeadKind; ignoreJumperStart?: boolean } = {}): string | null {
    if (options.ignoreLeadKind !== "positive" && leadConnections.positive?.id === hole.id) return "+3V3 lead";
    if (options.ignoreLeadKind !== "negative" && leadConnections.negative?.id === hole.id) return "GND lead";
    if (!options.ignoreJumperStart && jumperStart?.id === hole.id) return "jumper start";

    for (const jumper of jumperConnections) {
      if (jumper.from.id === hole.id || jumper.to.id === hole.id) return "jumper wire";
    }

    for (const [key, connectedHole] of Object.entries(componentConnections)) {
      if (key === options.ignoreComponentKey) continue;
      if (connectedHole.id !== hole.id) continue;
      const [partId, leadId] = key.split(":") as [TrainerPartId, string];
      return `${partLabelFor(partId, partLabels)} ${componentLeadLabel(partId, leadId, partLabels)}`;
    }

    return null;
  }

  function blockOccupiedHole(hole: HolePoint, occupant: string | null): boolean {
    if (!occupant) return false;
    setResistorPlacementWarning(`${displayHoleLabel(hole)} is already occupied by ${occupant}. Pick an empty hole.`);
    return true;
  }

  function removeThingAtHole(hole: HolePoint): boolean {
    const jumperHits = jumperConnections.filter((jumper) => jumper.from.id === hole.id || jumper.to.id === hole.id);
    const componentKeys = Object.entries(componentConnections)
      .filter(([, connectedHole]) => connectedHole.id === hole.id)
      .map(([key]) => key);
    const leadKinds = (["positive", "negative"] as LeadKind[]).filter((kind) => leadConnections[kind]?.id === hole.id);
    const clearsJumperStart = jumperStart?.id === hole.id;
    const hasRemoval = jumperHits.length > 0 || componentKeys.length > 0 || leadKinds.length > 0 || clearsJumperStart;

    if (!hasRemoval) {
      setResistorPlacementWarning(`${displayHoleLabel(hole)} has nothing removable. Click a placed lead or jumper endpoint.`);
      return false;
    }

    pushUndoSnapshot();
    setJumperConnections((current) => current.filter((jumper) => jumper.from.id !== hole.id && jumper.to.id !== hole.id));
    if (clearsJumperStart) setJumperStart(null);
    if (componentKeys.length > 0) {
      setComponentConnections((current) => {
        const next = { ...current };
        componentKeys.forEach((key) => delete next[key]);
        return next;
      });
      setActiveComponentSelectionAfterRemoval(componentKeys[0]);
    }
    if (leadKinds.length > 0) {
      setLeadConnections((current) => {
        const next = { ...current };
        leadKinds.forEach((kind) => {
          next[kind] = null;
        });
        return next;
      });
    }
    setResistorPlacementWarning(null);
    onPlacementSound?.();
    return true;
  }

  function setActiveComponentSelectionAfterRemoval(componentKey: string | undefined) {
    if (!componentKey) return;
    const [partId, leadId] = componentKey.split(":") as [TrainerPartId, string];
    onActivePartChange(partId);
    setSelectedComponentLead(leadId);
    setWiringMode("component");
  }

  function inferJumperColor(from: HolePoint, to: HolePoint): string {
    const endpointEnergy = [circuitSnapshot.energyForNet(from.netId), circuitSnapshot.energyForNet(to.netId)];
    if (endpointEnergy.includes("negative")) return "#60d394";
    if (endpointEnergy.includes("positive") || endpointEnergy.includes("vin")) return "#ff5468";

    const role = traceRoleForJumper(
      {
        id: "pending-jumper",
        from,
        to,
        color: jumperColor
      },
      componentConnections
    );
    return defaultJumperColorForRole(role) ?? jumperColor;
  }

  function connectSelectedLead(hole: HolePoint) {
    if (fried) return;
    markTouchedHole(hole);

    if (removeMode) {
      removeThingAtHole(hole);
      return;
    }

    if (jumperPlacementMode) {
      setJumperStart((currentStart) => {
        const occupant = occupiedHoleLabel(hole, { ignoreJumperStart: currentStart?.id === hole.id });
        if (!currentStart) {
          if (occupant) {
            setResistorPlacementWarning(`${displayHoleLabel(hole)} is already occupied by ${occupant}. Pick an empty hole.`);
            return null;
          }
          setResistorPlacementWarning(null);
          onHoleSelectSound?.();
          return hole;
        }
        if (currentStart.id === hole.id) {
          setResistorPlacementWarning(`${displayHoleLabel(hole)} is already the jumper start. Pick a different empty destination hole.`);
          return currentStart;
        }
        if (occupant) {
          setResistorPlacementWarning(`${displayHoleLabel(hole)} is already occupied by ${occupant}. Pick an empty hole.`);
          return currentStart;
        }

        setJumperConnections((current) => [
          ...current,
          {
            id: `jumper-${Date.now()}-${current.length}`,
            from: currentStart,
            to: hole,
            color: inferJumperColor(currentStart, hole)
          }
        ]);
        pushUndoSnapshot();
        onPlacementSound?.();
        setResistorPlacementWarning(null);
        return null;
      });
      return;
    }

    if (activePart && wiringMode === "component" && selectedComponentLead) {
      const key = componentLeadKey(activePart, selectedComponentLead);
      if (componentConnections[key]?.id === hole.id) {
        setResistorPlacementWarning(`${displayHoleLabel(hole)} already holds that lead. Pick a different empty hole or use Remove mode.`);
        return;
      }
      if (componentConnections[key]?.id !== hole.id && blockOccupiedHole(hole, occupiedHoleLabel(hole, { ignoreComponentKey: key }))) {
        return;
      }
      setResistorPlacementWarning(null);
      const nextConnections = { ...componentConnections };
      pushUndoSnapshot();
      nextConnections[key] = hole;
      onPlacementSound?.();
      setComponentConnections(nextConnections);
      const nextLeadId = nextUnplacedLeadForPart(activePart, selectedComponentLead, nextConnections);
      setSelectedComponentLead(nextLeadId);
      setHoveredComponentLead(null);
      return;
    }

    if (wiringMode !== "supply") return;
    if (leadConnections[selectedLead]?.id === hole.id) {
      setResistorPlacementWarning(`${displayHoleLabel(hole)} already holds the ${selectedLead === "positive" ? "3V3" : "GND"} lead. Pick a different empty hole or use Remove mode.`);
      return;
    }
    if (leadConnections[selectedLead]?.id !== hole.id && blockOccupiedHole(hole, occupiedHoleLabel(hole, { ignoreLeadKind: selectedLead }))) {
      return;
    }

    pushUndoSnapshot();
    setLeadConnections((current) => {
      return {
        ...current,
        [selectedLead]: hole
      };
    });
    if (leadConnections[selectedLead]?.id !== hole.id) onPlacementSound?.();
    setResistorPlacementWarning(null);
    setWiringMode("component");
  }

  function resetBoard() {
    const shortWasActive = fried;
    pushUndoSnapshot();
    setLeadConnections({ positive: null, negative: null });
    setComponentConnections({});
    setJumperStart(null);
    setJumperConnections([]);
    setResistorPlacementWarning(null);
    setSelectedLead("positive");
    setWiringMode("component");
    setSelectedComponentLead(null);
    setHoveredComponentLead(null);
    setHoveredHole(null);
    setShowFriedNotice(false);
    setSupplyCameraSession(false);
    markTouchedHole(null);
    setShowShortLesson(shortWasActive);
  }

  useEffect(() => {
    if (!fried) {
      setShowFriedNotice(false);
      setShortImpactActive(false);
      shortSoundPlayedRef.current = false;
      return undefined;
    }

    if (!shortSoundPlayedRef.current) {
      shortSoundPlayedRef.current = true;
      onShortSound?.();
    }
    setShortImpactActive(true);
    const impactTimer = window.setTimeout(() => setShortImpactActive(false), 1550);
    const noticeTimer = window.setTimeout(() => setShowFriedNotice(true), 1250);
    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(noticeTimer);
    };
  }, [fried, onShortSound]);

  useEffect(() => {
    setJumperStart(null);
    setHoveredComponentLead(null);
    setHoveredHole(null);
    setResistorPlacementWarning(null);
    setWiringMode("component");
    if (activePart && !jumperToolActive && !activePartIsPlaced) {
      setSelectedComponentLead(defaultLeadForPart(activePart));
    } else {
      setSelectedComponentLead(null);
    }
  }, [activePart, activePartIsPlaced, jumperToolActive]);

  useEffect(() => {
    if (!activePart) {
      onActivePinMapChange({});
    } else {
      const pinMap = Object.fromEntries(
        trainerPartLeads[activePart].map((lead) => {
          const connection = componentConnections[componentLeadKey(activePart, lead.id)];
          return [lead.id, connection ? displayHoleLabel(connection) : "not placed"];
        })
      );
      onActivePinMapChange(pinMap);
    }

    onComponentPinMapChange(componentPinMapFromConnections(componentConnections));
  }, [activePart, componentConnections, onActivePinMapChange, onComponentPinMapChange]);

  useEffect(() => {
    window.__mgeLab = {
      connectLead: (kind, holeId) => {
        const hole = findHoleById(holeId);
        if (!hole) return;
        markTouchedHole(hole);
        if (leadConnections[kind]?.id !== hole.id && blockOccupiedHole(hole, occupiedHoleLabel(hole, { ignoreLeadKind: kind }))) {
          return;
        }
        setResistorPlacementWarning(null);
        setWiringMode("supply");
        setSupplyCameraSession(true);
        setSelectedLead(kind);
        pushUndoSnapshot();
        setLeadConnections((current) => ({ ...current, [kind]: hole }));
        onPlacementSound?.();
      },
      connectComponentLead: (leadId, holeId) => {
        if (!activePart) return;
        const hole = findHoleById(holeId);
        if (!hole) return;
        markTouchedHole(hole);
        const key = componentLeadKey(activePart, leadId);
        if (componentConnections[key]?.id !== hole.id && blockOccupiedHole(hole, occupiedHoleLabel(hole, { ignoreComponentKey: key }))) {
          return;
        }
        setResistorPlacementWarning(null);
        setWiringMode("component");
        setHoveredComponentLead(null);
        pushUndoSnapshot();
        setComponentConnections((current) => ({
          ...current,
          [key]: hole
        }));
        onPlacementSound?.();
        setSelectedComponentLead(
          nextUnplacedLeadForPart(activePart, leadId, {
            ...componentConnections,
            [key]: hole
          })
        );
      },
      connectJumper: (fromHoleId, toHoleId, color) => {
        const from = findHoleById(fromHoleId);
        const to = findHoleById(toHoleId);
        if (!from || !to || from.id === to.id) return;
        markTouchedHole(to);
        const fromOccupant = occupiedHoleLabel(from);
        const toOccupant = occupiedHoleLabel(to);
        if (blockOccupiedHole(from, fromOccupant) || blockOccupiedHole(to, toOccupant)) return;
        setResistorPlacementWarning(null);
        pushUndoSnapshot();
        setJumperConnections((current) => [
          ...current,
          {
            id: `jumper-${Date.now()}-${current.length}`,
            from,
            to,
            color: color ?? inferJumperColor(from, to)
          }
        ]);
        onPlacementSound?.();
      },
      removeLastJumper: () => {
        pushUndoSnapshot();
        setJumperStart(null);
        setJumperConnections((current) => current.slice(0, -1));
      },
      undo: undoLastChange,
      selectPart: onActivePartChange,
      getState: () => ({
        wiringMode,
        selectedLead,
        selectedComponentLead,
        leadConnections: {
          positive: leadConnections.positive?.id ?? null,
          negative: leadConnections.negative?.id ?? null
        },
        componentConnections: Object.fromEntries(
          Object.entries(componentConnections).map(([key, hole]) => [key, hole.id])
        ),
        jumperConnections: jumperConnections.map((jumper) => ({
          from: jumper.from.id,
          to: jumper.to.id,
          color: jumper.color
        })),
        circuit: {
          shorted: circuitSnapshot.hasShort,
          faults: circuitFaultState,
          rails: Object.fromEntries(
            BREADBOARD_HOLES.filter((hole) => hole.railId).map((hole) => [hole.id, circuitSnapshot.energyForNet(hole.netId)])
          ),
          esp32: Object.fromEntries(
            BREADBOARD_HOLES.filter((hole) => hole.id.startsWith("esp32:")).map((hole) => [
              hole.id,
              circuitSnapshot.energyForNet(hole.netId)
            ])
          )
        }
      }),
      exportState: () => ({
        leadConnections: {
          positive: leadConnections.positive?.id ?? null,
          negative: leadConnections.negative?.id ?? null
        },
        componentConnections: Object.fromEntries(
          Object.entries(componentConnections).map(([key, hole]) => [key, hole.id])
        ),
        jumperConnections: jumperConnections.map((jumper) => ({
          from: jumper.from.id,
          to: jumper.to.id,
          color: jumper.color
        }))
      }),
      importState: (state) => {
        pushUndoSnapshot();
        restoreSceneState(state);
      },
      reset: resetBoard
    };

    return () => {
      delete window.__mgeLab;
    };
  });

  return (
    <group>
      <TerminalStrip
        circuitSnapshot={circuitSnapshot}
        selectedHoleIds={selectedHoleIds}
        traceMode={fried ? "idle" : traceMode}
        fried={fried}
        armed={placementArmed}
        onConnect={connectSelectedLead}
        onHoverHole={setHoveredHole}
        hoveredHoleId={hoveredHole?.id ?? null}
      />
      <PowerRails
        circuitSnapshot={circuitSnapshot}
        selectedHoleIds={selectedHoleIds}
        fried={fried}
        armed={placementArmed}
        onConnect={connectSelectedLead}
        onHoverHole={setHoveredHole}
        hoveredHoleId={hoveredHole?.id ?? null}
      />
      <BoardPickSurface
        armed={placementArmed}
        fried={fried}
        onConnect={connectSelectedLead}
        onHoverHole={setHoveredHole}
      />
      <Esp32PinTargets
        selectedHoleIds={selectedHoleIds}
        circuitSnapshot={circuitSnapshot}
        traceMode={fried ? "idle" : traceMode}
        fried={fried}
        armed={placementArmed}
        onConnect={connectSelectedLead}
        onHoverHole={setHoveredHole}
        hoveredHoleId={hoveredHole?.id ?? null}
      />
      <PlacedComponents
        connections={componentConnections}
        potValue={potValue}
        ledOutput={ledOutput}
        buzzerOutput={buzzerOutput}
        ledNoResistorFault={Boolean(circuitFaultState.led_no_resistor)}
        ledReversedFault={Boolean(circuitFaultState.led_reversed)}
        fried={fried}
        partLabels={partLabels}
        highlightedPartId={highlightedPartId}
      />
      <PlacedJumpers
        jumpers={jumperConnections}
        traceMode={fried ? "idle" : traceMode}
        componentConnections={componentConnections}
        potValue={potValue}
        outputLevel={fried ? 0 : ledOutput}
      />
      <SupplyLead
        kind="positive"
        selected={wiringMode === "supply" && selectedLead === "positive" && selectedComponentLead === null}
        connection={leadConnections.positive}
        traceMode={fried ? "idle" : traceMode}
        onSelect={(kind) => {
          setWiringMode("supply");
          setSupplyCameraSession(true);
          setSelectedLead(kind);
          setSelectedComponentLead(null);
          setHoveredComponentLead(null);
        }}
      />
      <SupplyLead
        kind="negative"
        selected={wiringMode === "supply" && selectedLead === "negative" && selectedComponentLead === null}
        connection={leadConnections.negative}
        traceMode={fried ? "idle" : traceMode}
        onSelect={(kind) => {
          setWiringMode("supply");
          setSupplyCameraSession(true);
          setSelectedLead(kind);
          setSelectedComponentLead(null);
          setHoveredComponentLead(null);
        }}
      />
      <ActiveWorkbenchPart
        partId={activePart}
        potValue={potValue}
        selectedLeadId={selectedComponentLead}
        hoveredLeadId={hoveredComponentLead}
        connections={componentConnections}
        placedPartIds={placedPartIds}
        partLabels={partLabels}
        onDone={() => {
          if (activePart) {
            onActivePartChange(null);
          }
          setSelectedComponentLead(null);
          setHoveredComponentLead(null);
          setWiringMode("component");
        }}
        onClearLead={() => {
          setSelectedComponentLead(null);
          setHoveredComponentLead(null);
          setWiringMode("component");
        }}
        onHoverLead={setHoveredComponentLead}
        onSelectLead={(leadId) => {
          setWiringMode("component");
          setSelectedComponentLead(leadId);
          setHoveredComponentLead(null);
        }}
      />
      {fried ? (
        <>
          <FriedSmoke impactActive={shortImpactActive} />
          {showFriedNotice ? <FriedNotice onReset={resetBoard} /> : null}
        </>
      ) : null}
      {!fried && shortRisk ? <ShortRiskCard /> : null}
      {!fried && showShortLesson ? <ShortLessonCard onClose={() => setShowShortLesson(false)} /> : null}
      <BoardText
        label={
          jumperToolActive
            ? jumperStart
              ? `jumper started at ${jumperStart.label} - click destination hole`
              : "jumper tool - click first breadboard hole"
            : removeMode
              ? "remove mode - click placed leads or jumper endpoints"
            : resistorPlacementWarning
              ? resistorPlacementWarning
            : activePart
            ? wiringMode === "supply"
              ? `supply mode - ${selectedLead} lead selected`
              : selectedComponentLead
                ? breadboardPlacementText(activePart, selectedComponentLead, partLabels)
                : "select a component lead, then click any breadboard hole"
            : wiringMode === "supply"
              ? `supply mode - ${selectedLead} lead selected`
              : "select a component or supply lead"
        }
        position={[0, 0.25, -1.62]}
        color="#748086"
        size={0.065}
      />
      {placementArmed || resistorPlacementWarning ? (
        <BenchStatusPanel
          activePart={activePart}
          jumperToolActive={jumperToolActive}
          implicitJumperMode={implicitJumperMode}
          jumperStart={jumperStart}
          placementWarning={resistorPlacementWarning}
          removeMode={removeMode}
          wiringMode={wiringMode}
          selectedLead={selectedLead}
          selectedComponentLead={selectedComponentLead}
          hoveredHole={hoveredHole}
          placementCameraLocked={placementCameraLocked}
          partLabels={partLabels}
        />
      ) : null}
      {placementArmed ? (
        <>
          <LastTouchedHolePulse hole={lastTouchedHole} pulseKey={lastTouchedPulseKey} />
          <TapTargetHelper hoveredHole={hoveredHole} lastTouchedHole={lastTouchedHole} jumperStart={jumperStart} />
        </>
      ) : null}
      {resistorPlacementWarning ? (
        <Html fullscreen style={{ pointerEvents: "none" }}>
          <div className="placement-warning-toast">{resistorPlacementWarning}</div>
        </Html>
      ) : null}
    </group>
  );
}

export function LabScene({
  activePart,
  highlightedPartId,
  checkAnimationActive,
  traceMode,
  placedPartIds,
  availablePartIds,
  jumperColor,
  jumperToolActive,
  removeMode = false,
  ledOutput,
  buzzerOutput,
  potValue,
  courseHighlight,
  partLabels,
  esp32PinLabels,
  usbPowered,
  onActivePartChange,
  onJumperToolSelect,
  onActivePinMapChange,
  onComponentPinMapChange,
  onPotValueChange,
  onCircuitFaultStateChange,
  onCircuitWireStateChange,
  onPlacedPartIdsChange,
  onSupplyPinMapChange,
  onEffectivePotValueChange,
  onHoleSelectSound,
  onPlacementSound,
  onShortSound,
  schematicAvailable = false,
  schematicOpen = false,
  onSchematicToggle
}: {
  activePart: TrainerPartId | null;
  highlightedPartId?: TrainerPartId | null;
  checkAnimationActive: boolean;
  traceMode: CourseTraceMode;
  placedPartIds: Set<TrainerPartId>;
  availablePartIds?: Set<TrainerPartId>;
  jumperColor: string;
  jumperToolActive: boolean;
  removeMode?: boolean;
  ledOutput: number;
  buzzerOutput?: number;
  potValue: number;
  courseHighlight: CourseHighlightTarget | null;
  partLabels?: TrainerPartLabelConfig;
  esp32PinLabels?: Esp32CoursePinLabels;
  usbPowered?: boolean;
  onActivePartChange: (part: TrainerPartId | null) => void;
  onJumperToolSelect: () => void;
  onActivePinMapChange: (pinMap: Record<string, string>) => void;
  onComponentPinMapChange: (pinMap: ComponentPinMap) => void;
  onPotValueChange: (value: number) => void;
  onCircuitFaultStateChange: (faultState: CircuitFaultState) => void;
  onCircuitWireStateChange: (wireState: CircuitWireState) => void;
  onPlacedPartIdsChange: (partIds: Set<TrainerPartId>) => void;
  onSupplyPinMapChange: (pinMap: SupplyPinMap) => void;
  onEffectivePotValueChange?: (value: number, orientation: PotOrientation) => void;
  onHoleSelectSound?: () => void;
  onPlacementSound?: () => void;
  onShortSound?: () => void;
  schematicAvailable?: boolean;
  schematicOpen?: boolean;
  onSchematicToggle?: () => void;
}) {
  const [placementCameraLocked, setPlacementCameraLocked] = useState(false);
  const [cameraView, setCameraView] = useState<CameraView>(() => compactViewportDefaults().view);
  const [cameraZoom, setCameraZoom] = useState(() => compactViewportDefaults().zoom);
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [mobileSceneLayout, setMobileSceneLayout] = useState(() => compactViewportActive());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(cameraZoom);
  const stageRotation = mobileSceneLayout ? MOBILE_STAGE_ROTATION : DESKTOP_STAGE_ROTATION;
  const stageOffset = mobileSceneLayout ? MOBILE_STAGE_OFFSET : DESKTOP_STAGE_OFFSET;
  const padPosition: Vec3 = mobileSceneLayout
    ? [0, -0.03, 0]
    : [0.22 + stageOffset[0], -0.03, stageOffset[2]];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const syncMobileSceneLayout = () => {
      const compact = mediaQuery.matches;
      setMobileSceneLayout(compact);
      if (compact) {
        setCameraView("breadboard");
        setCameraZoom(compactViewportDefaults().zoom);
      }
    };

    syncMobileSceneLayout();
    mediaQuery.addEventListener("change", syncMobileSceneLayout);
    return () => mediaQuery.removeEventListener("change", syncMobileSceneLayout);
  }, []);

  function touchDistance(touches: ReactTouchEvent<HTMLDivElement>["touches"]): number {
    const first = touches[0];
    const second = touches[1];
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  }

  function startPinchZoom(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    pinchStartDistanceRef.current = touchDistance(event.touches);
    pinchStartZoomRef.current = cameraZoom;
  }

  function updatePinchZoom(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchStartDistanceRef.current) return;
    event.preventDefault();
    const nextDistance = touchDistance(event.touches);
    const zoomRatio = nextDistance / pinchStartDistanceRef.current;
    setCameraZoom(clampCameraZoom(pinchStartZoomRef.current * zoomRatio));
  }

  function endPinchZoom(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartZoomRef.current = cameraZoom;
    }
  }

  function resetCamera(view: CameraView = cameraView) {
    setCameraView(view);
    setCameraZoom(compactViewportDefaults().zoom);
    setCameraResetKey((current) => current + 1);
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      data-testid="lab-canvas"
      onTouchStart={startPinchZoom}
      onTouchMove={updatePinchZoom}
      onTouchEnd={endPinchZoom}
      onTouchCancel={endPinchZoom}
    >
      <color attach="background" args={["#11161a"]} />
      <PerspectiveCamera makeDefault position={OVERVIEW_CAMERA_POSITION} fov={38} />
      <CameraRig placementLocked={placementCameraLocked} view={cameraView} zoomLevel={cameraZoom} resetKey={cameraResetKey} />
      <CameraViewPanel
        view={cameraView}
        placementLocked={placementCameraLocked}
        onViewChange={resetCamera}
        onReset={() => resetCamera()}
        schematicAvailable={schematicAvailable}
        schematicOpen={schematicOpen}
        onSchematicToggle={onSchematicToggle}
      />
      <ZoomControlPanel zoomLevel={cameraZoom} onZoomChange={setCameraZoom} />
      <ambientLight intensity={0.76} />
      <directionalLight position={[3.5, 5, 3]} intensity={1.5} castShadow />
      <mesh receiveShadow position={padPosition}>
        <boxGeometry args={mobileSceneLayout ? [4.4, 0.05, 6.6] : [6.9, 0.05, 3.95]} />
        <meshStandardMaterial color="#343a3e" roughness={0.72} />
      </mesh>
      <group position={stageOffset} rotation={stageRotation}>
        <Breadboard
          activePart={activePart}
          highlightedPartId={highlightedPartId}
          checkAnimationActive={checkAnimationActive}
          traceMode={traceMode}
          jumperColor={jumperColor}
          jumperToolActive={jumperToolActive}
          removeMode={removeMode}
          ledOutput={ledOutput}
          buzzerOutput={buzzerOutput}
          potValue={potValue}
          partLabels={partLabels}
          onActivePartChange={onActivePartChange}
          onActivePinMapChange={onActivePinMapChange}
          onComponentPinMapChange={onComponentPinMapChange}
          onPotValueChange={onPotValueChange}
          onCircuitFaultStateChange={onCircuitFaultStateChange}
          onCircuitWireStateChange={onCircuitWireStateChange}
          onPlacedPartIdsChange={onPlacedPartIdsChange}
          onSupplyPinMapChange={onSupplyPinMapChange}
          onEffectivePotValueChange={onEffectivePotValueChange ?? (() => undefined)}
          onPlacementCameraLockChange={setPlacementCameraLocked}
          onHoleSelectSound={onHoleSelectSound}
          onPlacementSound={onPlacementSound}
          onShortSound={onShortSound}
          usbPowered={Boolean(usbPowered)}
        />
        <TrainerBoardParts
          activePart={activePart}
          placedPartIds={placedPartIds}
          availablePartIds={availablePartIds}
          jumperColor={jumperColor}
          jumperToolActive={jumperToolActive}
          highlightedPartId={highlightedPartId}
          potValue={potValue}
          partLabels={partLabels}
          onJumperToolSelect={onJumperToolSelect}
          onSelectPart={onActivePartChange}
        />
        <Esp32BreakoutBoard position={[2.58, 0, 0.05]} coursePinLabels={esp32PinLabels} usbPowered={usbPowered} />
        <CourseHighlight target={courseHighlight} />
      </group>
      <OrbitControls
        enableDamping
        makeDefault
        enabled
        enablePan
        enableRotate
        enableZoom
        target={placementCameraLocked ? BREADBOARD_CAMERA_TARGET : cameraPoseForView(cameraView).target}
      />
    </Canvas>
  );
}
