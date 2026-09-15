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
(cd app && composer install)
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

See `readme/QUICK_START.md` for the full walkthrough, including the
`config.localhost.php` / `config.127.0.0.1.php` convention that keeps
dev-only settings (`debug`, `url`, `vite.server`) out of production.

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
  the Kirby 5 recovery plan).
- Match the surrounding file's style: tabs in `app/site` templates/
  snippets/plugins, 4 spaces in `app/site/config/config.php`, 2 spaces in
  Vite configs and `dev/js`.
- Do not commit unless explicitly asked; leave changes staged/unstaged
  for review.

## Background

This repo was recovered from a state where Kirby 4.8 refused to boot on
PHP 8.5: the fix was upgrading to Kirby 5.5, updating the npm toolchain
(Vite 8, Sass, Terser, Three.js), splitting deploy-safe config from
localhost overrides, and fixing the template markup faults that upgrade
surfaced. See `plan/improvements.md` for deferred issues found along the
way.
