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
=> false, no hardcoded URL). Dev-only overrides (`debug` => true, `url` =>
`http://localhost:8000`, `vite.server` => `http://localhost:9001`) live in
`app/site/config/config.localhost.php`, which Kirby merges automatically
when the request host is exactly `localhost` (there's a matching
`config.127.0.0.1.php` for when a server is bound to `127.0.0.1` instead,
e.g. by `scripts/smoke.sh`). Both files are excluded from
`scripts/deploy.sh` and never reach production.

If you serve the PHP dev server on a **different port** than 8000 (e.g.
because something else already holds port 8000 on your machine), asset
URLs built from the hardcoded `url` in `config.localhost.php` will point
at the wrong port and CSS/media will fail to load. Either free port 8000,
or edit `url` in `config.localhost.php` locally for your session — never
commit that change.

## Other commands

```bash
# Production build (writes to app/assets/bundle/)
npm run build

# Preview a production build locally
npm run preview

# Asset compilation only (no PHP server)
npm run dev:assets-only

# Smoke test: boots the PHP dev server through Kirby's router, curls the
# main URLs in every language, and fails if any page 404s or shows a
# PHP-version/Whoops/fatal-error/warning/deprecation notice. This is the
# verification gate — keep it green.
bash scripts/smoke.sh

# If port 8000 is already taken on your machine, override it:
PORT=8011 bash scripts/smoke.sh
```

## Project structure

```
├── app/                    # Kirby CMS
│   ├── kirby/              # Kirby 5.5 core (gitignored, via composer install)
│   ├── vendor/             # Composer dependencies (gitignored)
│   ├── assets/bundle/      # Compiled assets (gitignored, via npm run build)
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

`scripts/deploy.sh` builds the site and rsyncs `app/` to the IONOS
server. **Always run `bash scripts/deploy.sh --dry-run` first** and review
the output before a real deploy — see `CLAUDE.md` for the house rule.

The rsync mirrors with `--delete`, and the WebGL assets under
`app/assets/three/` (glTF model, environment map, Draco decoder) are
gitignored, so a fresh clone doesn't have them. If the dry-run lists
`deleting assets/three/...`, restore those files locally from the live site
before you deploy.

## More docs

- `readme/VITE_MIGRATION.md`, `readme/VITE_OPTIMIZATION_SUMMARY.md` — Vite
  migration history (may be partly stale after later Vite upgrades)
- `readme/MEDIA_CACHE_README.md`, `readme/SETUP_SCRIPTS.md`,
  `readme/BARBA_FIX_SUMMARY.md` — feature-specific notes
