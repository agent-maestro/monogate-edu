import type { CourseStep, CourseProgressState } from "./CoursePanel";
import type { Esp32CoursePinLabels } from "./Esp32BreakoutBoard";
import type { TrainerPartId, TrainerPartLabelConfig } from "./trainerPartCatalog";
import type { WireId } from "../engine/labEngine";

export type SimulatorCourseId = "reflex" | "analog-decision" | "environment-guard" | "optimization-boundary";

export type SimulatorCourseConfig = {
  id: SimulatorCourseId;
  benchLoadedPayload: { course: string; mode: string };
  backTargetLabel: string;
  defaultBoardMessage: string;
  checkingStatusLabel: string;
  usbInsertedStatusLabel: string;
  idleStatusLabel: string;
  checkMessages: {
    start: string;
    middle: string;
    output: string;
    passed: string;
    fallbackBlocked: string;
    usbRunning: string;
    usbBlocked: string;
    wireRemoved: string;
  };
  parts?: {
    labels?: TrainerPartLabelConfig;
    esp32PinLabels?: Esp32CoursePinLabels;
  };
  coursePanel: {
    headerKicker: string;
    headerTitle: string;
    activeCardLabel: string;
    activeCardTitle: string;
    upcomingCard?: { label: string; title: string; detail: string; ariaLabel?: string } | null;
    futureCards?: { label: string; title: string; detail: string }[];
    previewKernel: string;
    previewTitle: string;
    usbNote: string;
    steps: CourseStep[];
    releaseChecks?: CourseReleaseCheck[];
  };
  inventory: {
    ariaLabel: string;
    kicker: string;
    title: string;
    kitItems: string[];
    wiringReference: [string, string][];
    potControlLabel: string;
    placedPotControlLabel: string;
  };
  dashboard: {
    kicker: string;
    title: string;
    variant?: "full" | "reflex-live-popup";
  };
  schematic?: CourseSchematicConfig;
  capstone: {
    ariaLabel: string;
    readoutLabel: string;
    waitingKernel: string;
    liveKernel: string;
    checkButton: string;
    insertButton: string;
    removeButton: string;
    refreshButton: string;
    dockLabel: string;
  };
};

export type CourseSchematicConfig = {
  kicker: string;
  title: string;
  description: string;
  branches: CourseSchematicBranch[];
};

export type CourseSchematicBranch = {
  id: string;
  label: string;
  detail: string;
  teachingNote: string;
  from: string;
  to: string;
  kind: "power" | "input" | "output";
  wireIds?: WireId[];
  partIds?: TrainerPartId[];
};

export type CourseReleaseCheck = {
  id: string;
  title: string;
  detail: string;
  owner: "builder" | "agent" | "both";
};

function hasPlacedPart(state: CourseProgressState, partId: TrainerPartId): boolean {
  return (
    state.placedPartIds.has(partId) ||
    Object.values(state.componentPinMap[partId]).every((label) => label !== "not placed")
  );
}

function hasSupply(state: CourseProgressState, kind: keyof CourseProgressState["supplyPinMap"]): boolean {
  return Boolean(state.supplyPinMap[kind]);
}

function hasWire(state: CourseProgressState, wire: WireId): boolean {
  return Boolean(state.wireState[wire]);
}

function baseReady(state: CourseProgressState): boolean {
  return (
    hasSupply(state, "negative") &&
    hasSupply(state, "positive") &&
    hasPlacedPart(state, "potentiometer") &&
    hasPlacedPart(state, "resistor") &&
    hasPlacedPart(state, "led")
  );
}

function reflexReady(state: CourseProgressState): boolean {
  return (
    hasWire(state, "esp32_gnd_to_ground_rail") &&
    hasWire(state, "esp32_3v3_to_power_rail") &&
    hasWire(state, "pot_low_to_ground_rail") &&
    hasWire(state, "pot_wiper_to_gpio34") &&
    hasWire(state, "pot_high_to_power_rail") &&
    hasWire(state, "gpio25_to_resistor") &&
    hasWire(state, "resistor_to_led_anode") &&
    hasWire(state, "led_cathode_to_ground_rail")
  );
}

function buzzerReady(state: CourseProgressState): boolean {
  return (
    reflexReady(state) &&
    hasPlacedPart(state, "button") &&
    hasWire(state, "gpio27_to_button") &&
    hasWire(state, "button_to_ground_rail") &&
    hasPlacedPart(state, "buzzer") &&
    hasPlacedPart(state, "buzzerResistor") &&
    hasWire(state, "gpio26_to_buzzer_resistor") &&
    hasWire(state, "buzzer_resistor_to_buzzer_positive") &&
    hasWire(state, "buzzer_negative_to_ground_rail")
  );
}

function analogDecisionReady(state: CourseProgressState): boolean {
  return (
    buzzerReady(state) &&
    hasPlacedPart(state, "ldr") &&
    hasPlacedPart(state, "dividerResistor") &&
    hasWire(state, "ldr_high_to_power_rail") &&
    hasWire(state, "ldr_sense_to_gpio35") &&
    hasWire(state, "ldr_sense_to_divider_resistor") &&
    hasWire(state, "divider_resistor_to_ground_rail")
  );
}

function environmentGuardReady(state: CourseProgressState): boolean {
  return buzzerReady(state);
}

const baseWiringReference: [string, string][] = [
  ["ESP32 GND", "chosen ground rail"],
  ["ESP32 3V3", "chosen 3V3 rail"],
  ["Pot GND outer", "ground bus"],
  ["Pot wiper", "D34 POT"],
  ["Pot 3V3 outer", "3V3 bus"],
  ["D25 LED", "either resistor lead"],
  ["other resistor lead", "LED anode +"],
  ["LED cathode -", "ground bus"],
  ["D27 BUTTON", "tactile button GPIO side"],
  ["button other side", "ground bus"],
  ["D26 BUZZ", "1K buzzer resistor"],
  ["1K other side", "buzzer +"],
  ["Buzzer -", "ground bus"]
];

