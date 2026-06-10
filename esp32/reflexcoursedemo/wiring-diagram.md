# Wiring Diagram

## ESP32 Pins

| ESP32 Pin | Connects To | Purpose |
| --- | --- | --- |
| 3V3 | Breadboard 3.3V rail, potentiometer outer leg | Power reference |
| GND | Breadboard ground rail | Shared ground |
| GPIO34 | Potentiometer middle wiper | Analog input |
| GPIO25 | 330 ohm resistor -> LED anode | LED PWM output |
| GPIO26 | 1K resistor -> piezo buzzer + | Buzzer PWM output |
| GPIO27 | Push button signal side | Mute button input |

## Component Returns

| Component | Return Connection |
| --- | --- |
| Potentiometer low outer leg | GND rail |
| LED cathode | GND rail |
| Piezo buzzer - | GND rail |
| Push button other side | GND rail |

The button uses the ESP32 internal pull-up resistor in firmware. Pressing the
button connects GPIO27 to ground.
