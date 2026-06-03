import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import * as THREE from "three";
import { partLabelFor, type TrainerPartId, type TrainerPartLabelConfig } from "./trainerPartCatalog";

type Vec3 = [number, number, number];

const RESISTOR_330R_BANDS = [
  { x: -0.075, color: "#f47b20" },
  { x: -0.02, color: "#f47b20" },
  { x: 0.035, color: "#4a2713" },
  { x: 0.095, color: "#d1a83b" }
] as const;
export const RESISTOR_1K_BANDS = [
  { x: -0.105, color: "#6b3f20" },
  { x: -0.055, color: "#1b1110" },
  { x: -0.005, color: "#1b1110" },
  { x: 0.045, color: "#6b3f20" },
  { x: 0.105, color: "#6b3f20" }
] as const;
export const RESISTOR_10K_BANDS = [
  { x: -0.105, color: "#6b3f20" },
  { x: -0.055, color: "#1b1110" },
  { x: -0.005, color: "#f47b20" },
  { x: 0.045, color: "#d1a83b" }
] as const;
type ResistorBand = { x: number; color: string };

function PartLabel({
  label,
  position,
  active = false,
  flipped = false
}: {
  label: string;
  position: Vec3;
  active?: boolean;
  flipped?: boolean;
}) {
  if (!label) return null;

  return (
    <Text
      position={position}
      rotation={[-Math.PI / 2, flipped ? Math.PI : 0, 0]}
      fontSize={active ? 0.074 : 0.052}
      color={active ? "#fff2a6" : "#edf7f4"}
    >
      {label}
    </Text>
  );
}

function PartBox({
  position,
  scale,
  color,
  metalness = 0,
  roughness = 0.45
}: {
  position: Vec3;
  scale: Vec3;
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function LeadPin({
  position,
  length = 0.22,
  highlighted = false,
  color = "#c8c3ad"
}: {
  position: Vec3;
  length?: number;
  highlighted?: boolean;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, length, 10]} />
      <meshStandardMaterial
        color={highlighted ? "#fff2a6" : color}
        emissive={highlighted ? "#fff2a6" : "#000000"}
        emissiveIntensity={highlighted ? 0.86 : 0}
        metalness={0.45}
        roughness={0.26}
      />
    </mesh>
  );
}

export function Potentiometer({
  position,
  value = 0.55,
  highlightedLeadId = null,
  label = "10K POT",
  flipLabel = false
}: {
  position: Vec3;
  value?: number;
  highlightedLeadId?: string | null;
  label?: string;
  flipLabel?: boolean;
}) {
  const knobAngle = -Math.PI * 0.72 + value * Math.PI * 1.44;
  const leadIds = ["gnd", "wiper", "vcc"];

  return (
    <group position={position} rotation={[0, -0.12, 0]}>
      <PartBox position={[0, 0.075, 0]} scale={[0.38, 0.09, 0.3]} color="#2e3335" />
      <mesh position={[0, 0.163, 0]} castShadow>
        <cylinderGeometry args={[0.118, 0.118, 0.075, 32]} />
        <meshStandardMaterial color="#356472" roughness={0.32} />
      </mesh>
      <group position={[0, 0.204, 0]} rotation={[0, knobAngle, 0]}>
        <mesh position={[0, 0, -0.038]} castShadow>
          <boxGeometry args={[0.016, 0.006, 0.11]} />
          <meshStandardMaterial color="#20282a" roughness={0.3} />
        </mesh>
      </group>
      {[-0.11, 0, 0.11].map((x, index) => (
        <LeadPin key={x} position={[x, 0.048, 0.24]} highlighted={highlightedLeadId === leadIds[index]} />
      ))}
      <PartLabel label={label} position={[0, 0.18, -0.24]} flipped={flipLabel} />
    </group>
  );
}

