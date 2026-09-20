# CLAUDE.md

## Stack

Kirby CMS 5.5 (flat-file, PHP) under `app/`, multi-language (de default,
en, it, es — content exists for de/en/it), custom plugins in
`app/site/plugins` (helpers, media-processing, site-methods,
vite-manifest; no Panel/blueprints in use). Front-end built with Vite 8 +
Sass + Three.js from `dev/` into `app/assets/bundle`. PHP 8.3–8.5,
Composer 2.x, Node ≥ 20.19. Deploy via rsync to IONOS
(`scripts/deploy.sh`).

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
  mirroring the `dev/js` path under test — e.g.
  `tests/js/three/utils/EventEmitter.test.mjs`. Shared fakes for the
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
  `<br>`); intentionally raw output needs `// raw: <reason>` inside the `<?=`
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
