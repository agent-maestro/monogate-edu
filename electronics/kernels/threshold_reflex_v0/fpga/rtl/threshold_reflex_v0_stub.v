// Educational stub for threshold_reflex_v0.
// Fill this in during the FPGA lesson.

module threshold_reflex_v0_stub (
    input wire clk,
    input wire rst,
    input wire [3:0] switch_bits,
    output wire [7:0] safe_output
);
  assign safe_output = {switch_bits, 4'b0000};
endmodule
