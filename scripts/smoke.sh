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

# Refuse to test whatever else is already listening on the port (e.g. a
# stray uvicorn on 8000) instead of silently curling it and calling that
# a pass.
if (exec 3<>"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
  echo "smoke test: FAIL - port ${PORT} is already in use by another process; pick a free PORT (e.g. PORT=8011)." >&2
  exit 1
fi

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

# wait until the server answers, but bail immediately (with the server's
# own log) if php -S already died instead of silently testing whatever
# else might be listening on the port.
SERVER_READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "smoke test: FAIL - php -S on port ${PORT} exited before it started serving. Server log:" >&2
    cat /tmp/studioisphording-smoke-server.log >&2
    exit 1
  fi
  if curl -s -o /dev/null "http://127.0.0.1:${PORT}/"; then
    SERVER_READY=1
    break
  fi
  sleep 0.1
done

if [[ "$SERVER_READY" -ne 1 ]]; then
  echo "smoke test: FAIL - server on port ${PORT} did not become ready in time." >&2
  exit 1
fi

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

# Fixed list of built assets that must be reachable — a site-wide 404 on
# these (e.g. the phase-1 /assets/assets/fonts/ double-prefix bug) never
# shows up in the page loop above, which only checks HTML responses.
ASSET_PATHS=(
  "/assets/bundle/app.css"
  "/assets/fonts/RadioGrotesk-Regular.woff2"
  "/assets/fonts/RadioGrotesk-Bold.woff2"
  "/assets/fonts/MonumentExtended-Bold.woff2"
  "/assets/fonts/MonumentExtended-Black.woff2"
  "/assets/fonts/Grafier-Regular.woff2"
)

HOME_BODY_FILE="$(mktemp)"

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
    # Fingerprint of the phase-2 bug: a hand-built /content/ path, which
    # Kirby's .htaccess rewrites to index.php and can never resolve.
    if [[ "$result" == "PASS" ]] && grep -qE '(src|href)="[^"]*/content/' "$body_file"; then
      result="FAIL"
    fi
  fi

  if [[ "$path" == "/de/" ]]; then
    cp "$body_file" "$HOME_BODY_FILE"
  fi
  rm -f "$body_file"

  printf "%-40s %-6s %s\n" "$path" "$status" "$result"
  if [[ "$result" == "FAIL" ]]; then
    FAIL=1
  fi
done

for path in "${ASSET_PATHS[@]}"; do
  url="${BASE_URL}${path}"
  body_file="$(mktemp)"
  status=$(curl -s -o "$body_file" -w "%{http_code}" "$url" || echo "000")

  result="PASS"
  if [[ "$status" != "200" ]]; then
    result="FAIL"
  elif [[ "$path" == "/assets/bundle/app.css" ]] && grep -qF "/assets/assets/" "$body_file"; then
    # Fingerprint of the phase-1 bug: a relative font url() that resolves
    # to a doubled /assets/assets/ prefix once served from the bundle.
    result="FAIL"
  fi
  rm -f "$body_file"

  printf "%-40s %-6s %s\n" "$path" "$status" "$result"
  if [[ "$result" == "FAIL" ]]; then
    FAIL=1
  fi
done

# Derive the showreel video URL from the rendered home page instead of
# hardcoding it, so a content rename doesn't silently stop testing it.
VIDEO_PATH=$(grep -o '<source src="[^"]*"' "$HOME_BODY_FILE" | head -1 | sed -E 's/<source src="([^"]*)"/\1/')
rm -f "$HOME_BODY_FILE"

if [[ -z "$VIDEO_PATH" ]]; then
  printf "%-40s %-6s %s\n" "(showreel video)" "n/a" "FAIL"
  FAIL=1
else
  video_url="$VIDEO_PATH"
  if [[ "$video_url" != http* ]]; then
    video_url="${BASE_URL}${VIDEO_PATH}"
  fi
  status=$(curl -s -o /dev/null -w "%{http_code}" "$video_url" || echo "000")
  result="PASS"
  if [[ "$status" != "200" ]]; then
    result="FAIL"
  fi
  printf "%-40s %-6s %s\n" "$VIDEO_PATH" "$status" "$result"
  if [[ "$result" == "FAIL" ]]; then
    FAIL=1
  fi
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo
  echo "smoke test: FAIL"
  exit 1
fi

echo
echo "smoke test: PASS"
