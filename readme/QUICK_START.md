# Quick Start Guide — Studio Isphording Development

Kirby 5.5 (flat-file CMS) under `app/`, front-end assets built with Vite 8 from
`dev/` into `app/assets/bundle/`. This guide reflects the actual, working
workflow — see `CLAUDE.md` at the repo root for the condensed house rules.

## Prerequisites

- **PHP 8.3, 8.4, or 8.5** (Kirby 5.5 requires `~8.3.0 || ~8.4.0 || ~8.5.0`)
- **Composer** 2.x
- **Node.js ≥ 20.19** (Vite 8 requires 20.19+ or 22.12+)

## First-time setup

```bash
# Install Kirby 5 (core → app/kirby, dependencies → app/vendor; both are
# gitignored and reproduced from app/composer.lock)
(cd app && composer install)

# Install npm dependencies
npm ci
```

## Everyday development

Run these in **two terminals**:

```bash
# Terminal 1 — Vite dev server (HMR for CSS/JS)
npm run dev

# Terminal 2 — PHP dev server, routed through Kirby's router so pretty
# URLs (/about, /projects/…) work
npm run php
```

Then open **http://localhost:8000/** (German, the default language, is
served under `/de` — Kirby redirects `/` there automatically).

There is no single command that starts both servers — `npm run dev` only
runs Vite. If you see stale claims elsewhere (an `npm run dev:full`
script, "dev starts both servers") they don't reflect the current
`package.json` and should be ignored/fixed.

### The `config.localhost.php` convention

`app/site/config/config.php` holds **production-safe** defaults (`debug`
=> false, no hardcoded URL). Dev-only overrides (`debug` => true,
`vite.server` => `http://localhost:9001`) live in
`app/site/config/config.localhost.php`, which Kirby merges automatically
when the request host is exactly `localhost` (there's a matching
`config.127.0.0.1.php` for when a server is bound to `127.0.0.1` instead,
e.g. by `scripts/smoke.sh`). Both files are excluded from
`scripts/deploy.sh` and never reach production.

Neither file sets `url` — Kirby infers the origin from the incoming
request, so the PHP dev server works unchanged on any port. This matters
because port 8000 is often already held by an unrelated local service; run
on another port with `PORT=8011 php -S 127.0.0.1:8011 -t app
app/kirby/router.php` (or the smoke test equivalent below) and every
generated link/asset URL still resolves correctly.

## Other commands

```bash
# Production build (writes to app/assets/bundle/). A `prebuild` step
# (scripts/copy-draco.mjs) also mirrors the Three.js Draco decoder from
# node_modules/three into app/assets/three/libs/draco/, keeping the decoder
# in lockstep with the pinned three version — so that folder is build-generated,
# not hand-maintained.
npm run build

# Preview a production build locally
npm run preview

# Smoke test: boots the PHP dev server through Kirby's router, curls the
# main URLs in every language, the built CSS bundle, all five webfont
# files and the home showreel video (derived from the rendered markup),
# and fails if any of them 404, show a PHP-version/Whoops/fatal-error/
# warning/deprecation notice, or if the home page markup contains a
# hand-built /content/ src or href. It also refuses to run if the target
# port is already held by another process, or if its own php -S dies
# before serving. This is the verification gate — keep it green.
bash scripts/smoke.sh

# Port 8000 is often already taken on this machine (an unrelated local
# service) — PORT=8011 is the house convention for this repo:
PORT=8011 bash scripts/smoke.sh
```

## Project structure

```
├── app/                    # Kirby CMS
│   ├── kirby/              # Kirby 5.5 core (gitignored, via composer install)
│   ├── vendor/             # Composer dependencies (gitignored)
│   ├── assets/bundle/      # Compiled assets (gitignored, via npm run build)
│   ├── assets/fonts/       # Licensed webfonts (gitignored, server-owned — see below)
│   ├── assets/three/       # WebGL assets: libs/draco built, meshes+textures server-owned
│   ├── assets/pdf/         # PDFs (gitignored, server-owned)
│   ├── content/            # Site content (never modify directly in git — live data)
│   └── site/               # Templates, snippets, plugins, config
├── dev/                    # Front-end source (CSS/SCSS, JS, Three.js)
├── scripts/
│   ├── smoke.sh            # Verification gate — see above
│   └── deploy.sh           # rsync to IONOS; always dry-run first (--dry-run)
├── vite.config.dev.js      # Vite dev-server config
├── vite.config.build.js    # Vite production build config
└── package.json
```

## Deploying

`scripts/deploy.sh` runs `composer install --no-dev --optimize-autoloader`
in `app/` (reinstalling the gitignored `app/kirby` core from
`app/composer.lock`), then builds the site, runs a **preflight** check, and
rsyncs `app/` to the IONOS server. **Always run
`bash scripts/deploy.sh --dry-run` first** and review the output before a
real deploy — see `CLAUDE.md` for the house rule.

