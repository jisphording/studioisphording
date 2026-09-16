#!/usr/bin/env bash
# Take a performance snapshot of the production build served locally, for
# before/after comparisons around a refactor and as input for media/loading
# optimisation. Writes perf/<timestamp>-<label>/ with:
#   report.md        human- and Claude-readable findings
#   summary.json     raw numbers (input for scripts/perf/compare.mjs)
#   lighthouse/      full Lighthouse HTML report per page and form factor
#
# Collects: Lighthouse web vitals (median of N runs, mobile + desktop), a real
# browser probe (late/scroll-triggered loads, WebGL frame times, heap), a
# static media audit of every /de page, TTFB, bundle size, code size, and an
# inventory of heavy media on disk. Read-only: nothing under app/content is
# touched.
#
# Usage: bash scripts/perf.sh [--label NAME] [--quick] [--no-build]
#                             [--runs N] [--pages "/de /de/about"]
#                             [--form-factors mobile,desktop]
#                             [--throttling simulate|devtools|provided]
#                             [--skip-lighthouse] [--skip-probe]
#   PORT env var overrides the default 8013.
#
# Compare the two latest snapshots: node scripts/perf/compare.mjs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8013}"

LABEL="snapshot"
BUILD=1
COLLECT_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) LABEL="$2"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    # One desktop run per page — a fast sanity check, too noisy for comparisons.
    --quick) COLLECT_ARGS+=(--runs 1 --form-factors desktop); shift ;;
    --runs|--pages|--form-factors|--throttling) COLLECT_ARGS+=("$1" "$2"); shift 2 ;;
    --skip-lighthouse|--skip-probe) COLLECT_ARGS+=("$1"); shift ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "perf: unknown option $1 (see --help)" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$ROOT/node_modules/lighthouse" ]]; then
  echo "perf: FAIL - lighthouse is not installed; run npm ci first." >&2
  exit 1
fi

if (exec 3<>"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
  echo "perf: FAIL - port ${PORT} is already in use by another process; pick a free PORT." >&2
  exit 1
fi

if [[ "$BUILD" -eq 1 ]]; then
  echo "perf: building production bundle"
  BUILD_LOG="$(mktemp -t studioisphording-perf-build)"
  if ! (cd "$ROOT" && npm run build >"$BUILD_LOG" 2>&1); then
    echo "perf: FAIL - npm run build failed. Build log:" >&2
    cat "$BUILD_LOG" >&2
    exit 1
  fi
  rm -f "$BUILD_LOG"
fi

SERVER_PID=""
SERVER_LOG="$(mktemp -t studioisphording-perf-server)"
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    # PHP_CLI_SERVER_WORKERS forks children that keep the port open when only
    # the parent is killed — stop the workers first.
    pkill -P "$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$SERVER_LOG"
}
trap cleanup EXIT

# Bind to 0.0.0.0, a SERVER_NAME with no config.<host>.php, so Kirby uses the
# production config.php (debug off, built bundle instead of the Vite dev
# server). Several workers so parallel asset requests are not serialised the
# way a single php -S process would.
PHP_CLI_SERVER_WORKERS=4 php -S 0.0.0.0:"$PORT" -t "$ROOT/app" "$ROOT/app/kirby/router.php" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

SERVER_READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "perf: FAIL - php -S on port ${PORT} exited before it started serving. Server log:" >&2
    cat "$SERVER_LOG" >&2
    exit 1
  fi
  if curl -s -o /dev/null "http://0.0.0.0:${PORT}/"; then
    SERVER_READY=1
    break
  fi
  sleep 0.1
done

if [[ "$SERVER_READY" -ne 1 ]]; then
  echo "perf: FAIL - server on port ${PORT} did not become ready in time." >&2
  exit 1
fi

node "$ROOT/scripts/perf/collect.mjs" \
  --base-url "http://0.0.0.0:${PORT}" \
  --label "$LABEL" \
  ${COLLECT_ARGS[@]+"${COLLECT_ARGS[@]}"}
