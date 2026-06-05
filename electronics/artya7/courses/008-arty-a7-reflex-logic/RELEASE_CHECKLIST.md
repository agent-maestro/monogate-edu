# Course 008 Release Checklist

Status: draft

## Tier 1 Resources

| Resource | Status | Notes |
| --- | --- | --- |
| Course README | draft | Initial planning skeleton exists. |
| Syllabus | draft | Needs learner copy pass. |
| Bill of materials | draft | Use onboard-only core build. |
| Step-by-step guide | missing | Split into simulation and optional hardware paths. |
| Reference diagram | missing | Needs Arty surface map: switches, buttons, LEDs, UART. |
| RTL links | ready draft | Reuse `boards/arty_a7/rtl/`. |
| Constraints link | ready draft | Reuse `boards/arty_a7/constraints/arty_a7_reflex.xdc`. |
| Validation scripts | ready draft | Reuse `boards/arty_a7/validation/`. |
| Evidence template | draft | Start from `demos/fpga_reflex_led_buzzer/EVIDENCE_MANIFEST_TEMPLATE.json`. |
| Troubleshooting guide | missing | Include Vivado, COM port, UART, bitstream, reset, switch sweep. |
| Short theory note | missing | Fixed-point, synchronous logic, guard clamp. |
| Release boundary | draft | No Pmods required; no external loads. |

## Launch Blockers

- Decide whether Course 008 ships as simulation-only first or includes an
  operator-approved hardware Lab 02.
- Confirm Arty A7 board revision and XDC assumptions.
- Publish the public course index route at `/electronics/artya7/courses`.
- Build a small dashboard/simulator route or adapt the existing lab dashboard
  to display `switch_bits`.
- Create a clean evidence packet template for FPGA simulation and hardware.

## Explicit Non-Goals

- No Pmod I2S2 audio in Course 008.
- No VGA or OLED graphics in Course 008.
- No external power or actuators.
- No QSPI/configuration flash programming.
- No claim that Forge generated the existing RTL until that path is actually
  implemented and checked.

