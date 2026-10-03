#!/usr/bin/env bash
# One-time, repeatable: put an ssimulacra2 binary where scripts/media/scorer.mjs
# finds it (tools/ssimulacra2/bin/ssimulacra2, gitignored).
#
#   bash scripts/media/setup-scorer.sh
#
# Route 1 (what worked on this workstation, 2026-10-03): Homebrew's jpeg-xl
#   bottle (0.12.0) ships libjxl's `ssimulacra2` tool. Install it and link it
#   into tools/ so the pipeline finds it even without Homebrew on PATH.
# Route 2 (fallback, not exercised here because route 1 worked): build
#   cloudinary/ssimulacra2 from source with CMake into tools/ssimulacra2/.
#   Needs git, cmake, a C++ compiler, highway, little-cms2 and libpng.
#
# Never touches app/. Safe to re-run: an existing working binary is kept.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="$ROOT/tools/ssimulacra2"
BIN="$TOOLS/bin/ssimulacra2"

# Run without arguments the tool prints its usage and exits non-zero.
works() {
  [ -x "$1" ] || return 1
  local out
  out="$("$1" 2>&1 || true)"
  [[ "$out" == *"original.png distorted.png"* ]]
}

if works "$BIN"; then
  echo "setup-scorer: $BIN already present"
else
  mkdir -p "$TOOLS/bin"

  if command -v brew >/dev/null 2>&1; then
    echo "setup-scorer: route 1 — brew install jpeg-xl"
    brew list jpeg-xl >/dev/null 2>&1 || brew install jpeg-xl
    BREW_BIN="$(brew --prefix jpeg-xl)/bin/ssimulacra2"
    if works "$BREW_BIN"; then
      ln -sf "$BREW_BIN" "$BIN"
      echo "setup-scorer: linked $BIN -> $BREW_BIN"
    else
      echo "setup-scorer: the jpeg-xl bottle has no ssimulacra2; falling back to a source build"
    fi
  fi

  if ! works "$BIN"; then
    echo "setup-scorer: route 2 — building cloudinary/ssimulacra2 from source"
    for tool in git cmake c++; do
      command -v "$tool" >/dev/null 2>&1 || { echo "setup-scorer: '$tool' is required for the source build" >&2; exit 1; }
    done
    if command -v brew >/dev/null 2>&1; then
      brew install highway little-cms2 libpng
    fi
    rm -rf "$TOOLS/src"
    git clone --depth 1 https://github.com/cloudinary/ssimulacra2.git "$TOOLS/src"
    cmake -S "$TOOLS/src/src" -B "$TOOLS/build" -DCMAKE_BUILD_TYPE=Release
    cmake --build "$TOOLS/build" --parallel
    rm -f "$BIN"
    cp "$TOOLS/build/ssimulacra2" "$BIN"
    works "$BIN" || { echo "setup-scorer: built binary does not run" >&2; exit 1; }
  fi
fi

# The pipeline's own view: exits non-zero unless it reports the scorer available.
SSIMULACRA2_BIN="$BIN" node "$ROOT/scripts/media/index.mjs" scorer