export const reflexSimulatorCourse: SimulatorCourseConfig = {
  id: "reflex",
  benchLoadedPayload: { course: "reflexcourse", mode: "threshold_reflex_v0" },
  backTargetLabel: "Courses",
  defaultBoardMessage: "Trace the wiring before USB.",
  checkingStatusLabel: "checking",
  usbInsertedStatusLabel: "usb inserted",
  idleStatusLabel: "reflex course",
  checkMessages: {
    start: "Tracing rails first...",
    middle: "Rails checked. Waiting at potentiometer...",
    output: "Potentiometer path is moving. Tracing guarded LED output...",
    passed: "Board check passed. USB is ready.",
    fallbackBlocked: "A required connection is missing. Tap the status checkmark for the next step.",
    usbRunning: "USB inserted. Simulated threshold_reflex_v0 is running.",
    usbBlocked: "USB validation blocked. Run Check Board again after fixing the wiring.",
    wireRemoved: "Wiring changed. Re-check the board before USB."
  },
  parts: {},
  coursePanel: {
    headerKicker: "Courses",
    headerTitle: "Reflex Lab Series",
    activeCardLabel: "Lab 01",
    activeCardTitle: "Pot to Guarded Output",
    upcomingCard: {
      label: "Lab 01A",
      title: "LED + Live Dashboard Checkpoint",
      detail: "Use the breadboard-tested LED build, then watch pot value, clamp, safe output, LED duty, and replay status.",
      ariaLabel: "Open Lab 01.a live dashboard"
    },
    futureCards: [
      {
        label: "Lab 01B",
        title: "Button + Guarded Buzzer Output",
        detail: "Disconnect USB, add the GPIO27 button path and GPIO26 -> 1K -> piezo path, then review the expanded dashboard."
      },
      {
        label: "Lab 01.c",
        title: "Motor + Fan Blade",
        detail: "Introduce a driver-protected motor output with a fan blade, then compare requested motion against safe output."
      },
      {
        label: "Lab 01.d",
        title: "BME Sensor + 128x64 Display",
        detail: "Read environment data, render the compact OLED view, and use the dashboard to inspect sensor confidence."
      }
    ],
    previewKernel: "threshold_reflex_v0",
    previewTitle: "Reflex Lab 01: Pot to Guarded Output",
    usbNote: "Lab 01 has been built and tested on a breadboard; this browser dashboard still emits simulated frames unless live serial is attached.",
    steps: [
      {
        title: "GND To Ground Bus",
        shortInstruction: "Connect ESP32 GND (3V3 ground) to the power rail",
        goal: "Connect ESP32 GND to the breadboard rail you will use as the shared 3V3 ground.",
        hint: "Click ESP32 GND, then place the jumper end in the highlighted target hole on the blue/- rail. The simulator follows the live net you choose.",
        highlight: "ground-rail",
        done: (state) => hasWire(state, "esp32_gnd_to_ground_rail") || hasSupply(state, "negative")
      },
      {
        title: "3V3 To Power Bus",
        shortInstruction: "Connect 3V3 to a rail",
        goal: "Connect ESP32 3V3 to the breadboard rail you will use as power.",
        hint: "Click ESP32 3V3, then place the jumper end in the highlighted target hole on a red/+ rail that is not tied to GND.",
        highlight: "power-rail",
        done: (state) => hasWire(state, "esp32_3v3_to_power_rail") || hasSupply(state, "positive")
      },
      {
        title: "Seat The Pot",
        shortInstruction: "Place the three pot legs",
        goal: "Place the 10K potentiometer with each leg in its own breadboard row.",
        hint: "Select 10K potentiometer. Use the highlighted target hole for the next leg, then keep each leg in a separate nearby row.",
        highlight: "potentiometer",
        done: (state) => hasPlacedPart(state, "potentiometer")
      },
      {
        title: "Pot Outer To Ground",
        shortInstruction: "Wire pot outer leg to GND",
        goal: "Connect the pot GND outer leg row to the ESP32 ground net.",
        hint: "Use a jumper from the row holding the pot GND outer leg to any empty hole on your ground bus. Same row is fine; same exact hole is not.",
        highlight: "potentiometer",
        done: (state) => hasWire(state, "pot_low_to_ground_rail")
      },
      {
        title: "Pot Wiper To GPIO34",
        shortInstruction: "Wire pot wiper to GPIO34",
        goal: "Connect the center/wiper leg row to ESP32 D34/GPIO34.",
        hint: "Use a jumper from the pot wiper row to D34 POT. This is the analog input the kernel reads.",
        highlight: "potentiometer",
        done: (state) => hasWire(state, "pot_wiper_to_gpio34")
      },
      {
        title: "Pot Outer To 3V3",
        shortInstruction: "Wire pot outer leg to 3V3",
        goal: "Connect the other pot outer leg row to the ESP32 3V3 net.",
        hint: "Use a jumper from the pot 3V3 outer leg row to any empty hole on your 3V3 bus.",
        highlight: "potentiometer",
        done: (state) => hasWire(state, "pot_high_to_power_rail")
      },
      {
        title: "Seat The Resistor",
        shortInstruction: "Place the 330 ohm resistor",
        goal: "Put the two resistor leads into two different breadboard rows.",
        hint: "Select the 330 ohm resistor. Place one lead in the highlighted target hole, then place the second lead in a different row.",
        highlight: "resistor",
        done: (state) => hasPlacedPart(state, "resistor")
      },
      {
        title: "GPIO25 To Resistor",
        shortInstruction: "Connect GPIO25 to one resistor row",
        goal: "Connect ESP32 D25/GPIO25 to either resistor lead row.",
        hint: "Click D25 LED on the ESP32 side, then click the breadboard row holding either resistor lead.",
        highlight: "resistor",
        done: (state) => hasWire(state, "gpio25_to_resistor")
      },
      {
        title: "Seat The LED",
        shortInstruction: "Place the LED long leg by the resistor",
        goal: "Put the LED long leg in the same breadboard row as the free end of the 330 ohm resistor, then put the short leg in a different row.",
        hint: "The long leg is anode +. Put it in the same horizontal row as the resistor lead that is not connected to GPIO25. The short leg is cathode - and will go to GND.",
        highlight: "led",
        done: (state) => hasPlacedPart(state, "led")
      },
      {
        title: "Resistor To Anode",
        shortInstruction: "Make resistor touch LED long leg",
        goal: "Make sure the free resistor lead and LED long leg are connected by the same row or a short jumper.",
        hint: "If you placed the LED long leg in the same horizontal row as the free resistor lead, this step is already done. Otherwise, add a jumper between those two rows.",
        highlight: "led",
        done: (state) => hasWire(state, "resistor_to_led_anode")
      },
      {
        title: "Cathode To Ground",
        shortInstruction: "Wire LED cathode to GND",
        goal: "Connect the LED cathode row to the ESP32 ground net.",
        hint: "Use a jumper from the LED cathode row to any empty hole on your ground bus. Now the LED has a complete return path.",
        highlight: "led",
        done: (state) => hasWire(state, "led_cathode_to_ground_rail")
      },
      {
        title: "USB Ready",
        shortInstruction: "Check board, then insert USB",
        goal: "Review the build. You are ready to plug in USB-C and open the dashboard stage.",
        hint: "In real hardware, this is where USB powers/programs the ESP32. In the sim, the dashboard and terminal will come next.",
        highlight: "usb",
        done: reflexReady
      },
      {
        title: "Continue To Lab 01B",
        shortInstruction: "Disconnect USB before adding parts",
        goal: "Turn off simulated USB first. Then start Lab 01B and add the button and buzzer parts while the board is unpowered.",
        hint: "Use the same habit as real hardware: disconnect USB, confirm the board is unpowered, then continue to the add-on build.",
        highlight: "usb",
        done: (state) => hasPlacedPart(state, "button") || hasPlacedPart(state, "buzzer") || hasPlacedPart(state, "buzzerResistor")
      },
      {
        title: "Seat The Button",
        shortInstruction: "Place button: GPIO side, then GND side",
        goal: "Select the tactile button. Click one empty row for the GPIO27 side, then click a different empty row for the GND side.",
        hint: "A button is just a bridge when pressed. For this lab one side goes to GPIO27 and the other side goes to ESP32 GND.",
        highlight: "button",
        done: (state) => hasPlacedPart(state, "button")
      },
      {
        title: "GPIO27 To Button",
        shortInstruction: "Wire D27 to the button GPIO row",
        goal: "Add one jumper from ESP32 D27/GPIO27 to the button row you chose for the GPIO side.",
        hint: "Look for D27 BUTTON on the ESP32. Click that pin, then click the same row as the first button leg.",
        highlight: "button",
        done: (state) => hasWire(state, "gpio27_to_button")
      },
      {
        title: "Button To Ground",
        shortInstruction: "Wire the other button row to GND",
        goal: "Add one jumper from the other button leg row to the ground rail or ESP32 GND net.",
        hint: "Do not connect the button to 3V3, 5V, or VIN. This button pulls GPIO27 toward ground when pressed.",
        highlight: "button",
        done: (state) => hasWire(state, "button_to_ground_rail")
      },
      {
        title: "Seat The Buzzer Resistor",
        shortInstruction: "Place 1K for buzzer",
        goal: "Place the 1K resistor that sits between GPIO26/D26 and the buzzer positive lead.",
        hint: "The physical board uses brown-black-black-brown-brown. Place the 1K with each lead in a different row.",
        highlight: "buzzer",
        done: (state) => hasPlacedPart(state, "buzzerResistor")
      },
      {
        title: "Seat The Buzzer",
        shortInstruction: "Place buzzer + and - leads",
        goal: "Place the piezo buzzer with positive and negative leads in separate rows.",
        hint: "Select Piezo buzzer from the tray. Place + first, then - in a nearby empty row.",
        highlight: "buzzer",
        done: (state) => hasPlacedPart(state, "buzzer")
      },
      {
        title: "GPIO26 To 1K",
        shortInstruction: "Wire GPIO26 to 1K",
        goal: "Connect ESP32 D26/GPIO26 BUZZ to one side of the 1K buzzer resistor.",
        hint: "Use a jumper from D26 BUZZ to the row holding the GPIO side of the 1K resistor.",
        highlight: "buzzer",
        done: (state) => hasWire(state, "gpio26_to_buzzer_resistor")
      },
      {
        title: "1K To Buzzer +",
        shortInstruction: "Wire 1K to buzzer +",
        goal: "Connect the other side of the 1K resistor to the buzzer positive row.",
        hint: "This matches the hardware build: GPIO26/D26 drives the buzzer through the 1K series resistor.",
        highlight: "buzzer",
        done: (state) => hasWire(state, "buzzer_resistor_to_buzzer_positive")
      },
      {
        title: "Buzzer - To Ground",
        shortInstruction: "Wire buzzer - to GND",
        goal: "Connect the buzzer negative row to the ESP32 ground net.",
        hint: "Use a jumper from the buzzer - row to any empty hole on your ground bus.",
        highlight: "buzzer",
        done: (state) => hasWire(state, "buzzer_negative_to_ground_rail")
      },
      {
        title: "USB Ready With Lab 01B",
        shortInstruction: "Check board, then insert USB",
        goal: "Validate the upgraded board, then reinsert USB for the button and buzzer dashboard.",
        hint: "This reruns the same discipline: check board, insert USB, bind GPIO27/GPIO26, then upload simulated firmware.",
        highlight: "usb",
        done: buzzerReady
      }
    ],
    releaseChecks: [
      {
        id: "firmware-identity",
        title: "Firmware identity fields visible",
        detail: "Live frames report board/session identity fields so captures can be tied to the bench run.",
        owner: "agent"
      },
      {
        id: "live-dashboard-buzzer",
        title: "Live dashboard shows buzzer",
        detail: "Dashboard displays pot, request, safe output, LED, and buzzer with no horizontal page scroll.",
        owner: "both"
      },
      {
        id: "capture-boundary",
        title: "Capture starts at Start Capture",
        detail: "Saved replay begins at the learner's capture start, not older pre-capture frames.",
        owner: "builder"
      },
      {
        id: "replay-export",
        title: "Replay export is shareable",
        detail: "Exported replay opens cleanly and includes play, pause, step, log jump, and evidence summary.",
        owner: "builder"
      },
      {
        id: "physical-artifacts",
        title: "Physical artifacts collected",
        detail: "Photos/video show ESP32, breadboards, pot, LED, button, buzzer, and resistors for the final packet.",
        owner: "builder"
      },
      {
        id: "packet-validation",
        title: "Evidence packet validates",
        detail: "Trace validation, replay summary, manifest, packet validator, and blocked claims are present.",
        owner: "both"
      }
    ]
  },
  inventory: {
    ariaLabel: "Reflex Course inventory",
    kicker: "Reflex Course",
    title: "Bench Inventory",
    kitItems: ["Breadboard 25-row trainer layout", "ESP32 DevKit on mini breadboards"],
    wiringReference: baseWiringReference,
    potControlLabel: "Pot control",
    placedPotControlLabel: "Pot control"
  },
  dashboard: {
    kicker: "Lab 01.a",
    title: "Live Reflex Dashboard",
    variant: "reflex-live-popup"
  },
  schematic: {
    kicker: "Reflex Guard Course",
    title: "Full Build Schematic",
    description: "Standard-symbol view of the ESP32 circuit, checked against the simulator wiring.",
    branches: [
      {
        id: "power-rails",
        label: "3V3 + GND buses",
        detail: "ESP32 powers the reference rails",
        teachingNote: "Every signal in this lab is measured against ESP32 GND; 3V3 is the safe sensor supply.",
        from: "ESP32 3V3 / GND",
        to: "breadboard rails",
        kind: "power",
        wireIds: ["esp32_3v3_to_power_rail", "esp32_gnd_to_ground_rail"]
      },
      {
        id: "pot-divider",
        label: "10K pot divider",
        detail: "3V3 -> pot -> GND, wiper -> GPIO34",
        teachingNote: "The potentiometer turns position into a voltage the ADC can read on GPIO34.",
        from: "3V3 + GND",
        to: "GPIO34 ADC",
        kind: "input",
        partIds: ["potentiometer"],
        wireIds: ["pot_high_to_power_rail", "pot_low_to_ground_rail", "pot_wiper_to_gpio34"]
      },
      {
        id: "guarded-led",
        label: "330R + LED",
        detail: "GPIO25 -> resistor -> LED -> GND",
        teachingNote: "GPIO25 drives the LED through a current-limiting resistor after the guard chooses a safe output.",
        from: "GPIO25 PWM",
        to: "LED branch",
        kind: "output",
        partIds: ["resistor", "led"],
        wireIds: ["gpio25_to_resistor", "resistor_to_led_anode", "led_cathode_to_ground_rail"]
      },
      {
        id: "button-input",
        label: "button input",
        detail: "GPIO27 -> button -> GND",
        teachingNote: "GPIO27 uses the ESP32 internal pull-up; pressing the button pulls the input down to ground.",
        from: "GPIO27 pull-up",
        to: "button to GND",
        kind: "input",
        partIds: ["button"],
        wireIds: ["gpio27_to_button", "button_to_ground_rail"]
      },
      {
        id: "buzzer-output",
        label: "1K + piezo",
        detail: "GPIO26 -> 1K -> piezo +, piezo - -> GND",
        teachingNote: "GPIO26 drives the piezo through the 1K series resistor; the buzzer still needs the same ground reference.",
        from: "GPIO26 PWM",
        to: "piezo branch",
        kind: "output",
        partIds: ["buzzerResistor", "buzzer"],
        wireIds: ["gpio26_to_buzzer_resistor", "buzzer_resistor_to_buzzer_positive", "buzzer_negative_to_ground_rail"]
      }
    ]
  },
  capstone: {
    ariaLabel: "Reflex Course capstone controls",
    readoutLabel: "Bench readout",
    waitingKernel: "USB waiting",
    liveKernel: "threshold_reflex_v0",
    checkButton: "Check board",
    insertButton: "Insert USB",
    removeButton: "Remove mode",
    refreshButton: "Refresh",
    dockLabel: "Reflex Course"
  }
};

