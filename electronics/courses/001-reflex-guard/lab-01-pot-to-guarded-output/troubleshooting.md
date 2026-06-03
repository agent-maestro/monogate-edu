# Reflex Lab 01 Troubleshooting

## Stop Conditions

Unplug USB immediately if:

- anything gets warm;
- the ESP32 repeatedly resets;
- the LED is connected without a resistor;
- the potentiometer is connected to 5V;
- smoke, smell, or visible damage appears.

## Pot Reads Wrong

- Confirm the pot outer legs go to 3V3 and GND.
- Confirm the center wiper goes to GPIO34.
- Confirm the dashboard is connected to the correct COM port.
- Rotate the pot slowly and watch `pot_raw`.

## LED Does Not Light

- Check LED polarity: anode to resistor/output path, cathode to GND.
- Confirm the 330 ohm resistor is in series.
- Confirm firmware is using GPIO25.
- Use the dashboard graph to see whether safe output is above threshold.

## Buzzer Is Faint Or Silent

- Confirm the buzzer path is GPIO26 -> 1 kOhm -> piezo positive.
- Confirm piezo negative goes to GND.
- Confirm the part is passive. Active buzzers behave differently.
- Check whether the button is pressed; the button mutes the buzzer.

## Button Does Nothing

- Confirm the button connects GPIO27 to GND when pressed.
- For a 4-pin tactile switch, use a pair that closes across the gap.
- The firmware uses `INPUT_PULLUP`, so no external pullup resistor is needed.
- Watch the dashboard Button card for `up` and `down`.

## Replay Looks Wrong

- Start capture only when ready to record the run.
- Export a fresh replay after firmware/dashboard changes.
- Use Recent Events or Session Log as bookmarks to jump to key frames.
- Check whether the replay is from an older downloaded HTML file.

## Evidence Packet Is Still Draft

That is expected until photos, live JSONL, replay output, validation output,
and human findings are added.
