import { expect, test, type Page } from "@playwright/test";

async function openReflexLiveDashboard(page: Page) {
  await page.getByRole("button", { name: "Open course menu" }).click();
  await page.getByRole("button", { name: "Open Lab 01.a live dashboard" }).click();
  await page.getByRole("button", { name: "Open course menu" }).click();
  return page.getByRole("complementary", { name: "Live lab dashboard" });
}

async function openReflexTerminal(page: Page) {
  const dashboard = await openReflexLiveDashboard(page);
  await dashboard.getByText("Virtual terminal").click();
  return dashboard;
}

test("landing page presents the Reflex Course hardware gateway", async ({ page }) => {
  await page.goto("/electronics");
  const landing = page.getByRole("main", { name: "Monogate Electronics landing page" });
  await expect(landing).toContainText("Choose your hardware path");
  await expect(landing).toContainText("ESP32 / Arduino");
  await expect(landing).toContainText("FPGA / Arty A7");
  await expect(landing).toContainText("Simulated Evidence Packets");
  await expect(landing).toContainText("RC transient");
  await expect(landing).toContainText("Voltage divider");
  await expect(landing).toContainText("Logic guard");
  await expect(landing).toContainText("hardware_observed: false");
  await expect(landing).not.toContainText("Other Systems");
  await expect(page.getByRole("button", { name: /Quick Start/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Source/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /How It Works/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open ESP32 / Arduino path" })).toBeVisible();
});

test("Arduino course offers simulated and physical Reflex Course options", async ({ page }) => {
  await page.goto("/electronics");
  await page.getByRole("button", { name: "Open ESP32 / Arduino path" }).click();
  await expect(page).toHaveURL(/\/electronics\/esp32$/);
  const courseLanding = page.getByRole("main", { name: "ESP32 and Arduino course landing" });
  await expect(courseLanding).toContainText("Choose an ESP32 course");
  await expect(courseLanding).toContainText("Reflex Guard");
  await expect(courseLanding).toContainText("Analog Decisions");
  await expect(courseLanding).toContainText("Boundary Hardware Demo");
  await expect(courseLanding).toContainText("Environmental Guard Node");

  await page.getByLabel("Reflex Guard launch options").getByRole("button", { name: /Preview/ }).click();
  await expect(page).toHaveURL(/\/electronics\/esp32\/reflex-guard$/);
  const reflexPreview = page.getByRole("main", { name: "Reflex Guard course preview" });
  await expect(reflexPreview).toContainText("Reflex Guard");
  await expect(reflexPreview).toContainText("Lab 01");
  await expect(page.getByRole("region", { name: "Reflex Lab 01 interactive replay preview" })).toContainText("simulated replay");
  await expect(page.getByRole("table", { name: "Golden trace frames" })).toBeVisible();
  await page.getByRole("button", { name: /Open build/ }).click();
  await expect(page).toHaveURL(/\/electronics\/esp32\/reflex-guard\/physical$/);
  await expect(page.getByRole("main", { name: "Reflex Lab 01 physical build instructions" })).toContainText("Quick Wiring Reference");
  await expect(page.getByRole("link", { name: /Download ZIP/ })).toHaveAttribute(
    "href",
    "https://github.com/agent-maestro/monogate-edu/archive/refs/heads/main.zip"
  );
  await expect(page.getByRole("link", { name: /GitHub repo/ })).toHaveAttribute(
    "href",
    "https://github.com/agent-maestro/monogate-edu"
  );
  await expect(page.getByRole("link", { name: /Quick Start/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Reflex Lab 01 Lab Packet/ })).toHaveAttribute("download", "");
  await expect(page.getByRole("main", { name: "Reflex Lab 01 physical build instructions" })).not.toContainText("ElectroCookie");
  await expect(page.getByRole("button", { name: /Open simulator/ })).toBeVisible();
});

test("hardware path cards are clickable", async ({ page }) => {
  await page.goto("/electronics");
  await page.getByRole("button", { name: "Open ESP32 / Arduino path" }).click();
  await expect(page).toHaveURL(/\/electronics\/esp32$/);

  await page.goto("/electronics");
  await page.getByRole("button", { name: "Preview FPGA / Arty A7 path" }).click();
  await expect(page).toHaveURL(/\/electronics\/artya7\/courses$/);
});

test("electronics URLs can be opened directly", async ({ page }) => {
  await page.goto("/electronics/esp32");
  await expect(page.getByRole("main", { name: "ESP32 and Arduino course landing" })).toContainText("Choose an ESP32 course");

  await page.goto("/electronics/reflexcourse");
  await expect(page.getByRole("main", { name: "Reflex Guard course preview" })).toContainText("Reflex Guard");

  await page.goto("/electronics/esp32/analog-decisions");
  await expect(page.getByRole("main", { name: "Analog Decisions course preview" })).toContainText("Two analog inputs");

  await page.goto("/electronics/analog-decisions/lab");
  await expect(page.getByTestId("lab-canvas")).toBeVisible();

  await page.goto("/electronics/esp32/environmental-guard-node");
  await expect(page.getByRole("main", { name: "Environmental Guard Node course preview" })).toContainText("Stale data");

  await page.goto("/electronics/esp32/boundary-hardware-demo");
  await expect(page.getByRole("main", { name: "Boundary Hardware Demo course preview" })).toContainText("Hardware feel");

  await page.goto("/electronics/artya7/courses");
  await expect(page.getByRole("main", { name: "Arty A7 electronics courses" })).toContainText("008: Arty A7 Reflex Logic");

  await page.goto("/electronics/other");
  await expect(page.getByRole("main", { name: "Other Systems electronics courses" })).toContainText("Optimization Boundary");

  await page.goto("/electronics/other/OptimizationBoundary");
  const boundaryLanding = page.getByRole("main", { name: "Optimization Boundary course options" });
  await expect(boundaryLanding).toContainText("Optimization Boundary");
  await expect(boundaryLanding).toContainText("Software Simulator");
  await expect(page.getByRole("button", { name: "Physical", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Software", exact: true }).click();
  await expect(page).toHaveURL(/\/electronics\/other\/OptimizationBoundary\/software$/);

  await page.goto("/electronics/other/OptimizationBoundary");
  await page.getByRole("button", { name: "Simulator", exact: true }).click();
  await expect(page).toHaveURL(/\/electronics\/esp32\/boundary-hardware-demo\/simulator$/);
});

test("optimization boundary software emits simulated evidence", async ({ page }) => {
  await page.goto("/electronics/other/OptimizationBoundary/software");
  const lab = page.getByRole("main", { name: "Optimization Boundary software" });
  await expect(lab).toContainText("hardware_observed: false");
  await expect(lab.getByLabel("Optimization Boundary course panel")).toContainText("Software course steps");
  await expect(lab.getByLabel("Physical lockout")).toContainText("Physical locked");
  await expect(lab.getByLabel("OLED boundary readouts")).toContainText("boundary_hits");
  await expect(page.getByRole("button", { name: "raw", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Run raw", exact: true }).click();
  await expect(page.getByLabel("Evidence packet JSON")).toContainText('"schema_version": "monogate-electronics.boundary-run.v0"');
  await expect(page.getByLabel("Evidence packet JSON")).toContainText('"hardware_observed": false');
  await expect(page.getByLabel("Evidence packet JSON")).toContainText('"live_serial_capture_performed": false');

  await page.getByRole("button", { name: "log-domain", exact: true }).click();
  await expect(page.getByLabel("Optimization Boundary dashboard")).toContainText("log-domain");
  await page.getByRole("button", { name: "auto rescue", exact: true }).click();
  await expect(page.getByLabel("Optimization Boundary dashboard")).toContainText("auto rescue");
  await expect(page.getByLabel("Evidence packet JSON")).toContainText('"rescue_events"');
  await page.getByRole("slider", { name: "Replay frame" }).fill("2");
  await expect(page.getByLabel("Trace replay controls")).toContainText("sample");
  await page.getByRole("button", { name: /Replay trace/ }).click();
  await expect(page.getByRole("button", { name: /Replaying/ })).toBeVisible();
});

test("optimization boundary simulator uses the shared breadboard lab shell", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop verifies the full Optimization Boundary panel shell");
  await page.goto("/electronics/other/OptimizationBoundary/simulator");
  await expect(page.getByTestId("lab-canvas")).toBeVisible();
  const inventory = page.getByRole("complementary", { name: "Optimization Boundary inventory" });
  await expect(inventory).toBeVisible();
  await expect(inventory).toContainText("Dimension proxy knob");
  await expect(inventory).toContainText("Stress current limiter");
  await expect(inventory).toContainText("Boundary stress LED");
  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("complementary", { name: "Live lab dashboard" })).toContainText("Boundary Proxy Status");
  }
  await expect(page.getByRole("region", { name: "Optimization Boundary simulator controls" })).toContainText("boundary_demo_proxy");
  await page.getByRole("button", { name: "Open course menu" }).click();
  await expect(page.getByRole("complementary", { name: "Course menu" })).toContainText("Boundary Stress Demo");
});

test("analog decisions simulator uses the shared breadboard lab shell", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop verifies the full Course 2 panel shell");
  await page.goto("/electronics/analog-decisions/lab");
  await expect(page.getByTestId("lab-canvas")).toBeVisible();
  const inventory = page.getByRole("complementary", { name: "Analog Decisions inventory" });
  await expect(inventory).toBeVisible();
  await expect(inventory).toContainText("LED drive potentiometer");
  await expect(inventory).toContainText("Light sensor");
  await expect(inventory).toContainText("10K divider resistor");
  await expect(page.getByRole("region", { name: "Analog Decisions capstone controls" })).toContainText("Analog readout");
  await page.getByRole("button", { name: "Open course menu" }).click();
  await expect(page.getByRole("complementary", { name: "Course menu" })).toContainText("LED Header To LDR Response");
});

test("loads the breadboard foundation lab", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await expect(page.getByTestId("lab-canvas")).toBeVisible();
});

test("shows the Reflex Course inventory and live dashboard", async ({ page }, testInfo) => {
  await page.goto("/electronics/reflexcourse/lab");
  await expect(page.getByRole("complementary", { name: "Reflex Course inventory" })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await openReflexLiveDashboard(page);
    await expect(page.getByRole("complementary", { name: "Live lab dashboard" })).toBeVisible();
    await expect(page.getByLabel("Reflex live dashboard")).toContainText("pot_raw");
    await expect(page.getByLabel("Reflex live dashboard")).toContainText("safe_output");
    await expect(page.getByLabel("Reflex live dashboard")).toContainText("guard");
    await expect(page.getByText("Virtual terminal")).toBeVisible();
  }
  await expect(page.getByText("Jumper wires: unlimited")).toBeVisible();
  await expect(page.getByText("Piezo buzzer: later, disconnected")).toHaveCount(0);
  await expect(page.getByText("Momentary button")).toHaveCount(0);
});

test("mobile lab keeps controls reachable without covering the whole bench", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport layout check");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return Boolean(canvas && canvas.toDataURL("image/png").length > 25000);
  });

  const inventory = page.getByRole("complementary", { name: "Reflex Course inventory" });
  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await expect(inventory.getByRole("button", { name: "10K potentiometer" })).toBeVisible();
  await expect(capstone.getByRole("button", { name: "Check board" })).toBeVisible();

  const inventoryBox = await inventory.boundingBox();
  const capstoneBox = await capstone.boundingBox();
  expect(inventoryBox).not.toBeNull();
  expect(capstoneBox).not.toBeNull();
  expect(inventoryBox!.y + inventoryBox!.height).toBeLessThan(capstoneBox!.y);

  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Live lab dashboard" })).toBeVisible();
});

test("mobile bench mode exposes a small tools dock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only bench mode");
  await page.goto("/electronics/reflexcourse/lab");
  if (await page.getByRole("button", { name: "Bench mode" }).isVisible()) {
    await page.getByRole("button", { name: "Bench mode" }).click();
  }

  await expect(page.getByLabel("Mobile bench tools")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Reflex Course inventory" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Reflex Course capstone controls" })).toHaveCount(0);

  await page.getByRole("button", { name: "Checklist" }).click();
  await expect(page.getByRole("complementary", { name: "Live build checklist" })).toContainText("Connect ESP32 GND (3V3 ground) to the power rail");
  await page.getByRole("button", { name: "Exit" }).click();
  await expect(page.getByRole("button", { name: "Bench mode" })).toBeVisible();
});

