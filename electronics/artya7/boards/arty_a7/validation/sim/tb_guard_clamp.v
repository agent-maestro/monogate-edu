`timescale 1ns / 1ps

module tb_guard_clamp;
    reg [7:0] requested_output_q8 = 8'd0;
    reg [7:0] max_output_q8 = 8'd153;
    wire [7:0] safe_output_q8;
    wire signed [8:0] safety_margin_signed;
    wire guard_action;
    wire [1:0] bottleneck_id;

    guard_clamp dut(
        .requested_output_q8(requested_output_q8),
        .max_output_q8(max_output_q8),
        .safe_output_q8(safe_output_q8),
        .safety_margin_signed(safety_margin_signed),
        .guard_action(guard_action),
        .bottleneck_id(bottleneck_id)
    );

    initial begin
        requested_output_q8 = 8'd100;
        #1;
        if (safe_output_q8 !== 8'd100 || guard_action !== 1'b0 || safety_margin_signed < 0) begin
            $display("FAIL: pass-through guard case");
            $finish;
        end
        requested_output_q8 = 8'd200;
        #1;
        if (safe_output_q8 !== 8'd153 || guard_action !== 1'b1 || safety_margin_signed >= 0) begin
            $display("FAIL: clamped guard case");
            $finish;
        end
        $display("PASS tb_guard_clamp");
        $finish;
    end
endmodule
