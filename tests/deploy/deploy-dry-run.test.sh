#!/usr/bin/env bash
# Runs a copy of scripts/deploy.sh in a throwaway tree with composer/npm/rsync/ssh
# stubbed on PATH, and asserts when `composer install --no-dev` is invoked.
set -uo pipefail

SRC="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAIL=0

setup() {  # builds a fresh fixture tree + recording stubs under $TMP/work
  rm -rf "$TMP/work"
  mkdir -p "$TMP/work/scripts" "$TMP/work/bin" \
    "$TMP/work/app/assets/bundle" "$TMP/work/app/kirby" "$TMP/work/app/assets/media"
  cp "$SRC/scripts/deploy.sh" "$TMP/work/scripts/deploy.sh"
  touch "$TMP/work/app/assets/bundle/app.js" "$TMP/work/app/kirby/bootstrap.php" \
    "$TMP/work/app/index.php" "$TMP/work/app/.htaccess" "$TMP/work/app/assets/media/manifest.json"
  : > "$TMP/calls.log"
  for cmd in composer npm rsync ssh; do
    printf '#!/usr/bin/env bash\necho "%s $*" >> "%s"\n' "$cmd" "$TMP/calls.log" > "$TMP/work/bin/$cmd"
    chmod +x "$TMP/work/bin/$cmd"
  done
}

run_deploy() {
  PATH="$TMP/work/bin:$PATH" bash "$TMP/work/scripts/deploy.sh" "$@" > "$TMP/out.log" 2>&1
}

check() {  # <description> <condition-exit-status>
  if [ "$2" -eq 0 ]; then echo "ok   - $1"; else echo "FAIL - $1"; FAIL=1; fi
}

setup
run_deploy --dry-run
check "dry-run exits 0" $?
grep -q 'composer install --no-dev' "$TMP/calls.log"
check "dry-run does not run composer install --no-dev" $((! $? ))
grep -q 'rsync .*--dry-run' "$TMP/calls.log"
check "dry-run still invokes rsync --dry-run" $?
grep -q 'Skipping' "$TMP/out.log"
check "dry-run prints what it skipped" $?

setup
run_deploy
check "real deploy exits 0" $?
grep -q 'composer install --no-dev --optimize-autoloader' "$TMP/calls.log"
check "real deploy runs composer install --no-dev --optimize-autoloader" $?

exit $FAIL
