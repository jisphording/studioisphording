# CLAUDE.md

## Stack

Kirby CMS 5.5 (flat-file, PHP) under `app/`, multi-language (de default,
en, it, es — content exists for de/en/it), custom plugins in
`app/site/plugins` (gallery, media-processing, site-methods,
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
- `bash scripts/smoke.sh` is the verification gate — leave it at least as
  green as you found it (it should be fully green from Phase 2 onward of
  the Kirby 5 recovery plan). It aborts with a clear message instead of
  passing if its target port is already held by another process or its
  own `php -S` dies, and it asserts the CSS bundle, all five webfonts,
  and the home showreel video (derived from rendered markup) return 200,
  plus that the home page markup carries no hand-built `/content/` path.
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