### Which trees live where

The rsync mirrors with `--delete`, so the deploy has to know, for every
tree under `app/`, whether it belongs to git/the build or only to the
server. Three categories:

| Tree | Owner | In git? | Deploy behaviour |
| --- | --- | --- | --- |
| `app/site/` (templates, plugins, config) | git | yes | pushed every deploy |
| `app/index.php`, `app/.htaccess`, favicons | git-tracked-elsewhere / hand-maintained | gitignored here | pushed every deploy |
| `app/kirby/`, `app/vendor/` | Composer | no | reinstalled on the deploy host |
| `app/assets/bundle/` | build (`npm run build`) | no | rebuilt + pushed every deploy |
| `app/assets/three/libs/draco/` | build (`prebuild`) | no | regenerated + pushed every deploy |
| `app/assets/fonts/` | **server** | no | **never pushed, never deleted** |
| `app/assets/pdf/` | **server** | no | **never pushed, never deleted** |
| `app/assets/three/meshes/`, `.../textures/` | **server** | no | **never pushed, never deleted** |
| `app/content/`, `app/video/` | **server** | no | **never pushed, never deleted** |
| `app/media/`, `app/site/cache|sessions|accounts/` | server runtime | no | never pushed, never deleted |

The **server-owned** rows are gitignored binaries that neither git nor the
build reproduces. `scripts/deploy.sh` excludes each of them from the
`--delete` mirror with a leading-slash (anchored) path, so a deploy from a
clone that lacks them can never delete the live copies. `app/assets/three/`
is split: the build-owned `libs/draco/` decoder is re-included ahead of the
`/assets/three/` exclude and still ships every deploy (it is regenerated
from `node_modules/three` by the build's `prebuild` step — never
hand-restore it), while the server-owned `meshes/` and `textures/` are
protected. The licensed webfonts under `app/assets/fonts/`
(`.otf`/`.woff2`/`.woff`/`.ttf` per face) are referenced by root-absolute
`/assets/fonts/...` URL from `dev/css/templates/_typography.scss`, so they
must exist on the server (they do); they are not needed locally to build.

### What a fresh clone needs before it can deploy

A fresh clone has `app/site/`, `app/composer.*` and `dev/`. To deploy it
must first produce the build- and Composer-owned trees — that is exactly
what `scripts/deploy.sh` does (composer install, then `npm run build`). The
server-owned trees above do **not** need restoring locally to deploy: the
deploy leaves them untouched on the server. The preflight step aborts
before rsync if a tree the deploy *must* push is missing or empty
(`app/assets/bundle`, `app/kirby/bootstrap.php`, `app/index.php`,
`app/.htaccess`) and only warns when a server-owned tree is absent locally.
If you do want the full WebGL/font experience in local `npm run preview`,
restore `app/assets/fonts/` and `app/assets/three/{meshes,textures}/` from
the live site.

## Known status notes

- **Media cache script removed.** Kirby 4.8's on-demand thumbnail
  generation was broken, so this repo used to ship
  `utils/build-media-cache.php` (`npm run build:media`) to pre-generate
  every thumbnail size. Kirby 5.5's on-demand GD thumbs work again
  (verified by cold-cache-testing `/de/about`: deleting a generated
  derivative and re-requesting the page regenerated it on the fly), so
  the script, its `package.json` entry and `readme/MEDIA_CACHE_README.md`
  have been removed. `app/site/plugins/site-methods/index.php`'s
  `getResponsiveImage()` still calls Kirby's own `crop()`/`thumb()` per
  size on every request — that on-demand path is what's now load-bearing.
- **`moodboard` template is unreachable.** `app/site/templates/moodboard.php`
  (a canvas-minimal pan/zoom Three.js experience, `World_02`) has no
  content page anywhere under `app/content/projects/`, so it cannot be
  visited via any URL today. Treat it as work-in-progress code with no
  live entry point rather than a regression — `app/content/` is off
  limits to create pages in from an agent session, so this is a decision
  for whoever owns the content tree.
- **First post-plan deploy changes heading typography.** The live site
  currently renders `h1` in Monument-Extended, but
  `dev/css/templates/_typography.scss:58` assigns `Grafier-Regular` to
  `h1`–`h6` in this repo. The deployed bundle predates this plan; the
  next real deploy will visibly change heading fonts site-wide. That is
  expected, not a regression — flag it to whoever reviews the first
  post-plan release so it isn't mistaken for a bug.

## More docs

- `readme/VITE_MIGRATION.md`, `readme/VITE_OPTIMIZATION_SUMMARY.md` — Vite
  migration history (may be partly stale after later Vite upgrades)
- `readme/SETUP_SCRIPTS.md`, `readme/BARBA_FIX_SUMMARY.md` — feature-specific
  notes
