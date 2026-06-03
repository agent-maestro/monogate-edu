# Monogate Electronics Courses

Public learner-facing curriculum bundle for Monogate Electronics.

This repo is exported from the private `monogate-electronics` working repo. It
contains public course materials plus the reusable support code needed to run
released courses.

## Start Here

- [Start Here](START_HERE.md)
- [Starter Bundle](starter-bundle/README.md)
- [Course Index](COURSE_INDEX.md)
- [001 Reflex Guard](courses/001-reflex-guard/README.md)
- [Lab 01: Pot to Guarded Output](courses/001-reflex-guard/lab-01-pot-to-guarded-output/README.md)
- [Lab 02: Trace, Replay, And Evidence](courses/001-reflex-guard/lab-02-trace-replay-evidence/README.md)
- [Course Design Standard](docs/course-design-standard.md)

## Repository Map

```text
courses/     learner-facing course content
kernels/     shared EML kernels
tools/       validators, replay tools, and packet helpers
resources/   shared templates and future media assets
docs/        reusable standards and reference docs
apps/        interactive course app source
.github/     validation workflow
```

In the public `monogate-edu` repo, this electronics bundle lives under:

```text
electronics/
```

## Run The Electronics Lab App

```powershell
cd apps\electronics-lab
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/electronics
```

## Boundary

Public course releases are claim-bounded. Browser simulation is not hardware
observation. Hardware-observed claims require live serial capture, physical
artifacts, and a reviewed evidence packet.
