`timescale 1ns / 1ps

module uart_tx #(
    parameter CLOCK_HZ = 100000000,
    parameter BAUD = 115200
) (
    input wire clk,
    input wire reset_n,
    input wire start,
    input wire [7:0] data,
    output reg tx,
    output reg busy
);
    localparam integer CLKS_PER_BIT = CLOCK_HZ / BAUD;

    reg [15:0] clk_count;
    reg [3:0] bit_index;
    reg [9:0] shift;

    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            tx <= 1'b1;
            busy <= 1'b0;
            clk_count <= 16'd0;
            bit_index <= 4'd0;
            shift <= 10'b1111111111;
        end else if (start && !busy) begin
            tx <= 1'b0;
            shift <= {1'b1, data, 1'b0};
            busy <= 1'b1;
            clk_count <= 16'd0;
            bit_index <= 4'd0;
        end else if (busy) begin
            if (clk_count == CLKS_PER_BIT - 1) begin
                clk_count <= 16'd0;
                if (bit_index == 4'd9) begin
                    busy <= 1'b0;
                    bit_index <= 4'd0;
                    tx <= 1'b1;
                end else begin
                    bit_index <= bit_index + 4'd1;
                    tx <= shift[bit_index + 1'b1];
                end
            end else begin
                clk_count <= clk_count + 16'd1;
            end
        end
    end
endmodule
