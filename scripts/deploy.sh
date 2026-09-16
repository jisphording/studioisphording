#!/usr/bin/env bash
# Push the built site to the IONOS server over SSH/rsync.
#
# Shared IONOS webspace/account as the `soil` / `johannesisphording-writings`
# projects (same host, same cert), just a different target folder:
# studioisphording/ instead of soil/ or johannesisphording-writings/.
#
# This project's Kirby backend lives under app/ locally (with the deployment
# artifacts app/kirby, app/media, app/content, app/video, app/assets, and
# app/index.php/.htaccess/favicons all gitignored — see .gitignore), but the
# server's webroot is flat, so local app/ maps to remote / (not remote/app).
#
# Auth: `ionos` SSH host alias (~/.ssh/config), key-based.
#
# Flags:
#   --dry-run   Show what rsync would change; touch nothing on the server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="ionos:studioisphording"

DRY_RUN=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    *) echo "✗ Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------------
# 1. Install the Kirby core via Composer — app/kirby/ is gitignored and not
#    committed, so the deploy target has to (re)build it from app/composer.json
#    before anything else runs.
# ---------------------------------------------------------------------------
echo "→ Installing Composer dependencies…"
(cd "$ROOT/app" && composer install --no-dev --optimize-autoloader)

# ---------------------------------------------------------------------------
# 2. Build — guarantees app/assets/bundle is fresh.
#
#    `npm run build` runs a `prebuild` step (scripts/copy-draco.mjs) that mirrors
#    the Draco decoder from node_modules/three into app/assets/three/libs/draco/,
#    so the decoder always matches the pinned three version. HOW THE DECODER
#    REACHES PRODUCTION: it is a build artifact under app/assets/three/, and the
#    rsync mirror below carries app/ to the server. The EXCLUDES list protects
#    the *server-owned* parts of /assets/three/ (meshes/, textures/) from
#    --delete but explicitly RE-INCLUDES /assets/three/libs/draco/ ahead of that
#    exclude, so the freshly-built decoder still ships every deploy and no stale
#    copy is ever stranded.
# ---------------------------------------------------------------------------
echo "→ Running production build…"
(cd "$ROOT" && npm run build)

# ---------------------------------------------------------------------------
# 3. Preflight — abort before rsync if anything the deploy MUST push is
#    missing, and warn (without aborting) when a server-owned tree that the
#    deploy deliberately never touches is absent locally.
#
#    This is the guard against deploying from an incomplete clone: rsync runs
#    with --delete, so pushing an empty/partial app/ would wipe the live site.
# ---------------------------------------------------------------------------
require_tree() {  # <path-under-app> <why it must exist>
  local rel="$1" why="$2" abs="$ROOT/app/$1"
  if [ ! -e "$abs" ] || { [ -d "$abs" ] && [ -z "$(ls -A "$abs" 2>/dev/null)" ]; }; then
    echo "✗ Preflight: required tree app/$rel is missing or empty ($why). Aborting before rsync." >&2
    exit 1
  fi
}

warn_server_tree() {  # <path-under-app>
  local rel="$1" abs="$ROOT/app/$1"
  if [ ! -e "$abs" ] || { [ -d "$abs" ] && [ -z "$(ls -A "$abs" 2>/dev/null)" ]; }; then
    echo "⚠ Preflight: server-owned tree app/$rel is absent locally — the deploy leaves the live copy untouched (expected on a fresh clone)."
  fi
}

echo ""
echo "→ Preflight checks…"
# Build- and Composer-owned trees the deploy MUST push. (Kirby 5's core package
# ships bootstrap.php, not an index.php, so bootstrap.php is the Composer marker;
# the site entry point is app/index.php.)
require_tree "assets/bundle"       "built by npm run build"
require_tree "kirby/bootstrap.php" "installed by composer install"
require_tree "index.php"           "Kirby site entry point"
require_tree ".htaccess"           "Apache rewrite rules"
# Server-owned binaries git does not carry and the build does not regenerate:
# their absence locally is fine because the excludes below stop --delete from
# ever touching the server's copies.
warn_server_tree "assets/fonts"
warn_server_tree "assets/three"
warn_server_tree "assets/pdf"
warn_server_tree "content"
warn_server_tree "video"

# ---------------------------------------------------------------------------
# 4. Push app/ → remote / (mirror with --delete).
#
#    Runtime/local-only trees are excluded both ways, so --delete can't wipe
#    server-only Kirby state (cache/sessions), any Panel account that exists
#    only on the server, or generated media thumbnails.
#
#    Server-owned binary trees (fonts, WebGL meshes/textures, PDFs, content and
#    video) are gitignored and never reproduced by the build, so a fresh clone
#    lacks them. They are excluded with LEADING-SLASH (anchored) paths so the
#    rule pins to the transfer root and --delete can never remove the live
#    copies. app/assets/bundle stays build-owned and keeps shipping; the Draco
#    decoder under /assets/three/libs/draco/ is re-included ahead of the
#    /assets/three/ exclude so the build artifact still reaches production.
# ---------------------------------------------------------------------------
EXCLUDES=(
  --exclude='/site/cache/'
  --exclude='/site/sessions/'
  --exclude='/site/accounts/'
  --exclude='/site/config/config.localhost.php'
  --exclude='/site/config/config.127.0.0.1.php'
  --exclude='/media/'
  # Server-owned binaries — protect from --delete, never push.
  --exclude='/content/'
  --exclude='/video/'
  --exclude='/assets/fonts/'
  --exclude='/assets/pdf/'
  # /assets/three/: keep the build-owned Draco decoder shipping, protect the
  # server-owned meshes/ and textures/. Includes MUST precede the exclude
  # (rsync stops at the first matching rule).
  --include='/assets/three/libs/'
  --include='/assets/three/libs/draco/***'
  --exclude='/assets/three/*'
  --exclude='.git'
  --exclude='.DS_Store'
  --exclude='Thumbs.db'
)

# Local files are macOS-restrictive (700/private) but Apache on this shared
# host reads static files (e.g. .htaccess) directly as a different user than
# the account owner, so it needs group/other read+traverse. --no-perms stops
# rsync from copying our local perms over the server's working 755/644;
# --chmod then sets sane target perms explicitly on every push.
PERM_OPTS="--no-perms --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r"

echo ""
echo "→ Pushing app/ to $REMOTE/…"
[ -n "$DRY_RUN" ] && echo "  (dry-run — no files will change)"
rsync -avz $DRY_RUN --delete $PERM_OPTS "${EXCLUDES[@]}" "$ROOT/app/" "$REMOTE/"

# ---------------------------------------------------------------------------
# 4. Clear server cache so template/plugin changes take effect.
# ---------------------------------------------------------------------------
if [ -z "$DRY_RUN" ]; then
  echo ""
  echo "→ Clearing server cache…"
  ssh ionos 'rm -rf ~/studioisphording/site/cache/* 2>/dev/null; true'
fi

# ---------------------------------------------------------------------------
# 5. Summary.
# ---------------------------------------------------------------------------
echo ""
if [ -n "$DRY_RUN" ]; then
  echo "✓ Dry-run complete — nothing was changed on the server."
else
  echo "✓ Deploy complete."
fi
