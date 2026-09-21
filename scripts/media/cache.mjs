// Content-hash cache for the media pipeline.
//
// A pruned table of ~5 widths x 263 masters x 3 formats is ~4,000 encodes, and
// the SSIMULACRA2 targeting loop multiplies that several-fold. Without a cache
// a warm run would re-encode everything; with one it is a no-op.
//
// The cache is the filesystem itself: the variant hash goes into the
// derivative's filename (see paths.mjs), so "already encoded" is one existsSync
// and there is no sidecar index to fall out of sync.
//
// Key = sha256(master content hash + width + format + resolved encoder settings)
//
// Encoder settings come from config.mjs's encoderSettings(), which deliberately
// excludes `eager`, `widths` and `formats` — those steer which variants exist
// and how they render, not what any one encode produces. Flipping `eager` must
// not invalidate a warm cache.

import { createHash } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { derivativeFile, derivativeName, derivativeUrlPath } from './paths.mjs'

export const HASH_LENGTH = 8

/** Stable JSON: object keys sorted recursively, so key order never moves a hash. */
export const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value === undefined ? null : value)
}

/** Full sha256 of a buffer, hex. Used for the master's content hash. */
export const hashBytes = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Full sha256 of a file's bytes, hex. */
export const hashFile = async (path) => hashBytes(await readFile(path))

/**
 * The variant hash that lands in the derivative's filename.
 *
 * @param {object} input
 * @param {string} input.masterHash  hashFile()/hashBytes() of the master
 * @param {number} input.width       derivative width
 * @param {string} input.format      'avif' | 'webp' | 'jpeg'
 * @param {object} input.settings    encoderSettings(resolved, format)
 * @param {number} [length]          hash length in hex characters
 */
export const variantHash = ({ masterHash, width, format, settings }, length = HASH_LENGTH) => {
  if (typeof masterHash !== 'string' || masterHash.length === 0) {
    throw new Error('cache: masterHash is required.')
  }
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`cache: width must be a positive integer, got ${JSON.stringify(width)}.`)
  }
  if (typeof format !== 'string' || format.length === 0) {
    throw new Error('cache: format is required.')
  }

  const payload = canonicalJson({ masterHash, width, format, settings: settings ?? null })
  return createHash('sha256').update(payload).digest('hex').slice(0, length)
}

/**
 * Decide whether one variant still has to be encoded.
 *
 * @returns {{hash: string, name: string, file: string, url: string, hit: boolean, bytes: number|null}}
 *   `hit` is true when the derivative already exists on disk; `bytes` is its
 *   size on a hit and null on a miss.
 */
export const cacheDecision = ({ mediaRoot, contentPath, width, format, masterHash, settings }) => {
  const hash = variantHash({ masterHash, width, format, settings })
  const name = derivativeName(contentPath, width, hash, format)
  const file = derivativeFile(mediaRoot, contentPath, width, hash, format)
  const url = derivativeUrlPath(contentPath, width, hash, format)
  const hit = existsSync(file)

  return { hash, name, file, url, hit, bytes: hit ? statSync(file).size : null }
}
