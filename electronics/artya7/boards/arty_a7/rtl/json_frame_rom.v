`timescale 1ns / 1ps

module json_frame_rom (
    input wire [8:0] index,
    input wire [3:0] switch_value,
    input wire [7:0] requested_output_q8,
    input wire [7:0] safe_output_q8,
    input wire [7:0] safety_margin_q8,
    input wire guard_action,
    input wire [3:0] sample_digit,
    output reg [7:0] byte_out,
    output wire last
);
    localparam integer FRAME_CLAMP_LEN = 499;
    localparam integer FRAME_PASS_LEN = 484;
    localparam [FRAME_CLAMP_LEN*8-1:0] FRAME_CLAMP =
        "{\"schema_version\":\"substrate-demo-v0.serial-frame.v0\",\"source_mode\":\"fpga_serial\",\"sample_index\":0,\"timestamp_ms\":0,\"kernel_sha256\":\"5d08115863c5a350f180978ca2ec9b0cb6a3da8550503936973295796e9f0b8a\",\"pot_raw\":0.0,\"switch_bits\":\"0000\",\"outputs\":{\"buzzer\":0.0,\"led\":0.0,\"status\":0.0,\"oled\":0.0},\"latency\":{\"fpga_loop\":{\"unit\":\"us\",\"value\":20.0}},\"guard\":{\"requested_output\":0.0,\"safe_output\":0.0,\"safety_margin\":0.0,\"bottleneck\":\"duty_margin\",\"guard_action\":\"clamp_to_safe_output\",\"simulated\":false}}\n";
    localparam [FRAME_PASS_LEN*8-1:0] FRAME_PASS =
        "{\"schema_version\":\"substrate-demo-v0.serial-frame.v0\",\"source_mode\":\"fpga_serial\",\"sample_index\":0,\"timestamp_ms\":0,\"kernel_sha256\":\"5d08115863c5a350f180978ca2ec9b0cb6a3da8550503936973295796e9f0b8a\",\"pot_raw\":0.0,\"switch_bits\":\"0000\",\"outputs\":{\"buzzer\":0.0,\"led\":0.0,\"status\":0.0,\"oled\":0.0},\"latency\":{\"fpga_loop\":{\"unit\":\"us\",\"value\":20.0}},\"guard\":{\"requested_output\":0.0,\"safe_output\":0.0,\"safety_margin\":0.0,\"bottleneck\":\"none\",\"guard_action\":\"pass_through\",\"simulated\":false}}\n";

    assign last = guard_action ? (index == FRAME_CLAMP_LEN - 1) : (index == FRAME_PASS_LEN - 1);

    function [3:0] q8_to_tenths;
        input [7:0] value_q8;
        begin
            if (value_q8 < 8'd13) q8_to_tenths = 4'd0;
            else if (value_q8 < 8'd39) q8_to_tenths = 4'd1;
            else if (value_q8 < 8'd64) q8_to_tenths = 4'd2;
            else if (value_q8 < 8'd90) q8_to_tenths = 4'd3;
            else if (value_q8 < 8'd115) q8_to_tenths = 4'd4;
            else if (value_q8 < 8'd141) q8_to_tenths = 4'd5;
            else if (value_q8 < 8'd166) q8_to_tenths = 4'd6;
            else if (value_q8 < 8'd192) q8_to_tenths = 4'd7;
            else if (value_q8 < 8'd217) q8_to_tenths = 4'd8;
            else if (value_q8 < 8'd243) q8_to_tenths = 4'd9;
            else q8_to_tenths = 4'd10;
        end
    endfunction

    function [3:0] switch_to_tenths;
        input [3:0] value;
        begin
            case (value)
                4'd0: switch_to_tenths = 4'd0;
                4'd1: switch_to_tenths = 4'd1;
                4'd2: switch_to_tenths = 4'd1;
                4'd3: switch_to_tenths = 4'd2;
                4'd4: switch_to_tenths = 4'd3;
                4'd5: switch_to_tenths = 4'd3;
                4'd6: switch_to_tenths = 4'd4;
                4'd7: switch_to_tenths = 4'd5;
                4'd8: switch_to_tenths = 4'd5;
                4'd9: switch_to_tenths = 4'd6;
                4'd10: switch_to_tenths = 4'd7;
                4'd11: switch_to_tenths = 4'd7;
                4'd12: switch_to_tenths = 4'd8;
                4'd13: switch_to_tenths = 4'd9;
                4'd14: switch_to_tenths = 4'd9;
                default: switch_to_tenths = 4'd10;
            endcase
        end
    endfunction

    function [7:0] decimal_char;
        input [3:0] value;
        begin
            decimal_char = "0" + value[3:0];
        end
    endfunction

    function [7:0] bit_char;
        input value;
        begin
            bit_char = value ? "1" : "0";
        end
    endfunction

    function [7:0] unit_ones_char;
        input [3:0] tenths;
        begin
            unit_ones_char = tenths == 4'd10 ? "1" : "0";
        end
    endfunction

    function [7:0] unit_tenths_char;
        input [3:0] tenths;
        begin
            unit_tenths_char = tenths == 4'd10 ? "0" : decimal_char(tenths);
        end
    endfunction

    function [7:0] guarded_byte;
        input [8:0] idx;
        input [7:0] base_byte;
        reg [3:0] pot_tenths;
        reg [3:0] requested_tenths;
        reg [3:0] safe_tenths;
        reg [3:0] margin_tenths;
        begin
            pot_tenths = switch_to_tenths(switch_value);
            requested_tenths = q8_to_tenths(requested_output_q8);
            safe_tenths = q8_to_tenths(safe_output_q8);
            margin_tenths = q8_to_tenths(safety_margin_q8);
            guarded_byte = base_byte;

            case (idx)
                97: guarded_byte = decimal_char(sample_digit);
                114: guarded_byte = decimal_char(sample_digit);

                209: guarded_byte = unit_ones_char(pot_tenths);
                211: guarded_byte = unit_tenths_char(pot_tenths);

                228: guarded_byte = bit_char(switch_value[3]);
                229: guarded_byte = bit_char(switch_value[2]);
                230: guarded_byte = bit_char(switch_value[1]);
                231: guarded_byte = bit_char(switch_value[0]);

                254: guarded_byte = unit_ones_char(safe_tenths);
                256: guarded_byte = unit_tenths_char(safe_tenths);
                264: guarded_byte = unit_ones_char(safe_tenths);
                266: guarded_byte = unit_tenths_char(safe_tenths);
                277: guarded_byte = guard_action ? "1" : "0";
                288: guarded_byte = unit_ones_char(margin_tenths);
                290: guarded_byte = unit_tenths_char(margin_tenths);

                372: guarded_byte = unit_ones_char(requested_tenths);
                374: guarded_byte = unit_tenths_char(requested_tenths);
                390: guarded_byte = unit_ones_char(safe_tenths);
                392: guarded_byte = unit_tenths_char(safe_tenths);
                410: guarded_byte = unit_ones_char(margin_tenths);
                412: guarded_byte = unit_tenths_char(margin_tenths);
                default: guarded_byte = base_byte;
            endcase
        end
    endfunction

    always @(*) begin
        if (guard_action && index < FRAME_CLAMP_LEN) begin
            byte_out = guarded_byte(index, FRAME_CLAMP[(FRAME_CLAMP_LEN - 1 - index) * 8 +: 8]);
        end else if (!guard_action && index < FRAME_PASS_LEN) begin
            byte_out = guarded_byte(index, FRAME_PASS[(FRAME_PASS_LEN - 1 - index) * 8 +: 8]);
        end else begin
            byte_out = 8'h0a;
        end
    end
endmodule
