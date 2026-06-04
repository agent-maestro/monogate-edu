#ifndef MONOGATE_ELECTRONICS_THRESHOLD_REFLEX_V0_HPP
#define MONOGATE_ELECTRONICS_THRESHOLD_REFLEX_V0_HPP

namespace monogate_electronics {
namespace threshold_reflex_v0 {

constexpr float THRESHOLD = 0.55f;
constexpr float WIDTH = 0.10f;
constexpr float MAX_STEP = 0.20f;
constexpr float SAFE_LIMIT = 0.85f;

struct State {
  float previous_output;
};

struct Output {
  float requested_output;
  float safe_output;
  float led;
  float buzzer;
  float stepper;
  const char* guard_action;
  float safety_margin;
};

inline float clamp_float(float value, float lo, float hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

inline Output step(State* state, float pot_raw, bool buzzer_enabled) {
  const float normalized_pot = clamp_float(pot_raw, 0.0f, 1.0f);
  const float centered = (normalized_pot - THRESHOLD) / WIDTH;
  const float target = clamp_float(centered + 0.5f, 0.0f, 1.0f);
  const float delta = clamp_float(target - state->previous_output, -MAX_STEP, MAX_STEP);
  const float requested_output = clamp_float(state->previous_output + delta, 0.0f, 1.0f);
  const float safe_output = clamp_float(requested_output, 0.0f, SAFE_LIMIT);
  const bool clamped = safe_output < requested_output;

  state->previous_output = safe_output;

  return Output{
      requested_output,
      safe_output,
      safe_output,
      buzzer_enabled ? safe_output : 0.0f,
      0.0f,
      clamped ? "clamp_to_safe_output" : "pass_through",
      clamp_float(SAFE_LIMIT - safe_output, 0.0f, 1.0f),
  };
}

}  // namespace threshold_reflex_v0
}  // namespace monogate_electronics

#endif