test("lab state can be shared and restored from local progress", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop utility dock covers share/restore");
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
  });
  await expect(page.getByLabel("Reflex Course inventory").getByText("10K potentiometer: placed")).toBeVisible();

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.locator(".bench-share-toast")).toContainText(/Lab state/);
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.getByLabel("Reflex Course inventory").getByText("10K potentiometer: placed")).toBeVisible();
});

test("inventory includes a quick wiring reference", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  const inventory = page.getByRole("complementary", { name: "Reflex Course inventory" });
  await inventory.getByText("Quick wiring reference").click();
  await expect(inventory).toContainText("Pot wiper");
  await expect(inventory).toContainText("GPIO34 POT");
  await expect(inventory).toContainText("GPIO25 LED");
  await expect(inventory).toContainText("LED cathode -");
});

test("course menu opens the Reflex Course guided build", async ({ page }, testInfo) => {
  await page.goto("/electronics/reflexcourse/lab");
  const menuButton = page.getByRole("button", { name: "Open course menu" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");

  const courseMenu = page.getByRole("complementary", { name: "Course menu" });
  await expect(courseMenu).toContainText("Pot to Guarded Output");
  await expect(courseMenu).toContainText("Reflex Lab 01: Pot to Guarded Output");
  await expect(courseMenu).toContainText("Lab 01A");
  await expect(courseMenu).toContainText("Live Dashboard Checkpoint");
  await expect(courseMenu).toContainText("breadboard-tested LED build");
  await expect(courseMenu).toContainText("Lab 01B");
  await expect(courseMenu).toContainText("Guarded Buzzer Output");
  await expect(courseMenu).toContainText("Motor + Fan Blade");
  await expect(courseMenu).toContainText("BME Sensor + 128x64 Display");
  await expect(courseMenu.getByText("GND To Ground Bus")).toHaveCount(0);

  await courseMenu.getByRole("button", { name: "Lab 01 Pot to Guarded Output" }).click();
  await expect(courseMenu.getByRole("button", { name: "Lab 01 Pot to Guarded Output" })).toHaveAttribute("aria-expanded", "true");
  await expect(courseMenu).toContainText("GND To Ground Bus");
  await expect(courseMenu).toContainText("Pot Wiper To GPIO34");
  await expect(courseMenu).toContainText("Resistor To Anode");
  await expect(courseMenu).toContainText("Cathode To Ground");
  await expect(courseMenu).toContainText("USB Ready");
  await courseMenu.getByRole("button", { name: "Course step: Seat The LED" }).click();
  await courseMenu.getByRole("button", { name: /Hint/ }).click();
  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("button", { name: "LED", exact: true })).toHaveClass(/is-highlighted/);
  }
});

