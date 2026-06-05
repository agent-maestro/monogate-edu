`timescale 1ns / 1ps

module debounce #(
    parameter WIDTH = 20
) (
    input wire clk,
    input wire reset_n,
    input wire noisy,
    output reg clean
);
    reg [WIDTH-1:0] count;
    reg sync_0;
    reg sync_1;

    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            sync_0 <= 1'b0;
            sync_1 <= 1'b0;
            clean <= 1'b0;
            count <= {WIDTH{1'b0}};
        end else begin
            sync_0 <= noisy;
            sync_1 <= sync_0;
            if (sync_1 == clean) begin
                count <= {WIDTH{1'b0}};
            end else begin
                count <= count + 1'b1;
                if (&count) begin
                    clean <= sync_1;
                    count <= {WIDTH{1'b0}};
                end
            end
        end
    end
endmodule
