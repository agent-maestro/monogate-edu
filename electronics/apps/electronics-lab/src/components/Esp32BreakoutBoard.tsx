import { Text } from "@react-three/drei";

type Vec3 = [number, number, number];
type Esp32Side = "left" | "right";
export type Esp32CoursePinLabels = Partial<Record<"gpio34" | "gpio35" | "gpio25" | "gpio26" | "gpio27", string>>;

const ESP32_PIN_COUNT = 15;
const ESP32_FIRST_PIN_Z = -0.72;
const ESP32_PIN_PITCH = 0.103;
const ESP32_HEADER_X: Record<Esp32Side, number> = {
  left: -0.36,
  right: 0.36
};

const LEFT_PIN_LABELS = ["EN", "VP", "VN", "34", "35", "32", "33", "25", "26", "27", "14", "12", "13", "GND", "VIN 5V"];
const RIGHT_PIN_LABELS = ["23", "22", "TX0", "RX0", "21", "19", "18", "5", "TX2", "RX2", "4", "2", "15", "GND", "3V3"];

function esp32PinZ(rowIndex: number): number {
  return ESP32_FIRST_PIN_Z + rowIndex * ESP32_PIN_PITCH;
}

function PartBox({
  position,
  scale,
  color,
  emissive = "#000000",
  emissiveIntensity = 0,
  metalness = 0,
  roughness = 0.48
}: {
  position: Vec3;
  scale: Vec3;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={metalness}
        roughness={roughness}
      />
    </mesh>
  );
}

function BoardLabel({
  label,
  position,
  size = 0.035,
  color = "#d7e8e6",
  rotation = [-Math.PI / 2, 0, 0],
  anchorX = "center"
}: {
  label: string;
  position: Vec3;
  size?: number;
  color?: string;
  rotation?: Vec3;
  anchorX?: "left" | "center" | "right";
}) {
  return (
    <Text position={position} rotation={rotation} fontSize={size} color={color} anchorX={anchorX}>
      {label}
    </Text>
  );
}

function MiniBreadboardWing({ side }: { side: Esp32Side }) {
  const sign = side === "left" ? -1 : 1;
  const centerX = sign * 0.59;
  const columnOffsets = [-0.045, 0.045];
  const columnLabels = side === "right" ? ["1", "2"] : ["3", "4"];
  const rowIndexes = Array.from({ length: ESP32_PIN_COUNT }, (_, index) => index);

  return (
    <group>
      <PartBox position={[centerX, 0.052, 0]} scale={[0.22, 0.09, 1.82]} color="#e6e8e2" roughness={0.62} />
      <PartBox position={[centerX, 0.102, 0]} scale={[0.18, 0.008, 1.64]} color="#f2f4ee" roughness={0.7} />
      {columnOffsets.map((offset, index) => (
        <BoardLabel
          key={`${side}-breadboard-column-${columnLabels[index]}`}
          label={columnLabels[index]}
          position={[centerX + offset, 0.126, ESP32_FIRST_PIN_Z - 0.13]}
          size={0.026}
          color="#677175"
        />
      ))}
      {rowIndexes.map((rowIndex) => {
        const z = esp32PinZ(rowIndex);
        return columnOffsets.map((offset) => (
          <group key={`${side}-breadboard-${rowIndex}-${offset}`} position={[centerX + offset, 0.113, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.027, 24]} />
              <meshBasicMaterial color="#cfd7d1" transparent opacity={0.58} />
            </mesh>
            <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.019, 22]} />
              <meshBasicMaterial color="#12191b" />
            </mesh>
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.019, 0.025, 22]} />
              <meshBasicMaterial color="#eef3ef" transparent opacity={0.44} />
            </mesh>
          </group>
        ));
      })}
    </group>
  );
}

function HeaderPins({ side }: { side: Esp32Side }) {
  const labels = side === "left" ? LEFT_PIN_LABELS : RIGHT_PIN_LABELS;

  return (
    <group>
      {Array.from({ length: ESP32_PIN_COUNT }, (_, index) => {
        const z = esp32PinZ(index);
        const label = labels[index] ?? "";
        const isPowerPin = label === "3V3" || label === "VIN 5V";
        const isGroundPin = label === "GND";
        const isSystemPin = label === "EN" || label === "VP" || label === "VN" || label.startsWith("TX") || label.startsWith("RX");
        const padColor = isPowerPin ? "#ff4f65" : isGroundPin ? "#60d394" : isSystemPin ? "#ffe38a" : "#eef4f2";
        const raisedPad = isPowerPin || isGroundPin;
        return (
          <group key={`${side}-${index}`} position={[ESP32_HEADER_X[side], 0, z]}>
            {raisedPad ? (
              <>
                <mesh position={[0, 0.155, 0]} castShadow>
                  <cylinderGeometry args={[0.034, 0.034, 0.01, 24]} />
                  <meshStandardMaterial color={padColor} emissive={padColor} emissiveIntensity={0.06} metalness={0.12} roughness={0.38} />
                </mesh>
                <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.013, 14]} />
                  <meshBasicMaterial color="#071012" />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, 0.149, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.031, 22]} />
                  <meshBasicMaterial color={padColor} transparent opacity={0.94} />
                </mesh>
                <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.031, 0.038, 22]} />
                  <meshBasicMaterial color={padColor} transparent opacity={0.72} />
                </mesh>
                <mesh position={[0, 0.153, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.012, 14]} />
                  <meshBasicMaterial color="#071012" />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function MountHole({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.015, 0.027, 24]} />
        <meshBasicMaterial color="#d5ddde" transparent opacity={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.014, 20]} />
        <meshBasicMaterial color="#050708" />
      </mesh>
    </group>
  );
}