test("course step check runs a local guided check", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "Open course menu" }).click();
  const courseMenu = page.getByRole("complementary", { name: "Course menu" });
  await courseMenu.getByRole("button", { name: "Lab 01 Pot to Guarded Output" }).click();
  await courseMenu.getByRole("button", { name: "Check step" }).click();

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await expect(capstone).toContainText("Step check paused at GND To Ground Bus");
});

test("top trainer card shows current step and n/a readout before USB", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop capstone readout is hidden in mobile bench layout");
  await page.goto("/electronics/reflexcourse/lab");
  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await expect(page.getByRole("region", { name: "Bench status and pot control" })).toContainText("Connect ESP32 GND (3V3 ground) to the power rail");
  await expect(capstone.getByLabel("Bench readout")).toContainText("n/a");
});

test("guided prompt advances after the ground jumper is connected", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await expect(capstone).toContainText("Connect 3V3 to a rail");
});

test("virtual terminal accepts typed lab commands", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "dashboard is hidden on mobile to preserve bench space");
  await page.goto("/electronics/reflexcourse/lab");
  const dashboard = await openReflexTerminal(page);
  await dashboard.getByRole("textbox", { name: "Terminal command" }).fill("status");
  await dashboard.getByRole("button", { name: "Enter" }).click();
  await expect(dashboard).toContainText("> status");
  await expect(dashboard).toContainText("Reflex Course wiring is incomplete");
});

