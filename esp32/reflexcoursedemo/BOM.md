# Reflex Lab 01 Bill Of Materials

## Required Parts

| Qty | Part | Value / Type | Notes |
| --- | --- | --- | --- |
| 1 | ESP32 DevKit | ESP32-WROOM style | Course firmware targets ESP32 Arduino. |
| 2 | Mini breadboards | Solderless | Used beside the ESP32 to extend pin access. |
| 1 | Main breadboard | Solderless | Used for pot, LED, button, buzzer, and jumpers. |
| 1 | Potentiometer | 10 kOhm | Analog input to GPIO34. |
| 1 | LED | Standard red or similar | Output indicator. |
| 1 | Resistor | 330 ohm | LED current limiting. |
| 1 | Passive piezo buzzer | Passive piezo disc/buzzer | GPIO26 output path. |
| 1 | Resistor | 1 kOhm, brown-black-black-brown-brown | Buzzer series resistor. |
| 1 | Tactile button | 2-pin or 4-pin breadboard button | GPIO27 to GND, using ESP32 internal pullup. |
| several | Jumper wires | Male-male | Use colors consistently where possible. |
| 1 | USB cable | Data-capable | Needed for programming and live serial capture. |

## Acceptable Substitutions

- LED color can change if the resistor remains in series.
- A 4-pin tactile switch is fine; use one pair that closes when pressed.
- The buzzer must be passive for tone/PWM-style behavior. An active buzzer may
  work differently and should be documented as a substitution.

## Safety Notes

- Do not connect the potentiometer to 5V for this course.
- Do not drive the LED without a resistor.
- Do not connect motors, relays, solenoids, or external high-current loads.
- Unplug USB before changing the 01B button/buzzer wiring.
