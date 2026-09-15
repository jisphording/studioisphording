# Findings — Phase 6: Upgrade Three.js 0.152 → latest and fix rendering regressions — 2026-09-16

**Status:** complete
**Model used:** claude-opus-5
**Behaviour delta:** changed. three goes from 0.152.2 (r152) to 0.186.0 (r186). Both WebGL experiences render the same as before: World_01 has a mean absolute difference of 0.18/255 and 0.006 % of pixels differ by more than 8/255. World_02 (moodboard) is pixel-identical. The `project.three` scene also renders again, after the Phase 5 loading bug was fixed.

## What was built

| File | Change | Cause |
|---|---|---|
| `package.json`, `package-lock.json` | `"three": "^0.152.0"` → `"^0.186.0"` | Phase goal. `npm outdated three` now lists nothing. |
| `dev/js/three/utils/Resources.mjs:3-4`, `dev/js/three/modules/Camera.mjs:7` | `three/examples/jsm/...` → `three/addons/...` | `three/addons/*` is the documented import path. Both paths still resolve in r186 (`package.json` exports `./addons/*` → `./examples/jsm/*`), so this is hygiene, not a compile fix. |
| `dev/js/three/projects/isphording-inneneinrichtung/World_Environment.js:28-30` | `DirectionalLight` intensity `4` → `4 * Math.PI`. The debug slider max `5` → `5 * Math.PI`. | **r155 set `useLegacyLights = false` by default, and r165 removed legacy lighting.** Legacy mode multiplied punctual/directional irradiance by π. Physical units don't, so the sun-lit stand rendered darker (see "raw" below). |
| `dev/js/three/projects/isphording-inneneinrichtung/World.mjs:56-58` | Calls `this.resources.loadOtherResources()` after the `resourcesReady` listener is registered. | **Pre-existing bug, not a three change** (logged in Phase 5). After the moodboard progressive-loading refactor, `Resources` no longer loads on construction, and only the moodboard's `ProgressiveLoader` started loading. World_01 therefore never requested its model, `resourcesReady` never fired, and the canvas stayed empty. This had to be fixed before a meaningful "before" screenshot was possible. |

Nothing else in `dev/js/three` needed changes. The phase's list of known breakers was grepped:

- `useLegacyLights` / `physicallyCorrectLights`: not used.
- `texture.encoding` / `outputEncoding` / `sRGBEncoding`: not used. The code already uses `colorSpace` / `outputColorSpace` / `SRGBColorSpace`, which r152 introduced.
- Point/spot light `decay` (default changed 1 → 2 in r155): no point or spot lights.
- Removed geometry/helper APIs: only `BoxGeometry` and `PlaneGeometry` are used, and both are unchanged.
- `THREE.Clock` (deprecated in favour of `Timer`): not used. `utils/Time.mjs` is a custom rAF loop.
- Shadow maps: `castShadow` is set, but `renderer.shadowMap.enabled` never is, so the r18x shadow-type changes have no visible effect.

## Method

Captures were made with headless Chrome driven by `puppeteer-core` (the chrome-devtools MCP browser profile was locked by another session). Scripts: `investigations/phase-6/tools/capture.mjs` and `compare.mjs`.

- Viewport 1280×800 at DPR 1. PHP dev server on `localhost:8011` (8000 was taken), Vite dev server on 9001, debug mode via `config.localhost.php`.
- Each frame is made deterministic before capture:
  - World_01: the auto-rotation (`world.update`) is stubbed, the model is set to `rotation.y = π − 0.6`, and the camera is pinned at `(0, 0, 10)`.
  - Moodboard: `world.update` is stubbed and all image scales are reset to 1, so the hover lerp can't leak in.
- The canvas is read back with `renderer.update(); canvas.toDataURL()` in the same task.
- **Noise floor:** two r152 runs compared at a mean diff of 0 and 0 % of pixels over the threshold. Every diff below is real.
- **World_01 assets:** `app/assets/three/{textures,meshes,libs}` were not in the repo (Phase 5 finding). They were mirrored read-only over HTTPS from the live site into the gitignored `app/assets/three/`, byte-identical to production: 6 env-map JPGs, `AppleDisplayXDRSingle.glb` and the Draco decoder. The live Draco decoder differs from the r152/r186 npm copy and decodes fine with r186's `DRACOLoader`.
- **Moodboard:** the `moodboard` template has no content page, and its 44 images (`/content/moodboard/*`) exist neither locally nor live. The harness injects the `canvas-minimal` markup (`data-world="World_02"`) into `/de/about` before `index.js` boots, the same path `app/site/templates/moodboard.php` takes. Only the checkerboard placeholders can render. The comparison therefore covers layout, `MeshBasicMaterial`, `CanvasTexture` colour management and the clear colour, but not sRGB photo textures.

## Results

| Scene | Comparison | Mean RGB (A → B) | Mean abs diff | Pixels > 8/255 |
|---|---|---|---|---|
| World_01 | r152 → r186, imports only ("raw") | 209.60/212.80/215.03 → 208.83/211.99/214.07 | 1.03 | 2.105 % |
| World_01 | r152 → r186 + ×π light ("after") | 209.60/212.80/215.03 → 209.81/213.00/215.14 | **0.18** | **0.006 %** |
| Moodboard | r152 → r186 ("after") | 229.63/230.30/230.98 → identical | **0** | **0 %** |

Screenshots are in `investigations/phase-6/screenshots/`:

- `*-before-canvas.png` / `*-after-canvas.png`: the raw WebGL frames.
- `*-page.png`: full-viewport page shots.
- `world01-raw-*`: r186 before the light fix.
- `*-diff.png`: per-pixel max-channel delta ×4, inverted (white = identical).
- `*-console.txt`: the full console for each run.

### Intentional / accepted visual differences

1. **World_01, residual 0.18/255 mean shift.** `world01-after-diff.png` shows a uniform 1–2-level shift across the monitor body and stand only. The background and silhouette are identical. It comes from IBL/PMREM and physical-shading shader revisions between r152 and r186, not from a units error; the ×π fix already removed the 2.1 % region. It is invisible at normal contrast, so it is accepted rather than tuned away. Nudging `envMapIntensity` would trade this for a different mismatch.
2. **Moodboard:** no differences.

## Console / deprecation check

On r186 both pages show **zero** `THREE.*` warnings and no deprecation messages. What remains is not caused by three:

- 404s: 44 missing moodboard images and the `project.three` `/app/video/*` gallery videos. Both were already logged in Phase 5.
- A Chrome GPU-driver "GPU stall due to ReadPixels" message, caused by the capture's own `toDataURL`.
- A cookie-consent "Ignoring Event: localhost" message.

## Verification

- `npm outdated three` → no output, exit 0 (three 0.186.0 = latest).
- `npm run build` → exit 0. Bundle names and manifest keys (`js/index.js`, `js/three/runExperience.js`) are unchanged. `vendor-three` is 651 kB (161 kB gzip).
- `PORT=8012 bash scripts/smoke.sh` → `smoke test: PASS`, exit 0.

## Deviations

- The `World.mjs` loading fix was brought into this phase because both the "before" baseline and the "after" check depend on it. Phase 5 had flagged it as Phase 6 scope.
- Screenshots come from a Puppeteer-driven headless Chrome, not the chrome-devtools MCP. The MCP's profile was held by another session's browser, which was left alone.
- The moodboard comparison covers placeholders only (see Method), because the real images don't exist anywhere.