test("placed but unwired LED and resistor do not validate as complete", async ({ page }, testInfo) => {
  test.slow();
  test.skip(testInfo.project.name === "mobile", "dashboard terminal is hidden on mobile");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectLead: (kind: "positive" | "negative", holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectLead("negative", "bottom-negative-c:15");
    lab?.connectLead("positive", "bottom-positive-c:15");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H18");
    lab?.connectComponentLead("cathode", "H20");
  });

  const dashboard = await openReflexTerminal(page);
  await dashboard.getByRole("textbox", { name: "Terminal command" }).fill("validate");
  await dashboard.getByRole("button", { name: "Enter" }).click();
  await expect(dashboard).toContainText("validation blocked");
  await expect(dashboard.getByLabel("Reflex live dashboard")).toContainText("wire check");
});

test("normal jumpers from ESP32 power pins count as rail supply", async ({ page }, testInfo) => {
  test.slow();
  test.skip(testInfo.project.name === "mobile", "dashboard terminal is hidden on mobile");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;

    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await expect(page.getByText("Active tool: 10K POT")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-negative-d:24", "#60d394");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-positive-d:24", "#ff5468");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await expect(page.getByText("Active tool: 330R")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
    lab?.connectJumper("B12", "esp32:gpio25", "#ffd45f");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await expect(page.getByText("Active tool: LED")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H16");
    lab?.connectComponentLead("cathode", "H20");
    lab?.connectJumper("B16", "I16", "#ffd45f");
    lab?.connectJumper("G20", "top-negative-d:25", "#60d394");
  });

  await page.waitForTimeout(250);
  const dashboard = await openReflexTerminal(page);
  await dashboard.getByRole("textbox", { name: "Terminal command" }).fill("validate");
  await dashboard.getByRole("button", { name: "Enter" }).click();
  await expect(dashboard).toContainText("validation ready: simulated trace can run");
  await expect(dashboard.getByText("ready").first()).toBeVisible();
});

test("live circuit validation follows nets even when rail colors are swapped", async ({ page }) => {
  test.slow();
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-positive-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-negative-d:23", "#ff5468");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await expect(page.getByText("Active tool: 10K POT")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-positive-d:24", "#60d394");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-negative-d:24", "#ff5468");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await expect(page.getByText("Active tool: 330R")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
    lab?.connectJumper("B16", "esp32:gpio25", "#ffd45f");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await expect(page.getByText("Active tool: LED")).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
          selectPart: (partId: "potentiometer" | "led" | "resistor" | null) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H12");
    lab?.connectComponentLead("cathode", "H20");
    lab?.connectJumper("B12", "I12", "#ffd45f");
    lab?.connectJumper("G20", "top-positive-d:25", "#60d394");
    lab?.selectPart(null);
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await capstone.getByRole("button", { name: "Check board" }).click();
  await expect(capstone).toContainText("Board check passed. USB is ready.", { timeout: 7000 });
  await expect(capstone.getByRole("button", { name: "Insert USB" })).toBeEnabled();
});

