# Course 001: Reflex Guard Release Checklist

Status: active release target

For the immediate public release gate, use
[COURSE_001_RELEASE_GATE.md](COURSE_001_RELEASE_GATE.md). This longer checklist
tracks the broader polish backlog and should not block learner access by itself.

Release name:

```text
Course 001: Reflex Guard
```

## Release Boundary

This release includes:

- ESP32 Reflex Course breadboard build;
- potentiometer input on GPIO34;
- Lab 01A guarded LED output on GPIO25;
- Lab 01B tactile button input on GPIO27;
- Lab 01B guarded passive piezo buzzer output on GPIO26 through 1 kOhm;
- Lab 02 trace, replay, comparison, and evidence packet workflow;
- output-header/expansion-dock concept for later swappable modules;
- live dashboard with graph, session log, replay export, and evidence summary;
- reusable evidence packet following `monogate-electronics.course-evidence-packet.v0`.

This release does not include:

- motors;
- relays;
- solenoids;
- electromagnets;
- mains voltage;
- production-controller claims;
- certified safety claims.

## Completion Criteria

- [ ] Syllabus / learning objectives are complete.
- [ ] BOM is complete and matches the current breadboard build.
- [ ] Reference schematic is complete.
- [ ] Step-by-step build guide matches the current breadboard build.
- [ ] Working code / firmware / kernel links are current.
- [ ] Evidence packet template and guide are current.
- [ ] Troubleshooting guide covers common Course 01 failures.
- [ ] Short theory note explains request, safe output, guard clamp, and button mute.
- [ ] Further reading / datasheets list is ready for release.
- [ ] Local dashboard launcher opens the Guard Trace Console.
- [ ] Firmware emits stable board/session identity fields.
- [ ] Live dashboard shows pot, request, safe output, LED, and buzzer.
- [ ] Simulator separates 01A from 01B: USB/program first, then disconnect before adding button/buzzer.
- [ ] Dashboard log stays persistent for the session.
- [ ] Replay export opens from `file://` or gives a clear local-server path.
- [ ] Replay starts at the captured run boundary, not stale pre-capture frames.
- [ ] Evidence summary reports guard count, total clamp time, output events, and blocked claims.
- [ ] Lab packet matches the actual breadboard wiring.
- [ ] Lab 01 entry point links the build resources clearly.
- [ ] Lab 02 entry point scopes the proof/evidence workflow clearly.
- [ ] Photos show the physical ESP32, breadboards, LED, button, buzzer, and resistors.
- [ ] `validate_trace.py` passes on the live capture.
- [ ] `replay_trace.py` summarizes the live capture.
- [ ] Packet manifest is generated with `tools/make_packet.py`.
- [ ] Packet validator passes or clearly reports draft-only gaps.
- [ ] Public curriculum export passes and contains only allowlisted course files.

## Current Release Priorities

Work these in order before opening Course 02:

1. **Capture boundary** - replay export must start at the learner's capture
   start, not at older pre-capture frames.
   - Implementation note: the dashboard server now uses a dedicated capture
     buffer separate from the live rolling history. Needs one live-board
     validation pass.
2. **Replay package** - exported replay HTML should be shareable and clearly
   replay-only, with play, pause, step, and jump-to-log controls.
3. **Evidence summary** - exported replay should summarize what happened:
   clamp count, total clamp time, LED/buzzer transitions, and blocked claims.
4. **Live dashboard polish** - no horizontal page scrolling, dashboard visible
   by default, persistent session log, and clear buzzer graph/display state.
5. **Human packet pass** - the final learner packet should read like a human
   lab, not a machine-generated report.

## Release Commands

```powershell
python tools\validate_kernel_spec.py kernels\threshold_reflex_v0
python tools\validate_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
python tools\replay_trace.py kernels\threshold_reflex_v0\traces\golden_trace.jsonl
```

For a live capture:

```powershell
python tools\validate_trace.py path\to\live_trace.jsonl
python tools\replay_trace.py path\to\live_trace.jsonl
python tools\make_packet.py path\to\evidence_folder --out path\to\evidence_folder\PACKET_MANIFEST.json
python tools\validate_course_evidence_packet.py path\to\evidence_folder
```

For the public curriculum bundle:

```powershell
python scripts\export_public_curriculum.py --clean
```

## Suggested Next Course Note

This checklist is a readiness guide, not an access gate. Course 02 and advanced
tracks can stay visible. The recommended path is to finish Course 001 Lab 01
and Lab 02 before using it as the reference pattern for later courses.
# Resume Note

If the laptop crashed during release work, read
[`LAPTOP_AGENT_CRASH_HANDOFF_2026_06_01.md`](../../LAPTOP_AGENT_CRASH_HANDOFF_2026_06_01.md)
before continuing. The current rule is: finish Course 001 Lab 01 and Lab 02,
validate the education-first public export, and keep Course 02/advanced tracks
paused until this release is clean.
