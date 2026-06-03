export type TrainerPartId =
  | "potentiometer"
  | "led"
  | "resistor"
  | "ldr"
  | "dividerResistor"
  | "button"
  | "buzzerResistor"
  | "buzzer";

export type TrainerPart = {
  id: TrainerPartId;
  label: string;
  inventoryLabel: string;
};

export type TrainerPartLabelConfig = Partial<Record<TrainerPartId, {
  label?: string;
  inventoryLabel?: string;
  placedLabel?: string;
  leads?: Record<string, string>;
}>>;

export const trainerParts: TrainerPart[] = [
  {
    id: "potentiometer",
    label: "10K POT",
    inventoryLabel: "10K potentiometer"
  },
  {
    id: "led",
    label: "LED",
    inventoryLabel: "LED"
  },
  {
    id: "resistor",
    label: "330R",
    inventoryLabel: "330 ohm resistor"
  },
  {
    id: "ldr",
    label: "LDR",
    inventoryLabel: "light sensor / LDR"
  },
  {
    id: "dividerResistor",
    label: "10K",
    inventoryLabel: "10K divider resistor"
  },
  {
    id: "button",
    label: "BTN",
    inventoryLabel: "tactile button"
  },
  {
    id: "buzzerResistor",
    label: "1K",
    inventoryLabel: "1K buzzer resistor"
  },
  {
    id: "buzzer",
    label: "BUZZER",
    inventoryLabel: "Piezo buzzer"
  }
];

export const trainerPartLeads: Record<TrainerPartId, { id: string; label: string }[]> = {
  potentiometer: [
    { id: "gnd", label: "GND outer" },
    { id: "wiper", label: "Wiper" },
    { id: "vcc", label: "3V3 outer" }
  ],
  led: [
    { id: "anode", label: "Long leg / anode +" },
    { id: "cathode", label: "Short leg / cathode -" }
  ],
  resistor: [
    { id: "left", label: "GPIO side" },
    { id: "right", label: "LED side" }
  ],
  ldr: [
    { id: "vcc", label: "3V3 side" },
    { id: "sense", label: "ADC sense side" }
  ],
  dividerResistor: [
    { id: "sense", label: "ADC sense side" },
    { id: "ground", label: "GND side" }
  ],
  button: [
    { id: "gpio", label: "GPIO27 side" },
    { id: "ground", label: "GND side" }
  ],
  buzzerResistor: [
    { id: "gpio", label: "GPIO26 side" },
    { id: "buzzer", label: "Buzzer + side" }
  ],
  buzzer: [
    { id: "positive", label: "Positive +" },
    { id: "negative", label: "Negative -" }
  ]
};

export function partLabelFor(id: TrainerPartId, labels?: TrainerPartLabelConfig): string {
  return labels?.[id]?.label ?? trainerParts.find((part) => part.id === id)?.label ?? id;
}

export function partInventoryLabelFor(id: TrainerPartId, labels?: TrainerPartLabelConfig): string {
  return labels?.[id]?.inventoryLabel ?? trainerParts.find((part) => part.id === id)?.inventoryLabel ?? id;
}

export function partPlacedLabelFor(id: TrainerPartId, labels?: TrainerPartLabelConfig): string {
  return labels?.[id]?.placedLabel ?? partInventoryLabelFor(id, labels);
}

export function partLeadLabelFor(id: TrainerPartId, leadId: string, labels?: TrainerPartLabelConfig): string {
  return labels?.[id]?.leads?.[leadId] ?? trainerPartLeads[id].find((lead) => lead.id === leadId)?.label ?? leadId;
}