test("potentiometer outer leads can be swapped and invert the ADC readout", async ({ page }) => {
  test.slow();
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.getByRole("slider", { name: "Potentiometer value" }).fill("0.82");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-positive-d:24", "#ff5468");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-negative-d:24", "#60d394");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
    lab?.connectJumper("B12", "esp32:gpio25", "#ffd45f");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
          selectPart: (partId: "potentiometer" | "led" | "resistor" | null) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H16");
    lab?.connectComponentLead("cathode", "H20");
    lab?.connectJumper("B16", "I16", "#ffd45f");
    lab?.connectJumper("G20", "top-negative-d:25", "#60d394");
    lab?.selectPart(null);
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await capstone.getByRole("button", { name: "Check board" }).click();
  await expect(capstone).toContainText("Board check passed. USB is ready.", { timeout: 7000 });
  await capstone.getByRole("button", { name: "Insert USB" }).click();
  await page.getByRole("region", { name: "ESP32 pin setup" }).getByRole("button", { name: "Upload simulated firmware" }).click();
  await expect(capstone.getByLabel("Bench readout")).toContainText("0.18");
});

test("circuit snapshot propagates ESP32 3V3 and GND through actual nets", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;

    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
  });
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            circuit: {
              rails: Record<string, "positive" | "negative" | "vin" | "short" | null>;
            };
          };
        };
      }
    ).__mgeLab;
    const circuit = lab?.getState().circuit;
    return circuit?.rails["top-negative-d:23"] === "negative" && circuit?.rails["top-positive-d:23"] === "positive";
  });

  const circuit = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            circuit: {
              shorted: boolean;
              rails: Record<string, "positive" | "negative" | "vin" | "short" | null>;
              esp32: Record<string, "positive" | "negative" | "vin" | "short" | null>;
            };
          };
        };
      }
    ).__mgeLab;
    return lab?.getState().circuit;
  });

  expect(circuit?.shorted).toBe(false);
  expect(circuit?.rails["top-negative-d:23"]).toBe("negative");
  expect(circuit?.rails["top-positive-d:23"]).toBe("positive");
  expect(circuit?.rails["top-negative-a:1"]).toBeNull();
  expect(circuit?.esp32["esp32:gnd"]).toBe("negative");
  expect(circuit?.esp32["esp32:3v3"]).toBe("positive");
});

test("circuit snapshot marks 3V3 to GND as a shorted net", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;

    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
    lab?.connectJumper("top-negative-d:24", "top-positive-d:24", "#fff2a6");
  });
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            circuit: {
              shorted: boolean;
              rails: Record<string, "positive" | "negative" | "vin" | "short" | null>;
            };
          };
        };
      }
    ).__mgeLab;
    const circuit = lab?.getState().circuit;
    return circuit?.shorted && circuit.rails["top-negative-d:23"] === "short" && circuit.rails["top-positive-d:23"] === "short";
  });

  const circuit = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            circuit: {
              shorted: boolean;
              rails: Record<string, "positive" | "negative" | "vin" | "short" | null>;
            };
          };
        };
      }
    ).__mgeLab;
    return lab?.getState().circuit;
  });

  expect(circuit?.shorted).toBe(true);
  expect(circuit?.rails["top-negative-d:23"]).toBe("short");
  expect(circuit?.rails["top-positive-d:23"]).toBe("short");
});

test("capstone board check enables USB insertion and simulated OLED run", async ({ page }, testInfo) => {
  test.slow();
  test.skip(testInfo.project.name === "mobile", "desktop capstone validates the full guided ending");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;

    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-negative-d:24", "#60d394");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-positive-d:24", "#ff5468");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
    lab?.connectJumper("B12", "esp32:gpio25", "#ffd45f");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H16");
    lab?.connectComponentLead("cathode", "H20");
    lab?.connectJumper("B16", "I16", "#ffd45f");
    lab?.connectJumper("G20", "top-negative-d:25", "#60d394");
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await expect(capstone.getByText("Bench Readout")).toBeVisible();
  await capstone.getByRole("button", { name: "Check board" }).click();
  await expect(capstone).toContainText("Board check passed. USB is ready.", { timeout: 7000 });
  await expect(capstone.getByRole("button", { name: "Insert USB" })).toBeEnabled();
  await capstone.getByRole("button", { name: "Insert USB" }).click();
  const pinSetup = page.getByRole("region", { name: "ESP32 pin setup" });
  await expect(pinSetup).toBeVisible();
  await expect(pinSetup).toContainText("GPIO34 ADC");
  await expect(pinSetup).toContainText("GPIO25 PWM");
  await expect(pinSetup).toContainText("threshold_reflex_v0");
  await expect(capstone).toContainText("pin setup");
  await pinSetup.getByRole("button", { name: "Upload simulated firmware" }).click();
  await expect(pinSetup).toHaveCount(0);
  await expect(capstone).toContainText("threshold_reflex_v0");
  await page.getByRole("slider", { name: "Potentiometer value" }).fill("0");
  await expect(capstone.getByLabel("Bench readout")).toContainText("0.00");
  await page.getByRole("slider", { name: "Potentiometer value" }).fill("0.55");
  await expect(capstone.getByLabel("Bench readout")).toContainText("0.50");
  await page.getByRole("slider", { name: "Potentiometer value" }).fill("0.6");
  await expect(capstone.getByLabel("Bench readout")).toContainText("0.85");

  const dashboard = await openReflexTerminal(page);
  await expect(dashboard).toContainText("ran threshold_reflex_v0", { timeout: 4000 });
});