export const analogSimulatorCourse: SimulatorCourseConfig = {
  id: "analog-decision",
  benchLoadedPayload: { course: "analog_decisions", mode: "analog_decision_v0" },
  backTargetLabel: "Courses",
  defaultBoardMessage: "Build the analog decision circuit before USB.",
  checkingStatusLabel: "checking",
  usbInsertedStatusLabel: "usb inserted",
  idleStatusLabel: "analog course",
  checkMessages: {
    start: "Tracing rails first...",
    middle: "Rails checked. Reading potentiometer and LDR dividers...",
    output: "LED drive is moving. Tracing LDR response, mute input, and alert output...",
    passed: "Analog board check passed. USB is ready.",
    fallbackBlocked: "A required analog decision connection is missing. Tap the status checkmark for the next step.",
    usbRunning: "USB inserted. Simulated analog_decision_v0 is running with LDR feedback, response alert, and mute input.",
    usbBlocked: "USB validation blocked. Finish the analog input, LED header, button, and buzzer wiring.",
    wireRemoved: "Wiring changed. Re-check the board before USB."
  },
  parts: {
    labels: {
      potentiometer: {
        label: "POT A",
        inventoryLabel: "LED drive potentiometer",
        placedLabel: "LED drive potentiometer",
        leads: {
          gnd: "GND outer",
          wiper: "GPIO34 LED drive",
          vcc: "3V3 outer"
        }
      },
      ldr: {
        label: "LDR",
        inventoryLabel: "Light sensor / LDR",
        placedLabel: "Light sensor",
        leads: {
          vcc: "3V3 side",
          sense: "GPIO35 sense node"
        }
      },
      dividerResistor: {
        label: "10K",
        inventoryLabel: "10K divider resistor",
        placedLabel: "LDR divider resistor",
        leads: {
          sense: "GPIO35 sense node",
          ground: "GND return"
        }
      },
      resistor: {
        label: "330R",
        inventoryLabel: "LED header current limiter",
        placedLabel: "LED header current limiter"
      },
      led: {
        label: "J_LED",
        inventoryLabel: "LED header module",
        placedLabel: "LED header module"
      },
      button: {
        label: "MUTE",
        inventoryLabel: "Mute button",
        placedLabel: "Mute button",
        leads: {
          gpio: "GPIO27 mute side",
          ground: "GND side"
        }
      },
      buzzerResistor: {
        label: "1K",
        inventoryLabel: "1K buzzer resistor",
        placedLabel: "Alert current limiter",
        leads: {
          gpio: "GPIO26 alert side",
          buzzer: "buzzer + side"
        }
      },
      buzzer: {
        label: "ALERT",
        inventoryLabel: "Piezo alert buzzer",
        placedLabel: "Response-error buzzer",
        leads: {
          positive: "alert +",
          negative: "GND -"
        }
      }
    },
    esp32PinLabels: {
      gpio34: "D34 POT",
      gpio35: "D35 LDR",
      gpio25: "D25 J_LED",
      gpio26: "D26 ALERT",
      gpio27: "D27 MUTE"
    }
  },
  coursePanel: {
    headerKicker: "Courses",
    headerTitle: "Analog Decisions",
    activeCardLabel: "Lab 01",
    activeCardTitle: "LED Header To LDR Response",
    upcomingCard: {
      label: "Lab 02",
      title: "LED Brightness + LDR Sense",
      detail: "Use GPIO34 to drive the LED brightness, then inspect the LDR divider response on GPIO35.",
      ariaLabel: "Open Analog Decisions simulator"
    },
    futureCards: [
      {
        label: "Lab 03",
        title: "Display + Trace",
        detail: "Add a simple display surface and export the decision trace for replay."
      },
      {
        label: "Lab 04",
        title: "Analog Evidence Packet",
        detail: "Package the schematic, trace, replay, and hardware notes for review."
      }
    ],
    previewKernel: "analog_decision_v0",
    previewTitle: "Analog Decisions: LED Header To LDR Response",
    usbNote: "This Course 2 simulator uses the shared bench shell and emits simulated analog_decision_v0 frames only.",
    steps: [
      {
        title: "GND To Ground Bus",
        shortInstruction: "Connect ESP32 GND (3V3 ground) to the power rail",
        goal: "Connect ESP32 GND to the breadboard rail you will use as the shared 3V3 ground.",
        hint: "Use the highlighted target hole on the GND rail. The pot, LDR divider, and LED output all need the same ESP32 ground reference.",
        highlight: "ground-rail",
        done: (state) => hasWire(state, "esp32_gnd_to_ground_rail") || hasSupply(state, "negative")
      },
      {
        title: "3V3 To Power Bus",
        shortInstruction: "Connect 3V3 to a rail",
        goal: "Connect ESP32 3V3 to the rail you will use as the analog reference.",
        hint: "The analog sensors stay inside the ESP32-safe 0-3.3V range.",
        highlight: "power-rail",
        done: (state) => hasWire(state, "esp32_3v3_to_power_rail") || hasSupply(state, "positive")
      },
      {
        title: "Seat The Pot",
        shortInstruction: "Place the LED drive pot",
        goal: "Place the 10K potentiometer with each leg in its own breadboard row.",
        hint: "GPIO34 reads this as the command that drives the protected LED header.",
        highlight: "potentiometer",
        done: (state) => hasPlacedPart(state, "potentiometer")
      },
      {
        title: "Wire Pot To GPIO34",
        shortInstruction: "Wire pot GND, D34, and 3V3",
        goal: "Connect the pot low side to GND, wiper to GPIO34, and high side to 3V3.",
        hint: "This is the same safe ADC divider habit from Course 1.",
        highlight: "potentiometer",
        done: (state) =>
          hasWire(state, "pot_low_to_ground_rail") &&
          hasWire(state, "pot_wiper_to_gpio34") &&
          hasWire(state, "pot_high_to_power_rail")
      },
      {
        title: "Seat The LDR",
        shortInstruction: "Place the LDR",
        goal: "Place the two LDR leads in separate breadboard rows.",
        hint: "One LDR side goes to 3V3. The other creates the GPIO35 sense node.",
        highlight: "ldr",
        done: (state) => hasPlacedPart(state, "ldr")
      },
      {
        title: "Seat The Divider Resistor",
        shortInstruction: "Place the 10K divider",
        goal: "Place the 10K resistor that pulls the LDR sense node back to ground.",
        hint: "The LDR and 10K resistor form a voltage divider, so GPIO35 has a readable analog voltage.",
        highlight: "dividerResistor",
        done: (state) => hasPlacedPart(state, "dividerResistor")
      },
      {
        title: "Wire LDR Divider",
        shortInstruction: "Wire LDR to D35 and GND",
        goal: "Connect LDR to 3V3, connect the LDR sense row to GPIO35, and connect that same sense row through 10K to GND.",
        hint: "The LDR sense row and the 10K sense lead should share the same electrical row or be joined by a jumper.",
        highlight: "ldr",
        done: (state) =>
          hasWire(state, "ldr_high_to_power_rail") &&
          hasWire(state, "ldr_sense_to_gpio35") &&
          hasWire(state, "ldr_sense_to_divider_resistor") &&
          hasWire(state, "divider_resistor_to_ground_rail")
      },
      {
        title: "Seat The LED Path",
        shortInstruction: "Place 330R and decision LED",
        goal: "Place the 330 ohm resistor and LED for the guarded decision output.",
        hint: "GPIO25 drives the LED through the 330 ohm resistor, and the LED cathode returns to GND.",
        highlight: "led",
        done: (state) => hasPlacedPart(state, "resistor") && hasPlacedPart(state, "led")
      },
      {
        title: "Wire Decision LED",
        shortInstruction: "Wire D25 through LED to GND",
        goal: "Connect GPIO25 to the resistor, resistor to LED anode, and LED cathode to ground.",
        hint: "This preserves the current-limited output habit from Course 1.",
        highlight: "led",
        done: (state) =>
          hasWire(state, "gpio25_to_resistor") &&
          hasWire(state, "resistor_to_led_anode") &&
          hasWire(state, "led_cathode_to_ground_rail")
      },
      {
        title: "Seat The Mute Button",
        shortInstruction: "Place the Course 1 button",
        goal: "Place the tactile button so one side can connect to GPIO27 and the other side can return to ground.",
        hint: "Course 2 keeps the Course 1 control habit: a physical button can mute the alert path while the dashboard keeps tracing.",
        highlight: "button",
        done: (state) => hasPlacedPart(state, "button")
      },
      {
        title: "Wire Mute Button",
        shortInstruction: "Wire D27 to button and GND",
        goal: "Connect GPIO27 to the button GPIO-side row, then connect the other button row to ground.",
        hint: "This is the inherited Course 1 mute/inhibit input, now used during response-error inspection.",
        highlight: "button",
        done: (state) => hasWire(state, "gpio27_to_button") && hasWire(state, "button_to_ground_rail")
      },
      {
        title: "Seat The Alert Buzzer",
        shortInstruction: "Place 1K and piezo buzzer",
        goal: "Place the 1K buzzer resistor and piezo buzzer for the response-error alert output.",
        hint: "The 1K resistor keeps the buzzer path intentionally limited, just like Course 1.",
        highlight: "buzzer",
        done: (state) => hasPlacedPart(state, "buzzerResistor") && hasPlacedPart(state, "buzzer")
      },
      {
        title: "Wire Alert Buzzer",
        shortInstruction: "Wire D26 through 1K to buzzer",
        goal: "Connect GPIO26 to 1K, the other 1K side to buzzer +, and buzzer - to ground.",
        hint: "In Course 2, this buzzer responds to mismatch between LED drive and LDR response.",
        highlight: "buzzer",
        done: (state) =>
          hasWire(state, "gpio26_to_buzzer_resistor") &&
          hasWire(state, "buzzer_resistor_to_buzzer_positive") &&
          hasWire(state, "buzzer_negative_to_ground_rail")
      },
      {
        title: "USB Ready",
        shortInstruction: "Check board, then insert USB",
        goal: "Review the full Course 2 circuit and run the simulated analog_decision_v0 dashboard.",
        hint: "After USB, turn the pot, cover the LDR, and press mute. Course 2 compares commanded LED brightness to observed LDR response.",
        highlight: "usb",
        done: analogDecisionReady
      }
    ]
  },
  inventory: {
    ariaLabel: "Analog Decisions inventory",
    kicker: "Analog Decisions",
    title: "Bench Inventory",
    kitItems: [
      "Breadboard 25-row trainer layout",
      "ESP32 DevKit on mini breadboards",
      "Course 1 tactile button",
      "Course 1 1K buzzer resistor",
      "Course 1 piezo buzzer",
      "LDR photoresistor",
      "10K divider resistor"
    ],
    wiringReference: [
      ["ESP32 GND", "chosen ground rail"],
      ["ESP32 3V3", "chosen 3V3 rail"],
      ["Pot GND outer", "ground bus"],
      ["Pot wiper", "GPIO34 POT"],
      ["Pot 3V3 outer", "3V3 bus"],
      ["LDR high side", "3V3 bus"],
      ["LDR sense side", "GPIO35 LDR"],
      ["10K divider sense side", "same GPIO35/LDR sense row"],
      ["10K divider return", "ground bus"],
      ["GPIO25 J_LED", "either 330R lead"],
      ["other 330R lead", "LED anode +"],
      ["LED cathode -", "ground bus"],
      ["GPIO27 MUTE", "tactile button GPIO side"],
      ["button other side", "ground bus"],
      ["GPIO26 ALERT", "1K buzzer resistor"],
      ["1K other side", "buzzer +"],
      ["buzzer -", "ground bus"]
    ],
    potControlLabel: "LED drive pot",
    placedPotControlLabel: "LED drive pot"
  },
  dashboard: {
    kicker: "Lab 02",
    title: "Analog Decision Dashboard",
    variant: "reflex-live-popup"
  },
  schematic: {
    kicker: "Analog Decisions",
    title: "Full Build Schematic",
    description: "Standard-symbol view of the protected LED header, LDR divider, and observed-response loop.",
    branches: [
      {
        id: "power-rails",
        label: "3V3 + GND buses",
        detail: "ESP32 powers the analog reference rails",
        teachingNote: "Both analog dividers and the LED output need the same ESP32 ground reference.",
        from: "ESP32 3V3 / GND",
        to: "breadboard rails",
        kind: "power",
        wireIds: ["esp32_3v3_to_power_rail", "esp32_gnd_to_ground_rail"]
      },
      {
        id: "pot-divider",
        label: "10K pot divider",
        detail: "3V3 -> pot -> GND, wiper -> GPIO34",
        teachingNote: "The potentiometer gives the course a known adjustable analog voltage on GPIO34.",
        from: "3V3 + GND",
        to: "GPIO34 ADC",
        kind: "input",
        partIds: ["potentiometer"],
        wireIds: ["pot_high_to_power_rail", "pot_low_to_ground_rail", "pot_wiper_to_gpio34"]
      },
      {
        id: "ldr-divider",
        label: "LDR + 10K divider",
        detail: "3V3 -> LDR -> GPIO35 sense node -> 10K -> GND",
        teachingNote: "The LDR changes resistance with light; the 10K resistor turns that change into a GPIO35 ADC voltage.",
        from: "3V3 + GND",
        to: "GPIO35 ADC",
        kind: "input",
        partIds: ["ldr", "dividerResistor"],
        wireIds: ["ldr_high_to_power_rail", "ldr_sense_to_gpio35", "ldr_sense_to_divider_resistor", "divider_resistor_to_ground_rail"]
      },
      {
        id: "guarded-led",
        label: "330R + LED header",
        detail: "GPIO25 -> resistor -> LED -> GND",
        teachingNote: "GPIO25 drives a current-limited LED header. The LDR branch lets the dashboard compare command to observed light.",
        from: "GPIO25 PWM",
        to: "LED branch",
        kind: "output",
        partIds: ["resistor", "led"],
        wireIds: ["gpio25_to_resistor", "resistor_to_led_anode", "led_cathode_to_ground_rail"]
      },
      {
        id: "button-input",
        label: "GPIO27 mute button",
        detail: "GPIO27 -> tactile button -> GND",
        teachingNote: "The same button habit from Course 1 now mutes the response-error alert while the trace keeps recording.",
        from: "GPIO27 input",
        to: "ground when pressed",
        kind: "input",
        partIds: ["button"],
        wireIds: ["gpio27_to_button", "button_to_ground_rail"]
      },
      {
        id: "buzzer-output",
        label: "1K + response alert",
        detail: "GPIO26 -> 1K -> piezo buzzer -> GND",
        teachingNote: "The buzzer alerts when commanded LED drive and observed LDR response disagree beyond the lab threshold.",
        from: "GPIO26 output",
        to: "piezo buzzer",
        kind: "output",
        partIds: ["buzzerResistor", "buzzer"],
        wireIds: ["gpio26_to_buzzer_resistor", "buzzer_resistor_to_buzzer_positive", "buzzer_negative_to_ground_rail"]
      }
    ]
  },
  capstone: {
    ariaLabel: "Analog Decisions capstone controls",
    readoutLabel: "Analog readout",
    waitingKernel: "USB waiting",
    liveKernel: "analog_decision_v0",
    checkButton: "Check board",
    insertButton: "Insert USB",
    removeButton: "Remove mode",
    refreshButton: "Refresh",
    dockLabel: "Analog Course"
  }
};

