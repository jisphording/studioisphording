#!/usr/bin/env node
// Keep the Draco decoder in lockstep with the pinned three version.
//
// The DRACOLoader (dev/js/three/utils/Resources.mjs) resolves its decoder from
// /assets/three/libs/draco/. That decoder MUST match the DRACOLoader shipped in
// node_modules/three, or a Draco-compressed glTF fails to decode. Rather than
// hand-mirror the folder from the live server (which drifts on every `three`
// bump), regenerate it from node_modules at build time so a local build and a
// deployed build always get the same decoder.
//
// Wired into the build via the `prebuild` npm script, NOT into deploy: the
// decoder is a build artifact, so `scripts/deploy.sh` ships whatever the build
// produced under app/assets/three/. See that script's build log note.

import { cpSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const source = resolve(repoRoot, 'node_modules/three/examples/jsm/libs/draco')
const target = resolve(repoRoot, 'app/assets/three/libs/draco')

if (!existsSync(source)) {
  console.error(`copy-draco: source not found at ${source}. Run \`npm ci\` first.`)
  process.exit(1)
}

// Wipe the target so the result is byte-identical to node_modules (no stale
// files such as the encoder that the mirrored live-server copy carried).
rmSync(target, { recursive: true, force: true })
cpSync(source, target, { recursive: true })

// Verify the mirror is exact, comparing file sets and bytes recursively.
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const sourceFiles = walk(source).map((f) => relative(source, f)).sort()
const targetFiles = walk(target).map((f) => relative(target, f)).sort()

let mismatch = false
if (JSON.stringify(sourceFiles) !== JSON.stringify(targetFiles)) {
  mismatch = true
} else {
  for (const rel of sourceFiles) {
    if (!readFileSync(join(source, rel)).equals(readFileSync(join(target, rel)))) {
      console.error(`copy-draco: byte mismatch after copy: ${rel}`)
      mismatch = true
    }
  }
}

if (mismatch) {
  console.error('copy-draco: decoder is NOT in lockstep with node_modules/three.')
  process.exit(1)
}

console.log(`copy-draco: Draco decoder synced from node_modules/three into ${relative(repoRoot, target)} (${sourceFiles.length} files).`)