export function Led({
  position,
  highlightedLeadId = null,
  label = "LED"
}: {
  position: Vec3;
  highlightedLeadId?: string | null;
  label?: string;
}) {
  const ledHighlighted = highlightedLeadId === "anode";

  return (
    <group position={position} rotation={[0, 0.18, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.095, 28, 18]} />
        <meshStandardMaterial
          color="#ff4152"
          emissive="#ff1e37"
          emissiveIntensity={ledHighlighted ? 0.82 : 0.28}
          transparent
          opacity={ledHighlighted ? 0.9 : 0.78}
          roughness={0.12}
        />
      </mesh>
      <LeadPin position={[-0.04, 0.05, 0.24]} length={0.32} highlighted={highlightedLeadId === "anode"} />
      <LeadPin position={[0.05, 0.05, 0.24]} length={0.25} highlighted={highlightedLeadId === "cathode"} />
      <PartLabel label={label} position={[0, 0.18, -0.24]} />
    </group>
  );
}

export function Resistor({
  position,
  highlightedLeadId = null,
  label = "330R",
  bands = RESISTOR_330R_BANDS
}: {
  position: Vec3;
  highlightedLeadId?: string | null;
  label?: string;
  bands?: readonly ResistorBand[];
}) {
  const body = new THREE.Vector3(0, 0, 0);

  return (
    <group position={position} rotation={[0, -0.35, 0]}>
      <mesh position={body.toArray() as Vec3} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.32, 24]} />
        <meshStandardMaterial color="#d5b16c" roughness={0.36} />
      </mesh>
      {bands.map((band) => (
        <mesh key={`${band.x}-${band.color}`} position={[band.x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.047, 0.047, 0.018, 20]} />
          <meshStandardMaterial color={band.color} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 10]} />
        <meshStandardMaterial
          color={highlightedLeadId === "left" ? "#fff2a6" : "#c8c3ad"}
          emissive={highlightedLeadId === "left" ? "#fff2a6" : "#000000"}
          emissiveIntensity={highlightedLeadId === "left" ? 0.86 : 0}
          metalness={0.45}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 10]} />
        <meshStandardMaterial
          color={highlightedLeadId === "right" ? "#fff2a6" : "#c8c3ad"}
          emissive={highlightedLeadId === "right" ? "#fff2a6" : "#000000"}
          emissiveIntensity={highlightedLeadId === "right" ? 0.86 : 0}
          metalness={0.45}
          roughness={0.26}
        />
      </mesh>
      <PartLabel label={label} position={[0, 0.105, -0.18]} />
    </group>
  );
}

export function Buzzer({
  position,
  highlightedLeadId = null,
  label = "BUZZER"
}: {
  position: Vec3;
  highlightedLeadId?: string | null;
  label?: string;
}) {
  return (
    <group position={position} rotation={[0, -0.18, 0]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.1, 34]} />
        <meshStandardMaterial color="#20272a" roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.094, 34]} />
        <meshStandardMaterial color="#121719" roughness={0.38} />
      </mesh>
      <BoardBuzzerMark />
      <LeadPin position={[-0.055, 0.05, 0.22]} length={0.28} highlighted={highlightedLeadId === "positive"} color="#d5c585" />
      <LeadPin position={[0.055, 0.05, 0.22]} length={0.28} highlighted={highlightedLeadId === "negative"} />
      <PartLabel label={label} position={[0, 0.18, -0.22]} />
    </group>
  );
}

export function TactileButton({
  position,
  highlightedLeadId = null,
  label = "BTN"
}: {
  position: Vec3;
  highlightedLeadId?: string | null;
  label?: string;
}) {
  return (
    <group position={position} rotation={[0, 0.18, 0]}>
      <PartBox position={[0, 0.08, 0]} scale={[0.28, 0.08, 0.28]} color="#2a3032" />
      <PartBox position={[0, 0.15, 0]} scale={[0.16, 0.045, 0.16]} color="#c8d0cc" metalness={0.1} roughness={0.28} />
      <LeadPin position={[-0.09, 0.045, 0.2]} length={0.24} highlighted={highlightedLeadId === "gpio"} color="#fff2a6" />
      <LeadPin position={[0.09, 0.045, 0.2]} length={0.24} highlighted={highlightedLeadId === "ground"} color="#9debbf" />
      <PartLabel label={label} position={[0, 0.18, -0.22]} />
    </group>
  );
}

