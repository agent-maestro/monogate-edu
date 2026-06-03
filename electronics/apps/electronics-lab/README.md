# MGElectronics Lab

Human-authored source for the static `monogate.dev/electronics` lab artifact.

The app is simulated courseware for `threshold_reflex_v0`. It does not claim
real hardware observation, live serial capture, certified safety, production
controller readiness, therapy, or medical utility.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The Vite base path is `/electronics-lab/` because `monogate-dev` rewrites:

```text
/electronics -> /electronics-lab/index.html
```

To refresh the public site artifact after a reviewed source change:

```bash
python ../../scripts/sync_electronics_lab_to_monogate_dev.py
```

The sync script builds this app, copies `dist/` into
`monogate-dev/public/electronics-lab`, and writes
`monogate-dev/public/electronics-lab/SOURCE.json` so the public artifact can be
traced back to this source path and commit.

Run the public site build afterward:

```bash
cd ../../../monogate-dev
npm run build
```