export const environmentGuardSimulatorCourse: SimulatorCourseConfig = {
  id: "environment-guard",
  benchLoadedPayload: { course: "environment_guard", mode: "environment_guard_v0_proxy" },
  backTargetLabel: "Courses",
  defaultBoardMessage: "Build the environmental guard proxy before USB.",
  checkingStatusLabel: "checking",
  usbInsertedStatusLabel: "usb inserted",
  idleStatusLabel: "environment course",
  checkMessages: {
    start: "Tracing rails first...",
    middle: "Rails checked. Reading the humidity proxy input...",
    output: "Guard output is moving. Tracing display state, mute input, and alert output...",
    passed: "Environment guard proxy check passed. USB is ready.",
    fallbackBlocked: "A required environmental guard connection is missing. Tap the status checkmark for the next step.",
    usbRunning: "USB inserted. Simulated environment_guard_v0 proxy is running with display text, alert, and mute input.",
    usbBlocked: "USB validation blocked. Finish the humidity proxy, LED, button, and buzzer wiring.",
    wireRemoved: "Wiring changed. Re-check the board before USB."
  },
  parts: {
    labels: {
      potentiometer: {
        label: "HUM PROXY",
        inventoryLabel: "Humidity proxy potentiometer",
        placedLabel: "Humidity proxy potentiometer",
        leads: {
          gnd: "GND outer",
          wiper: "GPIO34 humidity proxy",
          vcc: "3V3 outer"
        }
      },
      resistor: {
        label: "1K",
        inventoryLabel: "Display/alert LED resistor",
        placedLabel: "State LED current limiter",
        leads: {
          left: "GPIO25 state side",
          right: "LED anode side"
        }
      },
      led: {
        label: "STATE",
        inventoryLabel: "State LED",
        placedLabel: "State LED",
        leads: {
          anode: "State LED anode +",
          cathode: "State LED cathode -"
        }
      },
      button: {
        label: "MUTE",
        inventoryLabel: "Mute button",
        placedLabel: "Mute button",
        leads: {
          gpio: "GPIO27 mute side",
          ground: "GND side"
        }
      },
      buzzerResistor: {
        label: "1K",
        inventoryLabel: "1K buzzer resistor",
        placedLabel: "Alert current limiter",
        leads: {
          gpio: "GPIO26 alert side",
          buzzer: "buzzer + side"
        }
      },
      buzzer: {
        label: "ALERT",
        inventoryLabel: "Piezo alert buzzer",
        placedLabel: "Environment alert buzzer",
        leads: {
          positive: "alert +",
          negative: "GND -"
        }
      }
    },
    esp32PinLabels: {
      gpio34: "D34 HUM",
      gpio25: "D25 STATE",
      gpio26: "D26 ALERT",
      gpio27: "D27 MUTE"
    }
  },
  coursePanel: {
    headerKicker: "Courses",
    headerTitle: "Environmental Guard Node",
    activeCardLabel: "Lab 01",
    activeCardTitle: "Humidity Proxy + Alert Display",
    upcomingCard: {
      label: "Lab 02",
      title: "I2C Sensor And OLED",
      detail: "Replace the proxy input with BME280 data and mirror the trace state on a local OLED.",
      ariaLabel: "Open Environmental Guard simulator"
    },
    futureCards: [
      {
        label: "Lab 03",
        title: "Stale Sensor Handling",
        detail: "Make missing or frozen sensor data visible in display, trace, LED, and buzzer state."
      },
      {
        label: "Lab 04",
        title: "Environment Evidence Packet",
        detail: "Capture sensor metadata, display state, trace replay, and blocked claims."
      }
    ],
    previewKernel: "environment_guard_v0",
    previewTitle: "Environmental Guard: Humidity Proxy + Stale State",
    usbNote: "This Course 3 simulator uses a potentiometer as a local humidity proxy. It does not claim BME280 or OLED hardware observation.",
    steps: [
      {
        title: "GND To Ground Bus",
        shortInstruction: "Connect ESP32 GND (3V3 ground) to the power rail",
        goal: "Connect ESP32 GND to the breadboard rail you will use as the shared 3V3 ground.",
        hint: "Use the highlighted target hole on the GND rail. Every sensor, display, LED, button, and buzzer path needs the same ESP32 ground reference.",
        highlight: "ground-rail",
        done: (state) => hasWire(state, "esp32_gnd_to_ground_rail") || hasSupply(state, "negative")
      },
      {
        title: "3V3 To Power Bus",
        shortInstruction: "Connect 3V3 to a rail",
        goal: "Connect ESP32 3V3 to the rail you will use for low-voltage logic.",
        hint: "Course 3 stays inside ESP32-friendly low-voltage wiring.",
        highlight: "power-rail",
        done: (state) => hasWire(state, "esp32_3v3_to_power_rail") || hasSupply(state, "positive")
      },
      {
        title: "Seat The Humidity Proxy",
        shortInstruction: "Place the humidity proxy pot",
        goal: "Place the 10K potentiometer with each leg in its own breadboard row.",
        hint: "This simulator uses the pot as a humidity proxy until live BME280 capture is performed.",
        highlight: "potentiometer",
        done: (state) => hasPlacedPart(state, "potentiometer")
      },
      {
        title: "Wire Proxy To GPIO34",
        shortInstruction: "Wire proxy GND, D34, and 3V3",
        goal: "Connect the proxy low side to GND, wiper to GPIO34, and high side to 3V3.",
        hint: "GPIO34 stands in for normalized humidity in the simulator.",
        highlight: "potentiometer",
        done: (state) =>
          hasWire(state, "pot_low_to_ground_rail") &&
          hasWire(state, "pot_wiper_to_gpio34") &&
          hasWire(state, "pot_high_to_power_rail")
      },
      {
        title: "Seat The State LED",
        shortInstruction: "Place 1K and state LED",
        goal: "Place the 1K resistor and LED that show the guarded environmental state.",
        hint: "The state LED is a local display output, not a safety device.",
        highlight: "led",
        done: (state) => hasPlacedPart(state, "resistor") && hasPlacedPart(state, "led")
      },
      {
        title: "Wire State LED",
        shortInstruction: "Wire D25 through LED to GND",
        goal: "Connect GPIO25 to the resistor, resistor to LED anode, and LED cathode to ground.",
        hint: "The guard clamps requested alert output before this visible state output changes.",
        highlight: "led",
        done: (state) =>
          hasWire(state, "gpio25_to_resistor") &&
          hasWire(state, "resistor_to_led_anode") &&
          hasWire(state, "led_cathode_to_ground_rail")
      },
      {
        title: "Seat The Mute Button",
        shortInstruction: "Place the mute button",
        goal: "Place the tactile button so GPIO27 can mute the audible alert.",
        hint: "The button mutes the buzzer without hiding the trace or display state.",
        highlight: "button",
        done: (state) => hasPlacedPart(state, "button")
      },
      {
        title: "Wire Mute Button",
        shortInstruction: "Wire D27 to button and GND",
        goal: "Connect GPIO27 to the button GPIO-side row, then connect the other button row to ground.",
        hint: "Pressing the button pulls GPIO27 low in the simulated firmware.",
        highlight: "button",
        done: (state) => hasWire(state, "gpio27_to_button") && hasWire(state, "button_to_ground_rail")
      },
      {
        title: "Seat The Alert Buzzer",
        shortInstruction: "Place 1K and piezo buzzer",
        goal: "Place the 1K buzzer resistor and piezo buzzer for alert output.",
        hint: "The buzzer is a low-voltage learning output only.",
        highlight: "buzzer",
        done: (state) => hasPlacedPart(state, "buzzerResistor") && hasPlacedPart(state, "buzzer")
      },
      {
        title: "Wire Alert Buzzer",
        shortInstruction: "Wire D26 through 1K to buzzer",
        goal: "Connect GPIO26 to 1K, the other 1K side to buzzer +, and buzzer - to ground.",
        hint: "Warning, alert, and stale states can request audible output, then the guard clamps it.",
        highlight: "buzzer",
        done: (state) =>
          hasWire(state, "gpio26_to_buzzer_resistor") &&
          hasWire(state, "buzzer_resistor_to_buzzer_positive") &&
          hasWire(state, "buzzer_negative_to_ground_rail")
      },
      {
        title: "USB Ready",
        shortInstruction: "Check board, then insert USB",
        goal: "Review the Course 3 proxy circuit and run simulated environment_guard_v0.",
        hint: "After USB, move the humidity proxy, toggle stale data, and press mute while comparing display text to trace state.",
        highlight: "usb",
        done: environmentGuardReady
      }
    ]
  },
  inventory: {
    ariaLabel: "Environmental Guard inventory",
    kicker: "Environmental Guard",
    title: "Bench Inventory",
    kitItems: [
      "Breadboard 25-row trainer layout",
      "ESP32 DevKit on mini breadboards",
      "10K humidity proxy potentiometer",
      "State LED",
      "1K state LED resistor",
      "Mute button",
      "1K buzzer resistor",
      "Piezo buzzer",
      "Physical upgrade: BME280 + SSD1306 OLED on I2C"
    ],
    wiringReference: [
      ["ESP32 GND", "chosen ground rail"],
      ["ESP32 3V3", "chosen 3V3 rail"],
      ["Proxy GND outer", "ground bus"],
      ["Proxy wiper", "GPIO34 HUM"],
      ["Proxy 3V3 outer", "3V3 bus"],
      ["GPIO25 STATE", "either 1K LED resistor lead"],
      ["other 1K LED resistor lead", "LED anode +"],
      ["LED cathode -", "ground bus"],
      ["GPIO27 MUTE", "tactile button GPIO side"],
      ["button other side", "ground bus"],
      ["GPIO26 ALERT", "1K buzzer resistor"],
      ["1K other side", "buzzer +"],
      ["buzzer -", "ground bus"],
      ["Physical I2C SDA", "GPIO21 to BME280/OLED SDA"],
      ["Physical I2C SCL", "GPIO22 to BME280/OLED SCL"]
    ],
    potControlLabel: "Humidity proxy",
    placedPotControlLabel: "Humidity proxy"
  },
  dashboard: {
    kicker: "Lab 01",
    title: "Environmental Guard Dashboard",
    variant: "reflex-live-popup"
  },
  schematic: {
    kicker: "Environmental Guard",
    title: "Proxy Build Schematic",
    description: "Standard-symbol view of the simulated humidity proxy, guarded state LED, mute input, and alert buzzer.",
    branches: [
      {
        id: "power-rails",
        label: "3V3 + GND buses",
        detail: "ESP32 powers the low-voltage reference rails",
        teachingNote: "The physical BME280 and OLED will share these same 3V3 and GND references.",
        from: "ESP32 3V3 / GND",
        to: "breadboard rails",
        kind: "power",
        wireIds: ["esp32_3v3_to_power_rail", "esp32_gnd_to_ground_rail"]
      },
      {
        id: "pot-divider",
        label: "humidity proxy divider",
        detail: "3V3 -> pot -> GND, wiper -> GPIO34",
        teachingNote: "This proxy replaces live BME280 humidity only for the simulator. Hardware claims remain blocked.",
        from: "3V3 + GND",
        to: "GPIO34 ADC",
        kind: "input",
        partIds: ["potentiometer"],
        wireIds: ["pot_high_to_power_rail", "pot_low_to_ground_rail", "pot_wiper_to_gpio34"]
      },
      {
        id: "guarded-led",
        label: "1K + state LED",
        detail: "GPIO25 -> resistor -> LED -> GND",
        teachingNote: "GPIO25 mirrors the display state after the guard clamps the requested alert output.",
        from: "GPIO25 PWM",
        to: "state LED",
        kind: "output",
        partIds: ["resistor", "led"],
        wireIds: ["gpio25_to_resistor", "resistor_to_led_anode", "led_cathode_to_ground_rail"]
      },
      {
        id: "button-input",
        label: "GPIO27 mute button",
        detail: "GPIO27 -> tactile button -> GND",
        teachingNote: "Mute changes the local buzzer only; display text and trace frames still show warning, alert, or stale state.",
        from: "GPIO27 input",
        to: "ground when pressed",
        kind: "input",
        partIds: ["button"],
        wireIds: ["gpio27_to_button", "button_to_ground_rail"]
      },
      {
        id: "buzzer-output",
        label: "1K + alert buzzer",
        detail: "GPIO26 -> 1K -> piezo buzzer -> GND",
        teachingNote: "The buzzer is a local alert indicator for the educational guard loop.",
        from: "GPIO26 output",
        to: "piezo buzzer",
        kind: "output",
        partIds: ["buzzerResistor", "buzzer"],
        wireIds: ["gpio26_to_buzzer_resistor", "buzzer_resistor_to_buzzer_positive", "buzzer_negative_to_ground_rail"]
      }
    ]
  },
  capstone: {
    ariaLabel: "Environmental Guard capstone controls",
    readoutLabel: "Environment readout",
    waitingKernel: "USB waiting",
    liveKernel: "environment_guard_v0",
    checkButton: "Check board",
    insertButton: "Insert USB",
    removeButton: "Remove mode",
    refreshButton: "Refresh",
    dockLabel: "Environment Course"
  }
};