export function Ldr({
  position,
  highlightedLeadId = null,
  label = "LDR"
}: {
  position: Vec3;
  highlightedLeadId?: string | null;
  label?: string;
}) {
  const traceSegments: { position: Vec3; scale: Vec3 }[] = [
    { position: [-0.055, 0.174, 0], scale: [0.014, 0.006, 0.152] as Vec3 },
    { position: [-0.022, 0.174, 0], scale: [0.014, 0.006, 0.152] as Vec3 },
    { position: [0.011, 0.174, 0], scale: [0.014, 0.006, 0.152] as Vec3 },
    { position: [0.044, 0.174, 0], scale: [0.014, 0.006, 0.152] as Vec3 },
    { position: [-0.0385, 0.174, -0.076], scale: [0.047, 0.006, 0.014] as Vec3 },
    { position: [-0.0055, 0.174, 0.076], scale: [0.047, 0.006, 0.014] as Vec3 },
    { position: [0.0275, 0.174, -0.076], scale: [0.047, 0.006, 0.014] as Vec3 },
    { position: [0.0605, 0.174, 0.076], scale: [0.047, 0.006, 0.014] as Vec3 }
  ];

  return (
    <group position={position} rotation={[0, -0.16, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.122, 0.122, 0.032, 48]} />
        <meshStandardMaterial color="#9b321e" roughness={0.34} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.168, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.107, 48]} />
        <meshStandardMaterial color="#d8c893" roughness={0.42} />
      </mesh>
      {traceSegments.map((segment, index) => (
        <mesh key={index} position={segment.position}>
          <boxGeometry args={segment.scale} />
          <meshStandardMaterial color="#b63a24" emissive="#6f1e16" emissiveIntensity={0.1} roughness={0.3} />
        </mesh>
      ))}
      <LeadPin position={[-0.06, 0.045, 0.2]} length={0.28} highlighted={highlightedLeadId === "vcc"} color="#d7d3bd" />
      <LeadPin position={[0.06, 0.045, 0.2]} length={0.28} highlighted={highlightedLeadId === "sense"} color="#d7d3bd" />
      <PartLabel label={label} position={[0, 0.2, -0.22]} />
    </group>
  );
}

function PartAttentionPulse({
  active,
  position = [0, 0.022, 0],
  radius = 0.22,
  color = "#fff2a6"
}: {
  active: boolean;
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
      <pointLight position={[0, 0.15, 0]} color={color} intensity={0.85} distance={0.65} />
    </group>
  );
}

function BoardBuzzerMark() {
  return (
    <Text position={[-0.042, 0.222, -0.024]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.052} color="#ffd45f">
      +
    </Text>
  );
}

function JumperWireModel({
  color,
  zOffset,
  xOffset,
  height
}: {
  color: string;
  zOffset: number;
  xOffset: number;
  height: number;
}) {
  const start = new THREE.Vector3(-0.31 + xOffset, 0.08, 0.12 + zOffset);
  const end = new THREE.Vector3(0.31 + xOffset, 0.08, -0.12 + zOffset);
  const mid = new THREE.Vector3(xOffset * 0.26, height, 0.18 + zOffset * 0.28);
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const geometry = new THREE.TubeGeometry(curve, 36, 0.01, 9, false);

  return (
    <>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} roughness={0.34} />
      </mesh>
      <PartBox position={[start.x - 0.03, start.y, start.z + 0.012]} scale={[0.075, 0.036, 0.04]} color={color} />
      <PartBox position={[end.x + 0.03, end.y, end.z - 0.012]} scale={[0.075, 0.036, 0.04]} color={color} />
      <PartBox position={[start.x - 0.08, start.y, start.z + 0.012]} scale={[0.055, 0.012, 0.012]} color="#cfd8d6" metalness={0.3} />
      <PartBox position={[end.x + 0.08, end.y, end.z - 0.012]} scale={[0.055, 0.012, 0.012]} color="#cfd8d6" metalness={0.3} />
    </>
  );
}

