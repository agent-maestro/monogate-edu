# Reflex Lab 01 Firmware

Canonical firmware lives with the kernel:

```text
kernels/threshold_reflex_v0/esp32/threshold_reflex_v0/threshold_reflex_v0.ino
```

The pin map is:

| Signal | ESP32 Pin | Direction |
| --- | --- | --- |
| Potentiometer wiper | GPIO34 | input |
| LED output | GPIO25 | output |
| Passive piezo buzzer | GPIO26 | output |
| Button mute input | GPIO27 | input pullup |

The firmware emits JSONL serial frames for the dashboard. The dashboard adds
laptop receive timestamps for human log time; the ESP32 still emits firmware
uptime as `timestamp_ms`.

## Laptop Toolchain Note

Use the D-drive Arduino CLI/toolchain documented in `WELCOME.md`. Do not
reinstall Arduino or ESP32 board packages onto `C:` during this course.