test("capstone controls can remove the latest jumper and refresh the bench", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop capstone controls cover the recovery path");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await capstone.getByRole("button", { name: "Remove wire" }).click();
  await expect(capstone).toContainText("Last jumper removed");
  let state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toHaveLength(0);

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
  });
  await capstone.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("region", { name: "Bench status and pot control" })).toContainText("Connect ESP32 GND (3V3 ground) to the power rail");
  state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toHaveLength(0);
});

test("jumper bypassing the LED resistor is blocked as an overcurrent fault", async ({ page }, testInfo) => {
  test.slow();
  test.skip(testInfo.project.name === "mobile", "desktop capstone validates the resistor-bypass fault");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-negative-d:24", "#60d394");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-positive-d:24", "#ff5468");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H16");
    lab?.connectComponentLead("cathode", "H20");
    lab?.connectJumper("G16", "esp32:gpio25", "#ffd45f");
    lab?.connectJumper("G20", "top-negative-d:25", "#60d394");
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await capstone.getByRole("button", { name: "Check board" }).click();
  await expect(capstone).toContainText("Place a 330 ohm resistor", { timeout: 7000 });
  await expect(capstone.getByRole("button", { name: "Insert USB" })).toBeDisabled();

  const dashboard = await openReflexTerminal(page);
  await dashboard.getByRole("textbox", { name: "Terminal command" }).fill("validate");
  await dashboard.getByRole("button", { name: "Enter" }).click();
  await expect(dashboard).toContainText("LED path is missing the series resistor");
  await expect(dashboard).toContainText("validation blocked");
});

test("reversed LED polarity is detected and the simulated LED stays dark", async ({ page }, testInfo) => {
  test.slow();
  test.skip(testInfo.project.name === "mobile", "dashboard is hidden on mobile to preserve bench space");
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gnd", "top-negative-d:23", "#60d394");
    lab?.connectJumper("esp32:3v3", "top-positive-d:23", "#ff5468");
  });

  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
    lab?.connectJumper("I2", "top-negative-d:24", "#60d394");
    lab?.connectJumper("I3", "esp32:gpio34", "#ffd45f");
    lab?.connectJumper("I4", "top-positive-d:24", "#ff5468");
  });

  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
    lab?.connectJumper("B12", "esp32:gpio25", "#ffd45f");
  });

  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          connectComponentLead: (leadId: string, holeId: string) => void;
          selectPart: (partId: "potentiometer" | "led" | "resistor" | null) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "H20");
    lab?.connectComponentLead("cathode", "H16");
    lab?.connectJumper("B16", "I16", "#ffd45f");
    lab?.connectJumper("G20", "top-negative-d:25", "#60d394");
    lab?.selectPart(null);
  });

  const capstone = page.getByRole("region", { name: "Reflex Course capstone controls" });
  await capstone.getByRole("button", { name: "Check board" }).click();
  await expect(capstone).toContainText("LED polarity is reversed", { timeout: 7000 });
  await expect(page.getByText("REVERSED")).toBeVisible();

  const dashboard = await openReflexTerminal(page);
  await dashboard.getByRole("textbox", { name: "Terminal command" }).fill("validate");
  await dashboard.getByRole("button", { name: "Enter" }).click();
  await expect(dashboard).toContainText("LED polarity is reversed");
});

test("live dashboard minimizes to the bottom dock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "dashboard is hidden on mobile to preserve bench space");
  await page.goto("/electronics/reflexcourse/lab");
  const dashboard = await openReflexLiveDashboard(page);
  await dashboard.getByRole("button", { name: "Minimize live dashboard panel" }).click();
  await expect(dashboard).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Minimized bench panels" }).getByRole("button", { name: "Dashboard" })).toBeVisible();
});

test("lets the learner choose a jumper wire color", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  const green = page.getByRole("button", { name: "green jumper wire" });
  await green.click();
  await expect(green).toHaveClass(/is-selected/);
  await page.getByRole("button", { name: "Jumper wires: unlimited" }).click();
  await expect(page.getByText("Active tool: Jumper wire")).toBeVisible();
});

test("canvas zoom controls are available without a mouse wheel", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop camera controls are hidden on mobile");
  await page.goto("/electronics/reflexcourse/lab");
  const zoomControls = page.getByLabel("Zoom controls");
  await expect(zoomControls).toBeVisible();
  await zoomControls.getByRole("button", { name: "Zoom in" }).click();
  await zoomControls.getByRole("button", { name: "Zoom out" }).click();
  await expect(zoomControls.getByRole("button", { name: "Zoom in" })).toBeEnabled();
});

test("jumper tool places a two-end breadboard jumper", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop coordinate test covers jumper placement");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "green jumper wire" }).click();
  await page.getByRole("button", { name: "Jumper wires: unlimited" }).click();
  await expect(page.getByText("Active tool: Jumper wire")).toBeVisible();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await page.mouse.click(725, 430);
  await expect(page.getByText("click second hole to place wire")).toBeVisible();
  await page.mouse.click(770, 430);

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toHaveLength(1);
  expect(state?.jumperConnections[0].color).toBe("#60d394");
});

