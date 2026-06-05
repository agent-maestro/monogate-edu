# Arty A7-100T Pin Map

Source: Digilent `Arty-A7-100-Master.xdc` from `digilent-xdc`.

Status: needs bench verification before programming. The constraints are
prepared for the Arty A7-100T Rev. D/E master XDC naming, but this repository
has not programmed or validated the physical board.

## Assumptions

- Board: Digilent Arty A7-100T.
- Clock: 100 MHz onboard clock on `CLK100MHZ`.
- USB-UART is available through the onboard FTDI interface.
- Inputs: 4 slide switches and 4 push buttons.
- Outputs: 4 user LEDs and 4 RGB LEDs.
- Pmod connectors are deferred.
- No ESP32 or external sensors are assumed.

## Ports

| Signal | FPGA pin | I/O standard | Notes |
| --- | --- | --- | --- |
| `CLK100MHZ` | E3 | LVCMOS33 | 100 MHz system clock |
| `sw[0]` | A8 | LVCMOS33 | switch bit 0 |
| `sw[1]` | C11 | LVCMOS33 | switch bit 1 |
| `sw[2]` | C10 | LVCMOS33 | switch bit 2 |
| `sw[3]` | A10 | LVCMOS33 | switch bit 3 |
| `btn[0]` | D9 | LVCMOS33 | perturb input |
| `btn[1]` | C9 | LVCMOS33 | mode input |
| `btn[2]` | B9 | LVCMOS33 | reserved |
| `btn[3]` | B8 | LVCMOS33 | reset input |
| `led[0]` | H5 | LVCMOS33 | safe output bit 0 |
| `led[1]` | J5 | LVCMOS33 | safe output bit 1 |
| `led[2]` | T9 | LVCMOS33 | safe output bit 2 |
| `led[3]` | T10 | LVCMOS33 | clamp state / heartbeat |
| `led0_b` | E1 | LVCMOS33 | RGB intensity |
| `led0_g` | F6 | LVCMOS33 | RGB pass-through |
| `led0_r` | G6 | LVCMOS33 | RGB clamped |
| `led1_b` | G4 | LVCMOS33 | spare |
| `led1_g` | J4 | LVCMOS33 | spare |
| `led1_r` | G3 | LVCMOS33 | spare |
| `led2_b` | H4 | LVCMOS33 | spare |
| `led2_g` | J2 | LVCMOS33 | spare |
| `led2_r` | J3 | LVCMOS33 | spare |
| `led3_b` | K2 | LVCMOS33 | spare |
| `led3_g` | H6 | LVCMOS33 | spare |
| `led3_r` | K1 | LVCMOS33 | spare |
| `uart_txd` | D10 | LVCMOS33 | FPGA TX to host USB-UART in current bench build |

## Notes

- Bench note: COM5 produced traffic on D10 during first bring-up; A9 produced
  no observed host bytes on this board/driver path. Treat this UART mapping as
  bench-observed and still subject to final schematic review.
- All external analog/Pmod/XADC paths are deferred.
