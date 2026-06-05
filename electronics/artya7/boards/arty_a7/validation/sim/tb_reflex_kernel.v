`timescale 1ns / 1ps

module tb_reflex_kernel;
    reg clk = 1'b0;
    reg rst = 1'b1;
    reg [7:0] pot_raw_q8 = 8'd0;
    reg perturb = 1'b0;
    wire [7:0] requested_output_q8;
    wire [7:0] led_level_q8;

    reflex_kernel dut(
        .clk(clk),
        .rst(rst),
        .pot_raw_q8(pot_raw_q8),
        .perturb(perturb),
        .requested_output_q8(requested_output_q8),
        .led_level_q8(led_level_q8)
    );

    always #5 clk = ~clk;

    initial begin
        #20 rst = 1'b0;
        pot_raw_q8 = 8'd64;
        perturb = 1'b0;
        #10;
        if (requested_output_q8 !== 8'd64) begin
            $display("FAIL: pass-through requested output");
            $finish;
        end
        perturb = 1'b1;
        #10;
        if (requested_output_q8 !== 8'd96) begin
            $display("FAIL: perturb requested output");
            $finish;
        end
        pot_raw_q8 = 8'd250;
        #10;
        if (requested_output_q8 !== 8'hff) begin
            $display("FAIL: saturating requested output");
            $finish;
        end
        $display("PASS tb_reflex_kernel");
        $finish;
    end
endmodule
