`timescale 1ns / 1ps

module guard_clamp (
    input wire [7:0] requested_output_q8,
    input wire [7:0] max_output_q8,
    output reg [7:0] safe_output_q8,
    output reg [7:0] safety_margin_q8,
    output reg guard_action,
    output reg bottleneck_id
);
    localparam ACTION_PASS_THROUGH = 1'b0;
    localparam ACTION_CLAMPED = 1'b1;
    localparam BOTTLENECK_NONE = 1'b0;
    localparam BOTTLENECK_DUTY_MARGIN = 1'b1;

    always @(*) begin
        if (requested_output_q8 > max_output_q8) begin
            safe_output_q8 = max_output_q8;
            safety_margin_q8 = 8'd0;
            guard_action = ACTION_CLAMPED;
            bottleneck_id = BOTTLENECK_DUTY_MARGIN;
        end else begin
            safe_output_q8 = requested_output_q8;
            safety_margin_q8 = max_output_q8 - requested_output_q8;
            guard_action = ACTION_PASS_THROUGH;
            bottleneck_id = BOTTLENECK_NONE;
        end
    end
endmodule
