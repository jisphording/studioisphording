# CLAUDE.md

## Stack

Kirby CMS 5.5 (flat-file, PHP) under `app/`, multi-language (de default,
en, it, es — content exists for de/en/it), custom plugins in
`app/site/plugins` (helpers, media-manifest, media-processing, site-methods,
vite-manifest; no Panel/blueprints in use). Front-end built with Vite 8 +
Sass + Three.js from `dev/` into `app/assets/bundle`. PHP 8.3–8.5,
Composer 2.x, Node ≥ 20.19. Deploy via rsync to IONOS
(`scripts/deploy.sh`).

Three.js is route-split: `dev/js/utils/startWebgl.mjs` dynamic-imports the
experience only when a `#webgl` canvas exists, `dev/js/three/worlds.mjs` lazily
loads one chunk per world, and `vite()` modulepreloads `runExperience` and the
page's own world chunk (never `vendor-three`) only for templates in
`WEBGL_TEMPLATES` (site-methods plugin, exposed as `$page->rendersWebgl()`;
the world comes from `$page->webglWorld()` / `webglWorldChunk()`). A new template rendering `#webgl` must be added
there — `PageMethodsTest` fails until it is. See
`readme/VITE_OPTIMIZATION_SUMMARY.md`. Across Barba transitions the
Experience is torn down and restarted: `animBarba.mjs` calls `stopWebgl()`
when leaving a container holding `#webgl` and `startWebgl(container)` in
`afterEnter`; `Experience.destroy()` (with `Time`/`Sizes.destroy()`) resets
the singleton. A world needing cleanup implements `destroy()`/`dispose()`.

Build-time media pipeline in `scripts/media/` (config resolution, derivative
naming, content-hash cache, manifest writer), configured by `media.config.mjs`
at the repo root and emitting derivatives plus `manifest.json` into
`app/assets/media/`. It only ever *reads* `app/content/`.
The `media-manifest` plugin reads that manifest and the `responsive-image`
snippet renders `<picture>` (AVIF/WebP/JPEG) from it; a manifest miss falls
back to `getResponsiveImage()` thumbs (reached only through that snippet's
fallback — about.php and projects.php now use the snippet — so it is a live
path, not dead code). Full pipeline
reference: `readme/MEDIA_PIPELINE.md`.

## Commands

```bash
# First-time setup
(cd app && composer install)   # installs app/kirby — gitignored, Composer-managed, never committed
npm ci

# Everyday dev — two terminals
npm run dev     # Vite dev server (HMR)
npm run php     # PHP dev server via Kirby's router (localhost:8000)

# Build
npm run build

# Media derivatives (deliberate, NOT part of build) — sharp AVIF/WebP/JPEG
# into app/assets/media/; a warm run is a no-op. Flags: --dry-run, --prefix <content path>.
# A scoped (--prefix) or dry run never writes manifest.json.
# Quality is SSIMULACRA2-targeted (encode-score-adjust); without the scorer it
# is mapped from a calibration table and the run says so. Bands and how to
# change them: readme/PERFORMANCE.md "Fidelity bands".
bash scripts/media/setup-scorer.sh         # one-time: ssimulacra2 into tools/ (gitignored)
node scripts/media/index.mjs scorer        # is the scorer available?
npm run media:images -- --prefix projects/02-screw-driver

# Video ladder — AV1/WebM, VP9/WebM, H.264/MP4 + poster into app/assets/media/
# (ffmpeg on PATH). Never part of build. The AV1 rung is stepped up in CRF until
# it fits the `budget` in media.config.mjs (never trims duration/fps; reports a
# miss at the floor). Unlike images, a scoped run DOES write manifest.json: video
# runs merge their `videos` entries into it instead of replacing it.
npm run media:video -- --prefix home/

# Prune orphans — files under app/assets/media/ the manifest no longer
# references (stale hashes after an encoder/format change). Report-only by
# default; --apply deletes. Refuses without a readable manifest.json. Never
# part of build; run after a full `media:images`.
npm run media:prune
npm run media:prune -- --apply

# JS unit tests — Vitest over tests/js/, mirroring the dev/js path under
# test. No WebGL, no network, no PHP server; DOM tests opt into jsdom with a
# `// @vitest-environment jsdom` docblock. Runs in under a second.
npm test
npm run test:watch

# PHP unit tests — boot a real Kirby against throwaway fixtures and pin
# app/site behaviour (site methods, snippets, snippet references). Fast,
# no server, no network. Known-bug tests assert the correct (not-yet-shipped)
# behaviour and are excluded from the default run.
npm run test:php
app/vendor/bin/phpunit --group known-bug   # runs only the known-bug tests