function JumperBundle({ position, color, active = false }: { position: Vec3; color: string; active?: boolean }) {
  const colors = Array.from(new Set(["#ff5468", color, "#54a8ff", "#ffd45f", "#1f2427"])).slice(0, 4);

  return (
    <group position={position}>
      {colors.map((wireColor, index) => (
        <JumperWireModel
          key={`${wireColor}-${index}`}
          color={wireColor}
          zOffset={(index - 1.5) * 0.085}
          xOffset={(index % 2 === 0 ? -1 : 1) * 0.035}
          height={0.25 + index * 0.025}
        />
      ))}
      <PartLabel label="JUMPERS" position={[0, active ? 0.205 : 0.18, -0.28]} active={active} />
    </group>
  );
}

function SelectableJumperBundle({
  position,
  color,
  active,
  onSelect
}: {
  position: Vec3;
  color: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <group>
      <mesh
        position={[position[0], position[1] + 0.11, position[2]]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[0.72, 0.36, 0.58]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <JumperBundle position={position} color={color} active={active} />
    </group>
  );
}

function SelectableTrayItem({
  partId,
  position,
  size,
  highlighted = false,
  activePart,
  placedPartIds,
  onSelectPart,
  children
}: {
  partId: TrainerPartId;
  position: Vec3;
  size: Vec3;
  highlighted?: boolean;
  activePart: TrainerPartId | null;
  placedPartIds: Set<TrainerPartId>;
  onSelectPart: (part: TrainerPartId) => void;
  children: ReactNode;
}) {
  if (activePart === partId || placedPartIds.has(partId)) return null;

  return (
    <group>
      <mesh
        position={position}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelectPart(partId);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <PartAttentionPulse active={highlighted} position={[position[0], position[1] + 0.035, position[2]]} />
      {children}
    </group>
  );
}

export function TrainerBoardParts({
  activePart,
  placedPartIds,
  availablePartIds,
  jumperColor,
  jumperToolActive,
  highlightedPartId = null,
  potValue,
  partLabels,
  onJumperToolSelect,
  onSelectPart
}: {
  activePart: TrainerPartId | null;
  placedPartIds: Set<TrainerPartId>;
  availablePartIds?: Set<TrainerPartId>;
  jumperColor: string;
  jumperToolActive: boolean;
  highlightedPartId?: TrainerPartId | null;
  potValue: number;
  partLabels?: TrainerPartLabelConfig;
  onJumperToolSelect: () => void;
  onSelectPart: (part: TrainerPartId) => void;
}) {
  const buzzerUpgradeUnlocked = availablePartIds?.has("buzzer") === true || availablePartIds?.has("buzzerResistor") === true;
  const analogSensorUnlocked = availablePartIds?.has("ldr") === true || availablePartIds?.has("dividerResistor") === true;
  const trayPotPosition: Vec3 = [-0.38, 0.14, -0.45];
  const trayPotModelPosition: Vec3 = [-0.38, 0.045, -0.45];
  const trayJumperPosition: Vec3 = [-0.04, 0.07, 0.86];
  const ldrPosition: Vec3 = [0.38, 0.17, 0.42];
  const ldrModelPosition: Vec3 = [0.38, 0.045, 0.42];
  const dividerResistorPosition: Vec3 = [-0.42, 0.17, 0.42];
  const dividerResistorModelPosition: Vec3 = [-0.42, 0.15, 0.42];
  const buzzerResistorPosition: Vec3 = placedPartIds.has("resistor") ? [0.02, 0.16, -0.02] : [-0.42, 0.17, 0.68];
  const buzzerResistorModelPosition: Vec3 = placedPartIds.has("resistor") ? [0.02, 0.14, -0.02] : [-0.42, 0.15, 0.68];
  const buzzerPosition: Vec3 = placedPartIds.has("led") ? [0.35, 0.16, -0.45] : [0.4, 0.17, 0.66];
  const buzzerModelPosition: Vec3 = placedPartIds.has("led") ? [0.35, 0.045, -0.45] : [0.4, 0.06, 0.66];
  const buttonPosition: Vec3 = placedPartIds.has("resistor") ? [-0.42, 0.16, 0.34] : [0.38, 0.16, 0.24];
  const buttonModelPosition: Vec3 = placedPartIds.has("resistor") ? [-0.42, 0.07, 0.34] : [0.38, 0.07, 0.24];

  return (
    <group position={[-2.25, 0, 0.18]}>
      <PartBox position={[0, 0.015, buzzerUpgradeUnlocked || analogSensorUnlocked ? 0.12 : 0]} scale={[1.32, 0.03, buzzerUpgradeUnlocked || analogSensorUnlocked ? 2.38 : 1.98]} color="#1c2427" />
      <PartLabel label="PARTS TRAY" position={[0, 0.07, buzzerUpgradeUnlocked || analogSensorUnlocked ? -1.18 : -1.08]} />
      {availablePartIds?.has("potentiometer") === false ? null : <SelectableTrayItem
        partId="potentiometer"
        position={trayPotPosition}
        size={[0.48, 0.28, 0.48]}
        highlighted={highlightedPartId === "potentiometer"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Potentiometer position={trayPotModelPosition} value={potValue} label={partLabelFor("potentiometer", partLabels)} />
      </SelectableTrayItem>}
      {availablePartIds?.has("led") === false ? null : <SelectableTrayItem
        partId="led"
        position={[0.35, 0.16, -0.45]}
        size={[0.42, 0.32, 0.5]}
        highlighted={highlightedPartId === "led"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Led position={[0.35, 0.045, -0.45]} label={partLabelFor("led", partLabels)} />
      </SelectableTrayItem>}
      {availablePartIds?.has("resistor") === false ? null : <SelectableTrayItem
        partId="resistor"
        position={[0.02, 0.16, -0.02]}
        size={[0.75, 0.2, 0.34]}
        highlighted={highlightedPartId === "resistor"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Resistor position={[0.02, 0.14, -0.02]} label={partLabelFor("resistor", partLabels)} />
      </SelectableTrayItem>}
      {availablePartIds?.has("buzzerResistor") === false ? null : <SelectableTrayItem
        partId="buzzerResistor"
        position={buzzerResistorPosition}
        size={[0.68, 0.2, 0.32]}
        highlighted={highlightedPartId === "buzzerResistor"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Resistor
          position={buzzerResistorModelPosition}
          label={partLabelFor("buzzerResistor", partLabels)}
          bands={RESISTOR_1K_BANDS}
        />
      </SelectableTrayItem>}
      {availablePartIds?.has("dividerResistor") === false ? null : <SelectableTrayItem
        partId="dividerResistor"
        position={dividerResistorPosition}
        size={[0.68, 0.2, 0.32]}
        highlighted={highlightedPartId === "dividerResistor"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Resistor
          position={dividerResistorModelPosition}
          label={partLabelFor("dividerResistor", partLabels)}
          bands={RESISTOR_10K_BANDS}
        />
      </SelectableTrayItem>}
      {availablePartIds?.has("ldr") === false ? null : <SelectableTrayItem
        partId="ldr"
        position={ldrPosition}
        size={[0.44, 0.28, 0.44]}
        highlighted={highlightedPartId === "ldr"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Ldr position={ldrModelPosition} label={partLabelFor("ldr", partLabels)} />
      </SelectableTrayItem>}
      {availablePartIds?.has("button") === false ? null : <SelectableTrayItem
        partId="button"
        position={buttonPosition}
        size={[0.42, 0.24, 0.42]}
        highlighted={highlightedPartId === "button"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <TactileButton position={buttonModelPosition} label={partLabelFor("button", partLabels)} />
      </SelectableTrayItem>}
      {availablePartIds?.has("buzzer") === false ? null : <SelectableTrayItem
        partId="buzzer"
        position={buzzerPosition}
        size={[0.42, 0.28, 0.42]}
        highlighted={highlightedPartId === "buzzer"}
        activePart={activePart}
        placedPartIds={placedPartIds}
        onSelectPart={onSelectPart}
      >
        <Buzzer position={buzzerModelPosition} label={partLabelFor("buzzer", partLabels)} />
      </SelectableTrayItem>}
      <SelectableJumperBundle
        position={trayJumperPosition}
        color={jumperColor}
        active={jumperToolActive}
        onSelect={onJumperToolSelect}
      />
    </group>
  );
}
