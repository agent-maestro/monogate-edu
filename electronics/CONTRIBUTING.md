# Contributing

Keep imports manifest-first.

Every imported artifact needs:

- source repo
- source commit
- source path
- destination path
- copy mode
- validation command if applicable
- evidence status

Do not import raw generated logs, local Vivado project trees, secrets, tokens, or private third-party payloads without review.

Commands that open serial ports, flash boards, or program FPGA hardware must be treated as operator-approved live actions.
