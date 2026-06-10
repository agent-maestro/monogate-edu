#include <Arduino.h>
#include "../../cpp/threshold_reflex_v0.hpp"

namespace kernel = monogate_electronics::threshold_reflex_v0;

constexpr int PIN_POT_ADC = 34;
constexpr int PIN_LED_PWM = 25;
constexpr int PIN_BUZZER_PWM = 26;
constexpr int PIN_BUTTON_INPUT = 27;
constexpr int ADC_MAX = 4095;
constexpr int PWM_MAX = 255;
constexpr int BUZZER_FREQ_HZ = 2200;
constexpr bool ENABLE_BUZZER = true;
constexpr float BUZZER_ON_LEVEL = 0.12f;
constexpr float BUZZER_OFF_LEVEL = 0.06f;

kernel::State kernel_state{0.0f};
bool buzzer_on = false;
uint32_t sample_index = 0;
unsigned long next_sample_ms = 0;
char board_id[40] = "reflexcourse-unknown";
char esp32_chip_mac[18] = "00:00:00:00:00:00";

float clampFloat(float value, float lo, float hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

void setup() {
  Serial.begin(115200);
  const uint64_t mac = ESP.getEfuseMac();
  snprintf(
      esp32_chip_mac,
      sizeof(esp32_chip_mac),
      "%02X:%02X:%02X:%02X:%02X:%02X",
      static_cast<unsigned int>((mac >> 40) & 0xFF),
      static_cast<unsigned int>((mac >> 32) & 0xFF),
      static_cast<unsigned int>((mac >> 24) & 0xFF),
      static_cast<unsigned int>((mac >> 16) & 0xFF),
      static_cast<unsigned int>((mac >> 8) & 0xFF),
      static_cast<unsigned int>(mac & 0xFF));
  snprintf(
      board_id,
      sizeof(board_id),
      "reflexcourse-%02X%02X%02X",
      static_cast<unsigned int>((mac >> 16) & 0xFF),
      static_cast<unsigned int>((mac >> 8) & 0xFF),
      static_cast<unsigned int>(mac & 0xFF));
  analogReadResolution(12);
  pinMode(PIN_POT_ADC, INPUT);
  pinMode(PIN_LED_PWM, OUTPUT);
  pinMode(PIN_BUTTON_INPUT, INPUT_PULLUP);
  if (ENABLE_BUZZER) {
    ledcAttach(PIN_BUZZER_PWM, BUZZER_FREQ_HZ, 8);
  }
}

void loop() {
  const unsigned long now = millis();
  if (static_cast<long>(now - next_sample_ms) < 0) return;
  next_sample_ms = now + 20;

  const float pot_raw = clampFloat(static_cast<float>(analogRead(PIN_POT_ADC)) / ADC_MAX, 0.0f, 1.0f);
  const bool button_pressed = digitalRead(PIN_BUTTON_INPUT) == LOW;
  const kernel::Output output = kernel::step(&kernel_state, pot_raw, ENABLE_BUZZER);

  if (ENABLE_BUZZER) {
    if (!buzzer_on && output.safe_output >= BUZZER_ON_LEVEL) {
      buzzer_on = true;
    } else if (buzzer_on && output.safe_output <= BUZZER_OFF_LEVEL) {
      buzzer_on = false;
    }
  } else {
    buzzer_on = false;
  }

  const bool buzzer_audible = buzzer_on && !button_pressed;
  const float buzzer_output = buzzer_audible ? 1.0f : 0.0f;
  const char* button_action = button_pressed ? "mute_buzzer" : "none";

  analogWrite(PIN_LED_PWM, static_cast<int>(output.led * PWM_MAX));
  if (ENABLE_BUZZER) {
    ledcWrite(PIN_BUZZER_PWM, buzzer_audible ? PWM_MAX / 2 : 0);
  }

  Serial.printf(
      "{\"schema_version\":\"monogate-electronics.trace-frame.v0\","
      "\"kernel_id\":\"threshold_reflex_v0\","
      "\"source\":\"reflexcourse\","
      "\"board_id\":\"%s\","
      "\"board_revision\":\"reflexcourse_breadboard_v0\","
      "\"esp32_chip_mac\":\"%s\","
      "\"mode\":\"reflex\","
      "\"buzzer_enabled\":%s,"
      "\"sample_index\":%lu,"
      "\"timestamp_ms\":%lu,"
      "\"pot_raw\":%.6f,"
      "\"button_pressed\":%s,"
      "\"button_action\":\"%s\","
      "\"inputs\":{\"button_pressed\":%s},"
      "\"outputs\":{\"requested_output\":%.6f,\"safe_output\":%.6f,\"led\":%.6f,\"buzzer\":%.6f,\"stepper\":0.0},"
      "\"guard\":{\"guard_action\":\"%s\",\"requested_output\":%.6f,\"safe_output\":%.6f,"
      "\"safety_margin\":%.6f,\"bottleneck\":\"output_duty_margin\"}}\n",
      board_id,
      esp32_chip_mac,
      ENABLE_BUZZER ? "true" : "false",
      static_cast<unsigned long>(sample_index++),
      static_cast<unsigned long>(now),
      pot_raw,
      button_pressed ? "true" : "false",
      button_action,
      button_pressed ? "true" : "false",
      output.requested_output,
      output.safe_output,
      output.led,
      buzzer_output,
      output.guard_action,
      output.requested_output,
      output.safe_output,
      output.safety_margin);
}
