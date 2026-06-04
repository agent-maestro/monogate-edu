#include <cmath>
#include <cstdio>
#include <cstring>

#include "../threshold_reflex_v0.hpp"

namespace kernel = monogate_electronics::threshold_reflex_v0;

namespace {

constexpr float POT_VALUES[] = {0.0f, 0.35f, 0.55f, 0.65f, 0.85f, 1.0f, 1.0f};
constexpr float EXPECTED_REQUESTED[] = {0.0f, 0.0f, 0.2f, 0.4f, 0.6f, 0.8f, 1.0f};
constexpr float EXPECTED_SAFE[] = {0.0f, 0.0f, 0.2f, 0.4f, 0.6f, 0.8f, 0.85f};
constexpr const char* EXPECTED_ACTION[] = {
    "pass_through",
    "pass_through",
    "pass_through",
    "pass_through",
    "pass_through",
    "pass_through",
    "clamp_to_safe_output",
};

bool close(float actual, float expected) {
  return std::fabs(actual - expected) <= 0.00001f;
}

}  // namespace

int main() {
  kernel::State state{0.0f};
  int failures = 0;
  int clamped_frames = 0;
  constexpr int frame_count = static_cast<int>(sizeof(POT_VALUES) / sizeof(POT_VALUES[0]));

  for (int i = 0; i < frame_count; ++i) {
    const kernel::Output output = kernel::step(&state, POT_VALUES[i], true);
    if (std::strcmp(output.guard_action, "clamp_to_safe_output") == 0) {
      ++clamped_frames;
    }
    if (!close(output.requested_output, EXPECTED_REQUESTED[i])) {
      std::printf(
          "FAIL frame %d requested_output actual=%.6f expected=%.6f\n",
          i,
          output.requested_output,
          EXPECTED_REQUESTED[i]);
      ++failures;
    }
    if (!close(output.safe_output, EXPECTED_SAFE[i])) {
      std::printf(
          "FAIL frame %d safe_output actual=%.6f expected=%.6f\n",
          i,
          output.safe_output,
          EXPECTED_SAFE[i]);
      ++failures;
    }
    if (std::strcmp(output.guard_action, EXPECTED_ACTION[i]) != 0) {
      std::printf(
          "FAIL frame %d guard_action actual=%s expected=%s\n",
          i,
          output.guard_action,
          EXPECTED_ACTION[i]);
      ++failures;
    }
  }

  if (failures != 0) {
    std::printf("threshold_reflex_v0 native fixture FAIL: %d failures\n", failures);
    return 1;
  }

  std::printf("threshold_reflex_v0 native fixture PASS\n");
  std::printf("frames: %d\n", frame_count);
  std::printf("clamped_frames: %d\n", clamped_frames);
  std::printf("hardware action: none\n");
  return 0;
}
