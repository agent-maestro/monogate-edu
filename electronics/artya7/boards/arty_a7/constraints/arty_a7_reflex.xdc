## Arty A7 Reflex Constraints
##
## Status: PIN_REFERENCE_VERIFIED_AGAINST_DIGILENT_ARTY_A7_100_MASTER_XDC.
##
## Compared on 2026-05-15 against Digilent digilent-xdc:
## https://github.com/Digilent/digilent-xdc/blob/master/Arty-A7-100-Master.xdc
##
## This is reference verification only. It is not a hardware programming test
## and does not certify board safety. Programming still requires explicit user
## approval.

## Clock: official CLK100MHZ / Sch=gclk[100]
set_property -dict { PACKAGE_PIN E3 IOSTANDARD LVCMOS33 } [get_ports { clk_100mhz }]
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports { clk_100mhz }]

## Switches: official sw[0]..sw[3]
set_property -dict { PACKAGE_PIN A8 IOSTANDARD LVCMOS33 } [get_ports { sw[0] }]
set_property -dict { PACKAGE_PIN C11 IOSTANDARD LVCMOS33 } [get_ports { sw[1] }]
set_property -dict { PACKAGE_PIN C10 IOSTANDARD LVCMOS33 } [get_ports { sw[2] }]
set_property -dict { PACKAGE_PIN A10 IOSTANDARD LVCMOS33 } [get_ports { sw[3] }]

## Buttons: official btn[0] and btn[1]. btn[2]/btn[3] are deferred in v0 RTL.
set_property -dict { PACKAGE_PIN D9 IOSTANDARD LVCMOS33 } [get_ports { reset_n }]
set_property -dict { PACKAGE_PIN C9 IOSTANDARD LVCMOS33 } [get_ports { btn_perturb }]

## LEDs: official led[4]..led[7] package pins exposed as local led[0]..led[3].
set_property -dict { PACKAGE_PIN H5 IOSTANDARD LVCMOS33 } [get_ports { led[0] }]
set_property -dict { PACKAGE_PIN J5 IOSTANDARD LVCMOS33 } [get_ports { led[1] }]
set_property -dict { PACKAGE_PIN T9 IOSTANDARD LVCMOS33 } [get_ports { led[2] }]
set_property -dict { PACKAGE_PIN T10 IOSTANDARD LVCMOS33 } [get_ports { led[3] }]

## Clamp indicator: official RGB LED0 red / led0_r.
set_property -dict { PACKAGE_PIN G6 IOSTANDARD LVCMOS33 } [get_ports { led_clamped }]

## UART FPGA-to-host TX: official uart_rxd_out pin on the USB-UART bridge.
## Digilent's UART signal names are from the USB/DTE point of view; D10 is the
## FPGA output path that reaches the host COM port.
set_property -dict { PACKAGE_PIN D10 IOSTANDARD LVCMOS33 } [get_ports { uart_tx_pin }]
