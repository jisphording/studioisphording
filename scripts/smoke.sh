#!/usr/bin/env bash
# Boot the local PHP dev server through Kirby's router and curl a fixed list
# of URLs, asserting HTTP 200 and no PHP-version / Whoops / fatal-error
# markers in the body. Used as the gate every later recovery phase must
# leave at least as green as it found it.
#
# Usage: bash scripts/smoke.sh
#   BASE_URL / PORT env vars override the default 127.0.0.1:8000 target.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PORT="${PORT:-8000}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT}}"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

php -S 127.0.0.1:"$PORT" -t "$ROOT/app" "$ROOT/app/kirby/router.php" \
  >/tmp/studioisphording-smoke-server.log 2>&1 &
SERVER_PID=$!

# wait until the server answers
for _ in $(seq 1 50); do
  if curl -s -o /dev/null "http://127.0.0.1:${PORT}/"; then
    break
  fi
  sleep 0.1
done

PROJECT_DIRS=$(find "$ROOT/app/content/projects" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

PATHS=(
  "/"
  "/about"
  "/projects"
  "/imprint"
  "/privacy"
)
while IFS= read -r dir; do
  # Kirby splits folder names at the first "_" into <num>_<slug>
  # (Dir::inventoryChild), so "berlin_im_wandel_der_zeiten" is served
  # at /projects/im_wandel_der_zeiten
  PATHS+=("/projects/${dir#*_}")
done <<<"$PROJECT_DIRS"

# de is the default language but has no custom 'url' in
# site/languages/de.php, so Kirby serves it under /de and 302-redirects
# unprefixed paths there — test the canonical prefixed URLs
ALL_PATHS=()
for lang in de en it; do
  for p in "${PATHS[@]}"; do
    ALL_PATHS+=("/${lang}${p}")
  done
done

BAD_MARKERS=(
  "Change the PHP version"
  "Whoops"
  "Fatal error"
  "Warning:"
  "Deprecated:"
  "Notice:"
)

FAIL=0
printf "%-40s %-6s %s\n" "URL" "STATUS" "RESULT"
printf "%-40s %-6s %s\n" "---" "------" "------"

for path in "${ALL_PATHS[@]}"; do
  url="${BASE_URL}${path}"
  body_file="$(mktemp)"
  status=$(curl -s -o "$body_file" -w "%{http_code}" "$url" || echo "000")

  result="PASS"
  if [[ "$status" != "200" ]]; then
    result="FAIL"
  else
    for marker in "${BAD_MARKERS[@]}"; do
      if grep -qF "$marker" "$body_file"; then
        result="FAIL"
        break
      fi
    done
  fi
  rm -f "$body_file"

  printf "%-40s %-6s %s\n" "$path" "$status" "$result"
  if [[ "$result" == "FAIL" ]]; then
    FAIL=1
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  echo
  echo "smoke test: FAIL"
  exit 1
fi

echo
echo "smoke test: PASS"
