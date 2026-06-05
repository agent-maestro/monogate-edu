`timescale 1ns / 1ps

module arty_a7_reflex_top (
    input wire clk_100mhz,
    input wire reset_n,
    input wire [3:0] sw,
    input wire btn_perturb,
    output wire [3:0] led,
    output wire led_clamped,
    output wire uart_tx_pin
);
    reg [19:0] startup_reset_count = 20'd0;
    wire startup_done = &startup_reset_count;
    wire sys_reset_n = startup_done && !reset_n;
    wire perturb_clean;
    wire [7:0] requested_output_q8;
    wire [7:0] safe_output_q8;
    wire [7:0] safety_margin_q8;
    wire guard_action;
    wire bottleneck_id;
    wire [7:0] uart_frame_byte;
    wire uart_frame_last;
    wire uart_busy;
    reg uart_start;
    reg uart_wait_accepted;
    reg [8:0] uart_frame_index;
    reg [23:0] uart_gap_count;
    reg [3:0] sample_digit;
    reg [3:0] frame_switch_value;
    reg [7:0] frame_requested_output_q8;
    reg [7:0] frame_safe_output_q8;
    reg [7:0] frame_safety_margin_q8;
    reg frame_guard_action;

    localparam [23:0] UART_FRAME_GAP_TICKS = 24'd5000000;

    always @(posedge clk_100mhz) begin
        if (!startup_done) begin
            startup_reset_count <= startup_reset_count + 20'd1;
        end
    end

    debounce debounce_perturb (
        .clk(clk_100mhz),
        .reset_n(sys_reset_n),
        .noisy(btn_perturb),
        .clean(perturb_clean)
    );

    reflex_kernel kernel (
        .switch_value(sw),
        .perturb(perturb_clean),
        .requested_output_q8(requested_output_q8)
    );

    guard_clamp guard (
        .requested_output_q8(requested_output_q8),
        .max_output_q8(8'd192),
        .safe_output_q8(safe_output_q8),
        .safety_margin_q8(safety_margin_q8),
        .guard_action(guard_action),
        .bottleneck_id(bottleneck_id)
    );

    assign led = safe_output_q8[7:4];
    assign led_clamped = guard_action;

    json_frame_rom frame_rom (
        .index(uart_frame_index),
        .switch_value(frame_switch_value),
        .requested_output_q8(frame_requested_output_q8),
        .safe_output_q8(frame_safe_output_q8),
        .safety_margin_q8(frame_safety_margin_q8),
        .guard_action(frame_guard_action),
        .sample_digit(sample_digit),
        .byte_out(uart_frame_byte),
        .last(uart_frame_last)
    );

    uart_tx uart (
        .clk(clk_100mhz),
        .reset_n(sys_reset_n),
        .start(uart_start),
        .data(uart_frame_byte),
        .tx(uart_tx_pin),
        .busy(uart_busy)
    );

    always @(posedge clk_100mhz or negedge sys_reset_n) begin
        if (!sys_reset_n) begin
            uart_start <= 1'b0;
            uart_wait_accepted <= 1'b0;
            uart_frame_index <= 9'd0;
            uart_gap_count <= UART_FRAME_GAP_TICKS;
            sample_digit <= 4'd0;
            frame_switch_value <= 4'd0;
            frame_requested_output_q8 <= 8'd0;
            frame_safe_output_q8 <= 8'd0;
            frame_safety_margin_q8 <= 8'd0;
            frame_guard_action <= 1'b0;
        end else begin
            uart_start <= 1'b0;

            if (uart_wait_accepted) begin
                if (uart_busy) begin
                    uart_wait_accepted <= 1'b0;
                    if (uart_frame_last) begin
                        uart_frame_index <= 9'd0;
                        uart_gap_count <= UART_FRAME_GAP_TICKS;
                        sample_digit <= sample_digit == 4'd9 ? 4'd0 : sample_digit + 4'd1;
                    end else begin
                        uart_frame_index <= uart_frame_index + 9'd1;
                    end
                end
            end else if (uart_gap_count != 24'd0) begin
                uart_gap_count <= uart_gap_count - 24'd1;
            end else if (!uart_busy) begin
                if (uart_frame_index == 9'd0) begin
                    frame_switch_value <= sw;
                    frame_requested_output_q8 <= requested_output_q8;
                    frame_safe_output_q8 <= safe_output_q8;
                    frame_safety_margin_q8 <= safety_margin_q8;
                    frame_guard_action <= guard_action;
                end
                uart_start <= 1'b1;
                uart_wait_accepted <= 1'b1;
            end
        end
    end
endmodule
