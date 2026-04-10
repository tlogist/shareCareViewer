# Engineering Invariants

Non-obvious constraints and gotchas for this codebase. Read before making changes.

## Cornerstone3D Worker Patch (Critical)

Cornerstone3D's `@cornerstonejs/dicom-image-loader` and `@cornerstonejs/tools` use `new Worker(new URL(...))` to create Web Workers. Vite detects this pattern at parse time and tries to bundle the worker as IIFE, which conflicts with code-splitting. **There is no Vite plugin or config that can fix this** — we tried `enforce: 'pre'` load hooks, transform hooks, and worker format overrides. Vite's worker detection fires before any plugin.

**The fix:** `scripts/patch-cornerstone.js` rewrites two files in `node_modules/` after install:
- `@cornerstonejs/dicom-image-loader/dist/esm/init.js` — removes worker registration
- `@cornerstonejs/tools/dist/esm/.../registerPolySegWorker.js` — removes polySeg worker

Since the worker is removed, `src/renderer/cornerstone-setup.ts` registers a **main-thread decoder** using a `MessageChannel` + Comlink as a fake worker. This is not optional — without it, every image load fails with "Worker type 'dicomImageLoader' is not registered."

**If you upgrade `@cornerstonejs/*` packages:** verify the patch targets still exist at those file paths, and check if the upstream has fixed the Vite bundling issue.

## postinstall Script Must Run

`npm install` triggers `scripts/patch-cornerstone.js` via the `postinstall` hook. If you manually delete `node_modules` and reinstall, the patches are reapplied automatically. If you copy `node_modules` from elsewhere or use a package manager that skips lifecycle scripts, the build will fail with the IIFE worker error.

## DICOM File Path Encoding

File paths passed to the wadouri image loader are URL-encoded segment by segment (split on `/`, encode each part, rejoin). Do NOT use `encodeURIComponent` on the full path — it encodes `/` as `%2F` which breaks the HTTP server routing. See `toImageId()` in `src/renderer/viewer.ts`.

## PROJECT_ROOT Path Resolution

`app.getAppPath()` does NOT point to the project root in dev mode with electron-vite — it points to `out/main/`. The main process uses `join(__dirname, '..', '..')` in dev and `join(app.getAppPath(), '..')` in production. See `PROJECT_ROOT` in `src/main/index.ts`. If the project structure changes (e.g., moving main output to a different directory), this path math breaks silently and the DICOM scanner returns zero studies.

## DICOM Tag Value Representations

DICOM tags have different Value Representations (VR) that determine how to read them:
- **IS (Integer String):** SeriesNumber `(0020,0011)`, InstanceNumber `(0020,0013)` — use `dataSet.string()` then `parseInt()`. Using `dataSet.uint16()` returns garbage.
- **US (Unsigned Short):** Rows `(0028,0010)`, Columns `(0028,0011)` — use `dataSet.uint16()`.

Mixing these up produces silent wrong values, not errors. See `getIntString()` vs `getUint16()` in `src/main/dicom-scanner.ts`.

## Local HTTP Server Security

The DICOM file server binds to `127.0.0.1` on a random port. It includes a directory traversal check (`filePath.startsWith(projectsDir)`). Do not change it to bind to `0.0.0.0` — it serves medical imagery without authentication.
