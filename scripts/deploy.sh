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
# 1. Build first — guarantees app/assets/bundle is fresh.
# ---------------------------------------------------------------------------
echo "→ Running production build…"
(cd "$ROOT" && npm run build)

if [ ! -d "$ROOT/app/assets/bundle" ]; then
  echo "✗ Build did not produce app/assets/bundle/. Aborting." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Push app/ → remote / (mirror with --delete).
#
#    Runtime/local-only trees are excluded both ways, so --delete can't wipe
#    server-only Kirby state (cache/sessions), any Panel account that exists
#    only on the server, or generated media thumbnails.
# ---------------------------------------------------------------------------
EXCLUDES=(
  --exclude='/site/cache/'
  --exclude='/site/sessions/'
  --exclude='/site/accounts/'
  --exclude='/site/config/config.localhost.php'
  --exclude='/site/config/config.127.0.0.1.php'
  --exclude='/media/'
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
# 3. Clear server cache so template/plugin changes take effect.
# ---------------------------------------------------------------------------
if [ -z "$DRY_RUN" ]; then
  echo ""
  echo "→ Clearing server cache…"
  ssh ionos 'rm -rf ~/studioisphording/site/cache/* 2>/dev/null; true'
fi

# ---------------------------------------------------------------------------
# 4. Summary.
# ---------------------------------------------------------------------------
echo ""
if [ -n "$DRY_RUN" ]; then
  echo "✓ Dry-run complete — nothing was changed on the server."
else
  echo "✓ Deploy complete."
fi