test("empty bench hole clicks start an implicit jumper wire", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop coordinate test covers jumper placement");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );

  await expect(page.getByText("click first hole")).toBeVisible();
  await page.mouse.click(725, 430);
  await expect(page.getByText("click second hole to place wire")).toBeVisible();
  await page.mouse.click(770, 430);

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toHaveLength(1);
  expect(state?.jumperConnections[0].color).toBe("#ffd45f");
});

test("ESP32 GND and 3V3 remain available for jumper placement after component work", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "LED", exact: true }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          selectPart: (partId: "potentiometer" | "led" | "resistor" | null) => void;
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("cathode", "A12");
    lab?.connectComponentLead("anode", "A13");
    lab?.selectPart(null);
    lab?.connectJumper("esp32:gnd", "top-negative-a:1", "#1f2427");
    lab?.connectJumper("esp32:3v3", "top-positive-a:1", "#ff5468");
  });
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState().jumperConnections.length === 2;
  });

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toContainEqual({ from: "esp32:gnd", to: "top-negative-a:1", color: "#1f2427" });
  expect(state?.jumperConnections).toContainEqual({ from: "esp32:3v3", to: "top-positive-a:1", color: "#ff5468" });
});

test("jumper tool can land on ESP32 course pins", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "Jumper wires: unlimited" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectJumper: (fromHoleId: string, toHoleId: string, color?: string) => void;
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    lab?.connectJumper("esp32:gpio34", "J3", "#ffd45f");
  });
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState().jumperConnections.length === 1;
  });

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            jumperConnections: { from: string; to: string; color: string }[];
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.jumperConnections).toContainEqual({
    from: "esp32:gpio34",
    to: "J3",
    color: "#ffd45f"
  });
});

test("selecting an inventory component makes it active", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await expect(page.getByText("Active tool: 10K POT")).toBeVisible();
  await expect(page.getByRole("region", { name: "Reflex Course capstone controls" })).toContainText("Place 10K POT GND outer leg");
  await expect(page.getByRole("button", { name: "10K potentiometer" })).toHaveClass(/is-active/);
});

test("potentiometer slider updates the knob value", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  const slider = page.getByRole("slider", { name: "Potentiometer value" });
  await expect(slider).toBeVisible();
  await slider.fill("0.82");
  await expect(page.getByLabel("Reflex Course inventory").getByText("0.82", { exact: true })).toBeVisible();
});

test("placed potentiometer keeps an interactive knob home", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
  });

  const inventory = page.getByLabel("Reflex Course inventory");
  await expect(inventory.getByText("10K potentiometer: placed")).toBeVisible();
  await expect(inventory.getByText("Pot control")).toBeVisible();
  const slider = inventory.getByRole("slider", { name: "Potentiometer value" });
  await slider.fill("0.27");
  await expect(inventory.getByText("0.27", { exact: true })).toBeVisible();
});

test("potentiometer placement advances leads and blocks occupied holes", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await expect(page.getByText(/GND outer selected/)).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
  });
  await expect(page.getByText(/Wiper selected/)).toBeVisible();
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("wiper", "J2");
  });
  await expect(page.locator(".placement-warning-toast")).toContainText("J2 is already occupied");
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            selectedComponentLead: string | null;
            componentConnections: Record<string, string>;
          };
        };
      }
    ).__mgeLab;
    const state = lab?.getState();
    return state?.selectedComponentLead === "wiper" && state.componentConnections["potentiometer:wiper"] === undefined;
  });

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            selectedComponentLead: string | null;
            componentConnections: Record<string, string>;
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.selectedComponentLead).toBe("wiper");
  expect(state?.componentConnections["potentiometer:gnd"]).toBe("J2");
  expect(state?.componentConnections["potentiometer:wiper"]).toBeUndefined();
});

test("placed potentiometer uses the inventory pot control", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop inventory control covers placed knob interaction");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "10K potentiometer" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("gnd", "J2");
    lab?.connectComponentLead("wiper", "J3");
    lab?.connectComponentLead("vcc", "J4");
  });

  const inventory = page.getByLabel("Reflex Course inventory");
  await expect(inventory.getByText("Pot control")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open placed potentiometer controls" })).toHaveCount(0);
  const slider = inventory.getByRole("slider", { name: "Potentiometer value" });
  await slider.fill("0.6");
  await expect(slider).toHaveValue("0.6");
});

test("resistor lead placement updates the pin readout", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
    lab?.connectComponentLead("right", "A16");
  });
  const inventory = page.getByLabel("Reflex Course inventory");
  await expect(inventory.getByText("330 ohm resistor: placed")).toBeVisible();
  await expect(inventory.getByRole("button", { name: "330 ohm resistor" })).toHaveCount(0);
});