export const optimizationBoundarySimulatorCourse: SimulatorCourseConfig = {
  id: "optimization-boundary",
  benchLoadedPayload: { course: "optimization_boundary", mode: "boundary_demo_software_proxy" },
  backTargetLabel: "Course",
  defaultBoardMessage: "Build the base kit, then run the boundary proxy.",
  checkingStatusLabel: "checking",
  usbInsertedStatusLabel: "proxy running",
  idleStatusLabel: "optimization simulator",
  checkMessages: {
    start: "Tracing rails first...",
    middle: "Rails checked. Reading dimension knob on GPIO34...",
    output: "Dimension path is moving. Tracing boundary-stress LED output...",
    passed: "Simulator check passed. Boundary proxy is ready.",
    fallbackBlocked: "Finish the base ESP32, potentiometer, resistor, and LED path.",
    usbRunning: "Simulator started. Software boundary proxy is emitting trace frames.",
    usbBlocked: "Simulator validation blocked. Run Check Board again after fixing the wiring.",
    wireRemoved: "Last jumper removed. Re-check the simulator before running."
  },
  parts: {
    labels: {
      potentiometer: {
        label: "DIM KNOB",
        inventoryLabel: "Dimension proxy knob",
        placedLabel: "Dimension proxy knob",
        leads: {
          gnd: "GND reference",
          wiper: "Dimension signal",
          vcc: "3V3 reference"
        }
      },
      resistor: {
        label: "LIMIT",
        inventoryLabel: "Stress current limiter",
        placedLabel: "Stress current limiter",
        leads: {
          left: "GPIO25 stress side",
          right: "LED stress side"
        }
      },
      led: {
        label: "STRESS",
        inventoryLabel: "Boundary stress LED",
        placedLabel: "Boundary stress LED",
        leads: {
          anode: "Stress anode +",
          cathode: "Stress cathode -"
        }
      }
    },
    esp32PinLabels: {
      gpio34: "D34 DIM",
      gpio25: "D25 STRESS",
      gpio26: "D26 MODE",
      gpio27: "GPIO27 GUARD"
    }
  },
  coursePanel: {
    headerKicker: "Courses",
    headerTitle: "Optimization Boundary",
    activeCardLabel: "Sim",
    activeCardTitle: "Boundary Stress Demo",
    upcomingCard: null,
    previewKernel: "boundary_demo_software_proxy",
    previewTitle: "Optimization Boundary: Dimension Knob To Stress LED",
    usbNote: "This simulator uses the shared bench shell; no firmware, live serial, or hardware observation is claimed.",
    steps: [
      {
        title: "Start With Ground",
        shortInstruction: "Connect ESP32 GND (3V3 ground) to the power rail",
        goal: "Connect ESP32 GND to the rail you will use as the shared 3V3 ground.",
        hint: "Use the highlighted target hole on the GND rail before running any simulated output. The simulator follows the live net.",
        highlight: "ground-rail",
        done: (state) => hasWire(state, "esp32_gnd_to_ground_rail") || hasSupply(state, "negative")
      },
      {
        title: "Add Safe 3V3",
        shortInstruction: "Connect 3V3 to a rail",
        goal: "Connect ESP32 3V3 to the rail you will use as power.",
        hint: "The potentiometer still represents a safe 0-3.3V control input.",
        highlight: "power-rail",
        done: (state) => hasWire(state, "esp32_3v3_to_power_rail") || hasSupply(state, "positive")
      },
      {
        title: "Place Dimension Knob",
        shortInstruction: "Place the dimension knob",
        goal: "Place the 10K potentiometer so its wiper can select dimension buckets.",
        hint: "Use the potentiometer as the dimension selector: 2D, 4D, 8D, 16D, 32D, 64D.",
        highlight: "potentiometer",
        done: (state) => hasPlacedPart(state, "potentiometer")
      },
      {
        title: "Place Stress Resistor",
        shortInstruction: "Put 330R in the stress LED path",
        goal: "Place the 330 ohm resistor between the simulated stress output and LED path.",
        hint: "The resistor keeps the physical metaphor honest: GPIO output always goes through a current limiter.",
        highlight: "resistor",
        done: (state) => hasPlacedPart(state, "resistor")
      },
      {
        title: "Place Stress LED",
        shortInstruction: "Place stress LED cathode and anode",
        goal: "Place the LED that will visualize boundary stress / finite survival.",
        hint: "The LED is a display for software-computed stress, not proof of full optimizer hardware.",
        highlight: "led",
        done: (state) => hasPlacedPart(state, "led")
      },
      {
        title: "Run Software Proxy",
        shortInstruction: "Check board, then run simulator",
        goal: "Review the build and run the software boundary proxy through the shared bench shell.",
        hint: "The run emits simulated evidence only: hardware_observed remains false.",
        highlight: "usb",
        done: baseReady
      }
    ]
  },
  inventory: {
    ariaLabel: "Optimization Boundary inventory",
    kicker: "Optimization Boundary",
    title: "Simulator Inventory",
    kitItems: ["Breadboard 25-row shared simulator layout", "ESP32 ESP-32S + proxy breakout"],
    wiringReference: [
      ["ESP32 GND", "chosen ground rail"],
      ["ESP32 3V3", "chosen 3V3 rail"],
      ["Dimension knob GND", "ground bus"],
      ["Dimension knob wiper", "GPIO34 DIM"],
      ["Dimension knob 3V3", "3V3 bus"],
      ["GPIO25 STRESS", "either resistor lead"],
      ["other resistor lead", "stress LED anode +"],
      ["stress LED cathode -", "ground bus"]
    ],
    potControlLabel: "Dimension knob",
    placedPotControlLabel: "Dimension control"
  },
  dashboard: {
    kicker: "Software Dashboard",
    title: "Boundary Proxy Status"
  },
  schematic: {
    kicker: "Reusable schematic",
    title: "Boundary Proxy Circuit",
    description: "The same schematic shell can describe later ESP32 proxy courses.",
    branches: [
      {
        id: "power-rails",
        label: "3V3 + GND buses",
        detail: "ESP32 powers the reference rails",
        teachingNote: "The proxy still needs a common 3V3 and GND reference before software claims mean anything.",
        from: "ESP32 3V3 / GND",
        to: "breadboard rails",
        kind: "power",
        wireIds: ["esp32_3v3_to_power_rail", "esp32_gnd_to_ground_rail"]
      },
      {
        id: "dimension-knob",
        label: "dimension knob",
        detail: "pot divider -> GPIO34",
        teachingNote: "The knob is a physical proxy for an input dimension, not a proof of hardware optimization.",
        from: "3V3 + GND",
        to: "GPIO34 ADC",
        kind: "input",
        partIds: ["potentiometer"],
        wireIds: ["pot_high_to_power_rail", "pot_low_to_ground_rail", "pot_wiper_to_gpio34"]
      },
      {
        id: "boundary-led",
        label: "boundary LED",
        detail: "GPIO25 -> resistor -> LED -> GND",
        teachingNote: "The LED displays boundary stress from the software proxy only.",
        from: "GPIO25 PWM",
        to: "LED branch",
        kind: "output",
        partIds: ["resistor", "led"],
        wireIds: ["gpio25_to_resistor", "resistor_to_led_anode", "led_cathode_to_ground_rail"]
      }
    ]
  },
  capstone: {
    ariaLabel: "Optimization Boundary simulator controls",
    readoutLabel: "Boundary readout",
    waitingKernel: "boundary_demo_proxy",
    liveKernel: "boundary_demo_proxy",
    checkButton: "Check simulator",
    insertButton: "Run simulator",
    removeButton: "Remove mode",
    refreshButton: "Refresh",
    dockLabel: "Simulator"
  }
};
