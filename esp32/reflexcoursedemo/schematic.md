# Reflex Lab 01 Reference Schematic

This is a reference connection schematic for the breadboard build. It is not a
PCB layout.

## Power

```text
ESP32 3V3  -> breadboard + rail
ESP32 GND  -> breadboard - rail
```

All signal returns share ESP32 GND.

## Potentiometer Input

```text
10 kOhm potentiometer outer leg -> 3V3
10 kOhm potentiometer outer leg -> GND
10 kOhm potentiometer wiper     -> GPIO34
```

GPIO34 is input-only on the ESP32, which makes it a good analog input for this
course.

## LED Output

```text
GPIO25 -> 330 ohm resistor -> LED anode (+)
LED cathode (-) -> GND
```

The resistor must stay in series with the LED.

## Buzzer Output

```text
GPIO26 -> 1 kOhm resistor -> passive piezo +
passive piezo - -> GND
```

The dashboard records the guarded buzzer command as part of the evidence trace.

## Button Input

```text
GPIO27 -> tactile button -> GND
```

The firmware uses `INPUT_PULLUP`, so the button reads released when open and
pressed when it connects GPIO27 to GND.

## Signal Story

```text
Pot(GPIO34) -> threshold_reflex_v0 -> Guard -> LED(GPIO25)
                                      Guard -> Buzzer(GPIO26)
Button(GPIO27) -----------------------------> Buzzer mute state
```

## Future PCB Note

KiCad files are not required for the ESP32-001 breadboard release. If this
course later grows a soldered or PCB variant, add KiCad source and PDF exports
under this folder without changing the breadboard evidence claim.