test("resistor rejects a too-tight lead span", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("left", "A12");
  });
  await page.waitForFunction(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            componentConnections: Record<string, string>;
          };
        };
      }
    ).__mgeLab;
    return lab?.getState().componentConnections["resistor:left"] === "A12";
  });
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectComponentLead: (leadId: string, holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectComponentLead("right", "A14");
  });

  await expect(page.locator(".placement-warning-toast")).toContainText(
    "Resistor lead span is too tight. Use at least four columns, like A10 to A14."
  );
  await expect(page.getByLabel("Reflex Course inventory").getByText("330 ohm resistor: placed")).toHaveCount(0);
});

test("part tool lead selection places the next breadboard hole click", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop coordinate test covers part-tool to canvas handoff");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "LED", exact: true }).click();
  await expect(page.getByText(/Anode \+ selected/)).toBeVisible();

  await page.mouse.click(725, 430);

  const inventory = page.getByLabel("Reflex Course inventory");
  await expect(inventory).toContainText(/Anode \+: (?!not placed)/);
});

test("completed component stays placed when selecting another component", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "LED", exact: true }).click();
  await expect(page.getByText("Active tool: LED")).toBeVisible();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          selectPart: (partId: "potentiometer" | "led" | "resistor" | null) => void;
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "A12");
    lab?.connectComponentLead("cathode", "A13");
    lab?.selectPart(null);
  });

  const inventory = page.getByLabel("Reflex Course inventory");
  await expect(inventory.getByRole("button", { name: "LED", exact: true })).toHaveCount(0);
  await expect(inventory.getByText("LED: placed")).toBeVisible();
  await page.getByRole("button", { name: "330 ohm resistor" }).click();
  await expect(page.getByText("Active tool: 330R")).toBeVisible();
  await expect(inventory.getByRole("button", { name: "LED", exact: true })).toHaveCount(0);
  await expect(inventory.getByText("LED: placed")).toBeVisible();
});

test("neutral bench clicks do not place supply jumpers after a component is placed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop coordinate test covers neutral canvas clicks");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "LED", exact: true }).click();
  await expect(page.getByText("Active tool: LED")).toBeVisible();
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          connectComponentLead: (leadId: string, holeId: string) => void;
          getState: () => {
            wiringMode: string;
            leadConnections: { positive: string | null; negative: string | null };
          };
        };
      }
    ).__mgeLab;
    lab?.connectComponentLead("anode", "A12");
    lab?.connectComponentLead("cathode", "A13");
  });
  await expect(page.getByLabel("Reflex Course inventory").getByText("LED: placed")).toBeVisible();

  await page.mouse.click(725, 430);

  const state = await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: {
          getState: () => {
            wiringMode: string;
            leadConnections: { positive: string | null; negative: string | null };
          };
        };
      }
    ).__mgeLab;
    return lab?.getState();
  });
  expect(state?.wiringMode).toBe("component");
  expect(state?.leadConnections.positive).toBeNull();
  expect(state?.leadConnections.negative).toBeNull();
});

test("desktop camera view selector can focus the ESP32", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "camera view buttons are hidden on mobile");
  await page.goto("/electronics/reflexcourse/lab");
  const cameraPanel = page.getByLabel("Camera view controls");
  await expect(cameraPanel).toBeVisible();
  await cameraPanel.getByRole("button", { name: "ESP32" }).click();
  await expect(cameraPanel.getByRole("button", { name: "ESP32" })).toHaveClass(/is-active/);
});

test("jumper tool does not lock the desktop camera selector", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "camera view buttons are hidden on mobile");
  await page.goto("/electronics/reflexcourse/lab");
  await page.getByRole("button", { name: "Jumper wires: unlimited" }).click();
  await expect(page.getByText("Active tool: Jumper wire")).toBeVisible();

  const cameraPanel = page.getByLabel("Camera view controls");
  await cameraPanel.getByRole("button", { name: "ESP32" }).click();
  await expect(cameraPanel.getByRole("button", { name: "ESP32" })).toHaveClass(/is-active/);
});

test("renders a nonblank breadboard canvas", async ({ page }) => {
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100 && canvas.toDataURL("image/png").length > 25000;
  });
});

test("frying a shared net shows refresh action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop scene test covers the fried-board visual path");
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/electronics/reflexcourse/lab");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return Boolean(canvas && canvas.toDataURL("image/png").length > 25000);
  });
  await page.waitForFunction(() =>
    Boolean((window as Window & { __mgeLab?: unknown }).__mgeLab)
  );
  await page.evaluate(() => {
    const lab = (
      window as Window & {
        __mgeLab?: { connectLead: (kind: "positive" | "negative", holeId: string) => void };
      }
    ).__mgeLab;
    lab?.connectLead("positive", "top-positive-a:1");
    lab?.connectLead("negative", "top-positive-a:5");
  });
  await expect(page.getByText("Board is fried.")).toBeVisible();
  await expect(page.getByText("current would rush straight through the supply")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh board" })).toBeVisible();
  await page.getByRole("button", { name: "Refresh board" }).click();
  await expect(page.getByText("Board is fried.")).toHaveCount(0);
});
