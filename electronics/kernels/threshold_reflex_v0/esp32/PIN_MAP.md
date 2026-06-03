# ESP32 Pin Map

Suggested pins for the starter course:

| Signal | ESP32 pin | Notes |
| --- | --- | --- |
| Potentiometer wiper | GPIO34 | ADC input, 3.3V max |
| LED output | GPIO25 | Use series resistor |
| Piezo output | GPIO26 | Disabled in first LED-only firmware unless `ENABLE_BUZZER` is set true |
| Stepper IN1 | GPIO14 | ULN2003 input |
| Stepper IN2 | GPIO27 | ULN2003 input |
| Stepper IN3 | GPIO32 | ULN2003 input |
| Stepper IN4 | GPIO33 | ULN2003 input |

All grounds must be common. Do not power motors from `3V3`.

First Reflex Course evidence run:

- use only GPIO34 potentiometer input and GPIO25 LED output;
- leave GPIO26 buzzer disconnected unless the buzzer current path has been
  reviewed;
- keep stepper pins unused.
