# Dashboard Setup

The dashboard is shared across courses. Courses provide different schemas,
labels, and expected signals; the dashboard itself should not be copied and
forked for every course.

## Recommended Release Model

Release one versioned dashboard app, then let each course point to the schema
or profile it needs.

```text
dashboard app version + course schema/profile -> course-specific dashboard view
```

This means:

- The dashboard can improve once for every course.
- Course folders stay small.
- Course-specific differences live in schema/profile files.
- A course can declare the minimum dashboard version it expects.

## Running From Source

```powershell
cd apps\electronics-lab
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/electronics
```

## Downloadable Dashboard Builds

For learners who should not need Node.js, publish downloadable dashboard builds
as versioned releases. Do not create a separate dashboard app for every course.
Attach course schemas/profiles beside the release, or include them in the repo
under each course.

Good release shape:

```text
Monogate Electronics Dashboard v0.1.0
  dashboard bundle
  supported course schema list
  release notes
```

Course pages should link to the dashboard release and their own schema/profile.