# Verification gate — must stay green
bash scripts/smoke.sh
# or, if port 8000 is taken locally:
PORT=8011 bash scripts/smoke.sh
```

```bash
# Performance snapshot (production build, local) and before/after compare
npm run perf -- --label before     # or --quick for a fast sanity check
npm run perf:compare               # two newest snapshots in perf/
npm run test:perf                  # unit tests for the perf tooling
```

See `readme/PERFORMANCE.md`. Snapshots land in gitignored `perf/`;
`report.md`'s "Heavy assets and loading behaviour" section is the input
for media/lazy-loading work.

See `readme/QUICK_START.md` for the full walkthrough, including the
`config.localhost.php` / `config.127.0.0.1.php` convention that keeps
dev-only settings (`debug`, `vite.server`) out of production. Neither file
sets `url` — Kirby infers the origin from the request — so the dev server
works on any port; `PORT=8011` is this repo's convention because 8000 is
often already held by an unrelated local service.

## House rules

- **Never modify `app/content/`** — it's live content, not test fixture
  data.
- **Media pipeline invariants.** Pipeline JS lives in `scripts/media/` —
  never in `dev/js` (the Vite bundle picks it up) and never under `app/`
  (`scripts/deploy.sh` ships it). The single output root for every
  derivative is `app/assets/media/`, the one tree that is both gitignored
  and actually pushed by the deploy's rsync. Quality intent is an
  SSIMULACRA2 `target` score or an explicit per-codec `quality` map —
  never one scalar across AVIF/WebP/JPEG, whose scales are not comparable.
  Masters live only on this workstation, so a fresh clone cannot run the
  pipeline without the master archive present.
  The scorer binary (`tools/`) and the quality-search cache
  (`.cache/media/quality.json`) are workstation-only and gitignored; tests
  mock the scorer and never invoke a real binary.
  `scripts/deploy.sh`'s preflight *requires* `app/assets/media/manifest.json`:
  the tree is inside the `--delete` mirror, so deploying without it would wipe
  the live derivatives.
- **Never run `scripts/deploy.sh` without `--dry-run`.** Review the
  dry-run output before any real deploy; the real deploy is a human call,
  not something an agent runs.
- **Never ssh to the server with a write command.** Read-only checks
  (`php -v`, `ls`) only, and only after asking the user first.
- `npm test` (Vitest), `npm run test:php` (PHPUnit) and
  `bash scripts/smoke.sh` are the verification gate — leave all three at
  least as green as you found them.
  `npm test` and `npm run test:php` must exit 0; `scripts/smoke.sh` should be fully green
  from Phase 2 onward of the Kirby 5 recovery plan. smoke aborts with a
  clear message instead of passing if its target port is already held by
  another process or its own `php -S` dies, and it asserts the CSS bundle,
  all five webfonts, and the home showreel video (derived from rendered
  markup) return 200, plus that the home page markup carries no hand-built
  `/content/` path.
- JS tests live in `tests/js/` (outside `app/` and outside `dev/js`, so
  neither `scripts/deploy.sh` nor the Vite bundle ever picks them up),
  mirroring the path under test — `dev/js/...` under
  `tests/js/...` (e.g. `tests/js/three/utils/EventEmitter.test.mjs`) and
  `scripts/media/...` under `tests/js/media/...`. Shared fakes for the
  Three.js loaders, the `Experience` singleton and the GSAP/Barba window
  globals live in `tests/js/helpers/`; reuse them rather than loading
  anything real. Characterization tests that document a known bug assert
  the *correct* behaviour via `it.fails`, which the phase fixing that bug
  flips back to `it`. See `readme/QUICK_START.md`.
- PHP tests live in `tests/php/` (outside `app/`, so `scripts/deploy.sh`
  never ships them), mirroring the `app/site` path under test. They extend
  `tests/php/KirbyTestCase.php`, which boots a real Kirby against a
  throwaway copy of `tests/php/fixtures/` and never touches `app/content`.
  Known bugs are pinned by `#[Group('known-bug')]` tests asserting the
  correct behaviour, excluded from the default run and un-grouped by the
  phase that fixes each bug. phpunit is a `require-dev` dependency —
  `composer install --no-dev` (what the deploy runs) removes it. See
  `readme/QUICK_START.md` for how to write one.
- Escape every content field a template/snippet echoes (`->escape()`,
  `esc()`, `->kirbytext()`, or `->titleHtml()` for titles carrying `<mark>`/
  `<br>`, or `->titleText()` for the same titles in `<title>`/attribute/alt
  contexts, where markup must be stripped to plain words); intentionally raw output needs `// raw: <reason>` inside the `<?=`
  tag. `tests/php/OutputEscapingGuardTest.php` enforces it — see
  `readme/QUICK_START.md`.
- **Always test code changes.** Before changing code, find and run the
  tests that cover it; if none do, write sensible ones in the same change
  (pin current behaviour first when refactoring, and add a test that fails
  without the fix when fixing a bug). Don't weaken an existing assertion
  to get green. If a change really can't be tested automatically, say so
  and state how it was verified instead. Smoke staying green is not a
  substitute for tests.
- Match the surrounding file's style: tabs in `app/site` templates/
  snippets/plugins, 4 spaces in `app/site/config/config.php`, 2 spaces in
  Vite configs and `dev/js`.
- Do not commit unless explicitly asked; leave changes staged/unstaged
  for review.
- `app/kirby/` is gitignored and never committed — it's installed by
  Composer from `app/composer.json` (pinned to `getkirby/cms ^5.5`), both
  locally (`composer install`) and by `scripts/deploy.sh`, which runs
  `composer install --no-dev --optimize-autoloader` before the build.
- `scripts/deploy.sh` runs a preflight before rsync: it aborts if a tree
  the deploy must push (`app/assets/bundle`, `app/kirby/bootstrap.php`,
  `app/index.php`, `app/.htaccess`) is missing or empty, and warns
  without aborting if a server-owned tree (fonts, `app/content`,
  `app/video`, Three.js meshes/textures, PDFs) is absent locally — those
  are excluded from its `--delete` mirror on purpose.
- `npm run dev:assets-only` and `vite.assets-only.config.js` were removed
  as dead — unused by any script, test or doc.

## Background

This repo was recovered from a state where Kirby 4.8 refused to boot on
PHP 8.5: the fix was upgrading to Kirby 5.5, updating the npm toolchain
(Vite 8, Sass, Terser, Three.js), splitting deploy-safe config from
localhost overrides, and fixing the template markup faults that upgrade
surfaced. See `plan/improvements.md` for deferred issues found along the
way.
