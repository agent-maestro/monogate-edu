import type { CSSProperties, PointerEventHandler } from "react";
import { Minimize2, X } from "lucide-react";
import {
  partInventoryLabelFor,
  partLabelFor,
  partLeadLabelFor,
  partPlacedLabelFor,
  trainerPartLeads,
  trainerParts,
  type TrainerPartId,
  type TrainerPartLabelConfig
} from "./trainerPartCatalog";

const jumperColors = [
  { name: "red", value: "#ff5468" },
  { name: "blue", value: "#54a8ff" },
  { name: "yellow", value: "#ffd45f" },
  { name: "green", value: "#60d394" },
  { name: "black", value: "#1f2427" },
  { name: "white", value: "#f2f0df" }
] as const;

export function InventoryPanel({
  activePart,
  placedPartIds,
  availablePartIds,
  activePinMap,
  jumperColor,
  jumperToolActive,
  potValue,
  highlightedPart,
  ariaLabel = "Reflex Course inventory",
  kicker = "Reflex Course",
  title = "Bench Inventory",
  kitItems = ["Breadboard 25-row trainer layout", "ESP32 ESP-32S + 30P breakout"],
  wiringReference = [
    ["ESP32 GND", "chosen ground rail"],
    ["ESP32 3V3", "chosen 3V3 rail"],
    ["Pot GND outer", "ground bus"],
    ["Pot wiper", "GPIO34 POT"],
    ["Pot 3V3 outer", "3V3 bus"],
    ["GPIO25 LED", "either resistor lead"],
    ["other resistor lead", "LED anode +"],
    ["LED cathode -", "ground bus"]
  ],
  partLabels,
  potControlLabel = "Pot knob",
  placedPotControlLabel = "Pot control",
  potSliderAriaLabel = "Potentiometer value",
  showPotControl = true,
  onActivePartChange,
  onJumperColorChange,
  onJumperToolSelect,
  onPotValueChange,
  onClose,
  onMinimize,
  style,
  onDragStart,
  onResizeStart
}: {
  activePart: TrainerPartId | null;
  placedPartIds: Set<TrainerPartId>;
  availablePartIds?: Set<TrainerPartId>;
  activePinMap: Record<string, string>;
  jumperColor: string;
  jumperToolActive: boolean;
  potValue: number;
  highlightedPart: TrainerPartId | null;
  ariaLabel?: string;
  kicker?: string;
  title?: string;
  kitItems?: string[];
  wiringReference?: [string, string][];
  partLabels?: TrainerPartLabelConfig;
  potControlLabel?: string;
  placedPotControlLabel?: string;
  potSliderAriaLabel?: string;
  showPotControl?: boolean;
  onActivePartChange: (part: TrainerPartId) => void;
  onJumperColorChange: (color: string) => void;
  onJumperToolSelect: () => void;
  onPotValueChange: (value: number) => void;
  onClose: () => void;
  onMinimize: () => void;
  style?: CSSProperties;
  onDragStart?: PointerEventHandler<HTMLButtonElement>;
  onResizeStart?: PointerEventHandler<HTMLButtonElement>;
}) {
  return (
    <aside className="inventory-panel" style={style} aria-label={ariaLabel}>
      {onDragStart ? (
        <button type="button" className="panel-drag-handle" aria-label="Move bench inventory panel" onPointerDown={onDragStart}>
          Move
        </button>
      ) : null}
      <div className="panel-window-actions">
        <button type="button" aria-label="Minimize bench inventory panel" onClick={onMinimize}>
          <Minimize2 aria-hidden="true" />
        </button>
        <button type="button" aria-label="Hide bench inventory panel" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div>
        <p className="inventory-kicker">{kicker}</p>
        <h1>{title}</h1>
      </div>
      <ul>
        {kitItems.map((item) => (
          <li className="inventory-kit-item" key={item}>{item}</li>
        ))}
        {trainerParts.filter((part) => availablePartIds?.has(part.id) !== false).map((part) => (
          <li className="inventory-tool-item" key={part.id}>
            {placedPartIds.has(part.id) ? (
              <span className="inventory-part is-placed">{partPlacedLabelFor(part.id, partLabels)}: placed</span>
            ) : (
              <button
                type="button"
                className={[
                  "inventory-part",
                  activePart === part.id ? "is-active" : "",
                  highlightedPart === part.id ? "is-highlighted" : ""
                ].filter(Boolean).join(" ")}
                onClick={() => onActivePartChange(part.id)}
              >
                {partInventoryLabelFor(part.id, partLabels)}
              </button>
            )}
          </li>
        ))}
        <li className="inventory-tool-item">
          <button
            type="button"
            className={jumperToolActive ? "inventory-part is-active" : "inventory-part"}
            onClick={onJumperToolSelect}
          >
            <span className="inventory-jumper-copy">Jumper wires: unlimited</span>
            <span className="inventory-jumper-stack" aria-hidden="true">
              <i style={{ "--jumper": "#ff5468" } as CSSProperties} />
              <i style={{ "--jumper": "#54a8ff" } as CSSProperties} />
              <i style={{ "--jumper": "#ffd45f" } as CSSProperties} />
            </span>
          </button>
        </li>
      </ul>
      <div className="active-part-readout">
        <strong>
          Active tool: {activePart ? partLabelFor(activePart, partLabels) : jumperToolActive ? "Jumper wire" : "none"}
        </strong>
        {activePart ? (
          <div className="pin-readout-list">
            {trainerPartLeads[activePart].map((lead) => (
              <span key={lead.id}>
                {partLeadLabelFor(activePart, lead.id, partLabels)}: {activePinMap[lead.id] ?? "not placed"}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <details className="wiring-reference">
        <summary>Quick wiring reference</summary>
        <ol>
          {wiringReference.map(([label, value]) => (
            <li key={`${label}-${value}`}><span>{label}</span><strong>{value}</strong></li>
          ))}
        </ol>
      </details>
      {showPotControl && (placedPartIds.has("potentiometer") || activePart === "potentiometer") ? (
        <div className="pot-control">
          <div className="pot-control-header">
            <span>{placedPartIds.has("potentiometer") ? placedPotControlLabel : potControlLabel}</span>
            <strong>{potValue.toFixed(2)}</strong>
          </div>
          <input
            aria-label={potSliderAriaLabel}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={potValue}
            onChange={(event) => onPotValueChange(Number(event.currentTarget.value))}
          />
        </div>
      ) : null}
      <div className="jumper-picker" aria-label="Jumper wire color">
        <span>Jumper color</span>
        <div className="color-row">
          {jumperColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className={color.value === jumperColor ? "color-swatch is-selected" : "color-swatch"}
              style={{ "--swatch": color.value } as CSSProperties}
              aria-label={`${color.name} jumper wire`}
              onClick={() => onJumperColorChange(color.value)}
            />
          ))}
        </div>
      </div>
      {onResizeStart ? (
        <button type="button" className="panel-resize-handle" aria-label="Resize bench inventory panel" onPointerDown={onResizeStart} />
      ) : null}
    </aside>
  );
}
