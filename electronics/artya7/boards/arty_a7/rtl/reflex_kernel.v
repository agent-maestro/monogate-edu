`timescale 1ns / 1ps

module reflex_kernel (
    input wire [3:0] switch_value,
    input wire perturb,
    output reg [7:0] requested_output_q8
);
    reg [8:0] base_q9;
    reg [8:0] perturbed_q9;

    always @(*) begin
        base_q9 = switch_value * 9'd17;
        perturbed_q9 = base_q9 + (perturb ? 9'd32 : 9'd0);
        requested_output_q8 = perturbed_q9 > 9'd255 ? 8'd255 : perturbed_q9[7:0];
    end
endmodule
