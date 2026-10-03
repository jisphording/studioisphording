// SSIMULACRA2 scorer: locate the binary and score a reference against a candidate.
//
// The binary is the `ssimulacra2` tool from libjxl (Homebrew's jpeg-xl bottle
// ships it) or cloudinary/ssimulacra2 built from source — same interface:
//
//   ssimulacra2 original.png distorted.png   ->  prints one score, e.g. 87.31
//
// Both inputs must be the same dimensions and in a format the tool decodes
// (PNG/JPEG), so callers hand it decoded PNGs, never AVIF/WebP.
//
// Lookup order: $SSIMULACRA2_BIN, then tools/ssimulacra2/bin/ssimulacra2 (what
// scripts/media/setup-scorer.sh builds into), then every directory on $PATH.
// When none exists the scorer reports itself unavailable and the pipeline
// falls back to the calibrated mapping in quality.mjs.
//
// Shell-out goes through an injectable `run`, so tests never invoke a binary.

import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { repoRoot } from './config.mjs'

export const SCORER_ENV = 'SSIMULACRA2_BIN'
export const TOOLS_BINARY = join(repoRoot, 'tools', 'ssimulacra2', 'bin', 'ssimulacra2')

const isExecutable = (file) => {
  try {
    accessSync(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Find the ssimulacra2 binary. Returns its path and where it came from, or
 * null when none is found.
 *
 * @returns {{binary: string, source: 'env'|'tools'|'path'}|null}
 */
export const locateScorer = ({ env = process.env, toolsBinary = TOOLS_BINARY, exists = isExecutable } = {}) => {
  const explicit = env[SCORER_ENV]
  if (explicit) {
    // An explicit path that does not exist is a misconfiguration, not a cue
    // to silently pick some other binary.
    if (!exists(explicit)) throw new Error(`scorer: ${SCORER_ENV}=${explicit} is not an executable file.`)
    return { binary: explicit, source: 'env' }
  }
  if (exists(toolsBinary)) return { binary: toolsBinary, source: 'tools' }
  for (const dir of (env.PATH ?? '').split(delimiter)) {
    if (dir === '') continue
    const candidate = join(dir, 'ssimulacra2')
    if (exists(candidate)) return { binary: candidate, source: 'path' }
  }
  return null
}

const execFileAsync = (binary, args) =>
  new Promise((resolve, reject) => {
    execFile(binary, args, (error, stdout, stderr) => {
      if (error) reject(new Error(`scorer: ${binary} failed: ${stderr || error.message}`))
      else resolve({ stdout })
    })
  })

/** Parse the tool's stdout: the last line that is a bare number. */
export const parseScore = (stdout) => {
  const lines = String(stdout).trim().split(/\r?\n/).reverse()
  for (const line of lines) {
    const value = Number(line.trim())
    if (line.trim() !== '' && Number.isFinite(value)) return value
  }
  throw new Error(`scorer: could not parse a score from ${JSON.stringify(String(stdout).slice(0, 200))}.`)
}

/**
 * @returns {{available: boolean, binary: string|null, source: string|null,
 *            score: (referenceFile: string, candidateFile: string) => Promise<number>}}
 */
export const createScorer = ({ locate = locateScorer, run = execFileAsync } = {}) => {
  const found = locate()
  if (!found) {
    return {
      available: false,
      binary: null,
      source: null,
      async score() {
        throw new Error('scorer: ssimulacra2 is not available; run scripts/media/setup-scorer.sh.')
      }
    }
  }
  return {
    available: true,
    binary: found.binary,
    source: found.source,
    async score(referenceFile, candidateFile) {
      const { stdout } = await run(found.binary, [referenceFile, candidateFile])
      return parseScore(stdout)
    }
  }
}

/** One line for the CLI and setup-scorer.sh. */
export const describeScorer = (scorer) =>
  scorer.available
    ? `scorer: available — ssimulacra2 at ${scorer.binary} (via ${scorer.source}); quality is measured`
    : 'scorer: NOT available — quality will be mapped from the calibration table, not measured ' +
      '(run scripts/media/setup-scorer.sh)'