function SmdPart({ position, scale = [0.07, 0.018, 0.035], color = "#c0c8c9" }: { position: Vec3; scale?: Vec3; color?: string }) {
  return <PartBox position={position} scale={scale} color={color} metalness={0.22} roughness={0.34} />;
}

function PushButton({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <PartBox position={[0, 0, 0]} scale={[0.13, 0.044, 0.105]} color="#d9dedf" metalness={0.22} roughness={0.28} />
      <PartBox position={[0, 0.034, 0]} scale={[0.07, 0.026, 0.058]} color="#6f7779" roughness={0.34} />
    </group>
  );
}

function PowerLed({ usbPowered }: { usbPowered: boolean }) {
  const ledPosition: Vec3 = [0, 0.174, 0.16];
  const packageColor = usbPowered ? "#3a161b" : "#2b1719";
  const lensColor = usbPowered ? "#ff5366" : "#5a242a";
  const hotSpotColor = usbPowered ? "#ffd0d7" : "#3a171c";

  return (
    <group>
      <PartBox
        position={ledPosition}
        scale={[0.092, 0.018, 0.052]}
        color={packageColor}
        emissive={usbPowered ? "#ff2639" : "#000000"}
        emissiveIntensity={usbPowered ? 0.18 : 0}
        roughness={0.22}
      />
      <mesh position={[ledPosition[0], ledPosition[1] + 0.013, ledPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 0.035]} />
        <meshBasicMaterial color={lensColor} transparent opacity={usbPowered ? 0.9 : 0.68} />
      </mesh>
      <mesh position={[ledPosition[0], ledPosition[1] + 0.014, ledPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.036, 0.019]} />
        <meshBasicMaterial color={hotSpotColor} transparent opacity={usbPowered ? 0.82 : 0.28} />
      </mesh>
      <BoardLabel label="PWR" position={[0, 0.216, 0.045]} size={0.034} color={usbPowered ? "#ffd4da" : "#f1e8d6"} />
      <SmdPart position={[0.15, 0.174, 0.18]} scale={[0.072, 0.016, 0.044]} color="#e4e8e8" />
    </group>
  );
}

function UsbC() {
  return (
    <group>
      <PartBox position={[0, 0.18, 0.87]} scale={[0.24, 0.075, 0.13]} color="#cbd4d6" metalness={0.5} roughness={0.22} />
      <PartBox position={[0, 0.215, 0.93]} scale={[0.16, 0.028, 0.04]} color="#6f7779" metalness={0.34} roughness={0.24} />
    </group>
  );
}

function EspModule() {
  return (
    <group>
      <PartBox position={[0, 0.18, -0.32]} scale={[0.45, 0.072, 0.54]} color="#b4bec0" metalness={0.58} roughness={0.24} />
      <PartBox position={[0, 0.222, -0.32]} scale={[0.38, 0.012, 0.43]} color="#7c888b" metalness={0.62} roughness={0.18} />
      <PartBox position={[0, 0.182, -0.75]} scale={[0.38, 0.048, 0.18]} color="#0b0f11" roughness={0.4} />
    </group>
  );
}

export function Esp32BreakoutBoard({
  position = [0, 0, 0],
  usbPowered = false
}: {
  position?: Vec3;
  coursePinLabels?: Esp32CoursePinLabels;
  usbPowered?: boolean;
}) {
  return (
    <group position={position} rotation={[0, 0, 0]}>
      <MiniBreadboardWing side="left" />
      <MiniBreadboardWing side="right" />

      <PartBox position={[0, 0.086, 0]} scale={[0.78, 0.086, 1.9]} color="#080b0d" roughness={0.58} />
      <PartBox position={[0, 0.134, 0]} scale={[0.68, 0.02, 1.74]} color="#101719" roughness={0.44} />

      <MountHole position={[-0.27, 0.151, -0.78]} />
      <MountHole position={[0.27, 0.151, -0.78]} />
      <MountHole position={[-0.27, 0.151, 0.78]} />
      <MountHole position={[0.27, 0.151, 0.78]} />

      <HeaderPins side="left" />
      <HeaderPins side="right" />
      <EspModule />
      <PowerLed usbPowered={usbPowered} />
      <UsbC />

      <PushButton position={[-0.22, 0.178, 0.72]} />
      <PushButton position={[0.22, 0.178, 0.72]} />
      <PartBox position={[-0.15, 0.169, 0.42]} scale={[0.17, 0.044, 0.16]} color="#20282b" />
      <PartBox position={[0.13, 0.169, 0.42]} scale={[0.18, 0.044, 0.2]} color="#151c1f" />

      {[-0.16, 0, 0.16].map((x, index) => (
        <SmdPart key={`lower-smd-${x}`} position={[x, 0.177, 0.39 + index * 0.06]} scale={[0.055, 0.018, 0.03]} />
      ))}
      {[-0.19, -0.07, 0.05, 0.17].map((x) => (
        <SmdPart key={`module-smd-${x}`} position={[x, 0.176, -0.02]} scale={[0.05, 0.016, 0.03]} color="#d0d6d7" />
      ))}

    </group>
  );
}
