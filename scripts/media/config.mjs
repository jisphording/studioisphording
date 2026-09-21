// Media pipeline configuration: loading, validation and per-master resolution.
//
// The config itself lives at the repo root in media.config.mjs (see that file
// for what the knobs mean). This module is the only thing that reads it.
//
// Resolution rule — most-specific-glob-wins, layered:
//
//   Every override whose `match` glob matches the content-relative master path
//   is collected, sorted by specificity ascending, and shallow-merged over
//   `default` in that order. So the most specific matching override has the
//   last word on every field it sets, while fields it leaves out fall through
//   to the next-most-specific match and finally to the default.
//
//   Specificity = the number of literal (non-wildcard) characters in the glob.
//   Ties are broken by declaration order: a later override wins over an
//   earlier one with the same score.

import { stat } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const SUPPORTED_FORMATS = ['avif', 'webp', 'jpeg']

// Keys an override may carry. Anything else is a typo and is rejected loudly
// rather than silently ignored.
const OVERRIDE_KEYS = ['match', 'target', 'quality', 'widths', 'formats', 'eager']
const DEFAULT_KEYS = ['target', 'quality', 'widths', 'formats', 'eager']

class MediaConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MediaConfigError'
  }
}

const fail = (message) => {
  throw new MediaConfigError(message)
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPositiveInt = (value) => Number.isInteger(value) && value > 0

// --- glob matching ----------------------------------------------------------

// Translate a path glob to an anchored regular expression. `**` crosses path
// separators, `*` and `?` do not.
const globToRegExp = (glob) => {
  let out = ''
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i]
    if (char === '*') {
      if (glob[i + 1] === '*') {
        out += '.*'
        i += 1
      } else {
        out += '[^/]*'
      }
    } else if (char === '?') {
      out += '[^/]'
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`)
}

export const matchesGlob = (glob, path) => globToRegExp(glob).test(path)

// The number of literal characters in the glob — wildcards contribute nothing.
export const globSpecificity = (glob) => {
  let score = 0
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i]
    if (char === '*') {
      if (glob[i + 1] === '*') i += 1
      continue
    }
    if (char === '?') continue
    score += 1
  }
  return score
}

// --- validation -------------------------------------------------------------

const validateQuality = (quality, where) => {
  if (quality === undefined) return
  if (!isPlainObject(quality)) {
    fail(
      `${where}: \`quality\` must be a per-format map such as ` +
        `{ avif: 64, webp: 82 }, not ${JSON.stringify(quality)}. ` +
        'A single number cannot mean one fidelity across AVIF, WebP and JPEG — ' +
        'their quality scales are not comparable. Use `target` (an SSIMULACRA2 ' +
        'score) to express one fidelity across every format.'
    )
  }
  const formats = Object.keys(quality)
  if (formats.length === 0) fail(`${where}: \`quality\` must name at least one format.`)
  for (const format of formats) {
    if (!SUPPORTED_FORMATS.includes(format)) {
      fail(
        `${where}: \`quality.${format}\` is not a supported format ` +
          `(${SUPPORTED_FORMATS.join(', ')}).`
      )
    }
    const value = quality[format]
    if (!isPositiveInt(value) || value > 100) {
      fail(`${where}: \`quality.${format}\` must be an integer from 1 to 100, got ${JSON.stringify(value)}.`)
    }
  }
}

const validateBlock = (block, where, allowedKeys) => {
  if (!isPlainObject(block)) fail(`${where} must be an object.`)

  for (const key of Object.keys(block)) {
    if (!allowedKeys.includes(key)) {
      fail(`${where}: unknown key \`${key}\` (allowed: ${allowedKeys.join(', ')}).`)
    }
  }

  if (block.target !== undefined) {
    if (typeof block.target !== 'number' || !Number.isFinite(block.target) || block.target <= 0 || block.target > 100) {
      fail(`${where}: \`target\` must be an SSIMULACRA2 score above 0 and at most 100, got ${JSON.stringify(block.target)}.`)
    }
  }

  validateQuality(block.quality, where)

  if (block.widths !== undefined) {
    if (!Array.isArray(block.widths) || block.widths.length === 0) {
      fail(`${where}: \`widths\` must be a non-empty array of pixel widths.`)
    }
    for (const width of block.widths) {
      if (!isPositiveInt(width)) {
        fail(`${where}: \`widths\` must contain positive integers, got ${JSON.stringify(width)}.`)
      }
    }
  }

  if (block.formats !== undefined) {
    if (!Array.isArray(block.formats) || block.formats.length === 0) {
      fail(`${where}: \`formats\` must be a non-empty array.`)
    }
    for (const format of block.formats) {
      if (!SUPPORTED_FORMATS.includes(format)) {
        fail(`${where}: \`formats\` contains ${JSON.stringify(format)}; supported: ${SUPPORTED_FORMATS.join(', ')}.`)
      }
    }
  }

  if (block.eager !== undefined && typeof block.eager !== 'boolean') {
    fail(`${where}: \`eager\` must be a boolean, got ${JSON.stringify(block.eager)}.`)
  }
}

/**
 * Validate a media config object. Throws MediaConfigError with an explanatory
 * message on the first problem found; returns the config unchanged otherwise.
 */
export const validateConfig = (config) => {
  if (!isPlainObject(config)) fail('media config: the default export must be an object.')

  for (const key of Object.keys(config)) {
    if (key !== 'default' && key !== 'overrides') {
      fail(`media config: unknown top-level key \`${key}\` (allowed: default, overrides).`)
    }
  }

  if (config.default === undefined) fail('media config: a `default` block is required.')
  validateBlock(config.default, 'media config default', DEFAULT_KEYS)

  for (const key of ['target', 'widths', 'formats']) {
    if (config.default[key] === undefined) {
      fail(`media config default: \`${key}\` is required.`)
    }
  }

  const overrides = config.overrides ?? []
  if (!Array.isArray(overrides)) fail('media config: `overrides` must be an array.')

  overrides.forEach((override, index) => {
    const where = `media config overrides[${index}]`
    validateBlock(override, where, OVERRIDE_KEYS)
    if (typeof override.match !== 'string' || override.match.length === 0) {
      fail(`${where}: \`match\` must be a non-empty glob string.`)
    }
  })

  return config
}

/**
 * Load and validate the media config. `path` defaults to media.config.mjs at
 * the repo root.
 */
export const loadConfig = async (path = join(repoRoot, 'media.config.mjs')) => {
  // Cache-bust on mtime/size so a test can load two different configs written
  // to the same path, which ESM would otherwise serve from its module cache.
  const stats = await stat(path)
  const url = `${pathToFileURL(path).href}?t=${stats.mtimeMs}-${stats.size}`
  const module = await import(url)
  return validateConfig(module.default)
}

// --- resolution -------------------------------------------------------------

/**
 * Resolve the effective settings for one content-relative master path.
 *
 * @returns {{target: number, widths: number[], formats: string[],
 *            quality: object|undefined, eager: boolean, matched: string[]}}
 */
export const resolveSettings = (config, contentPath) => {
  if (typeof contentPath !== 'string' || contentPath.length === 0) {
    fail('resolveSettings: a content-relative path is required.')
  }

  const overrides = (config.overrides ?? [])
    .map((override, index) => ({ override, index }))
    .filter(({ override }) => matchesGlob(override.match, contentPath))
    .sort((a, b) => {
      const delta = globSpecificity(a.override.match) - globSpecificity(b.override.match)
      return delta !== 0 ? delta : a.index - b.index
    })

  let resolved = { eager: false, ...config.default }
  for (const { override } of overrides) {
    const { match, ...fields } = override
    resolved = { ...resolved, ...fields }
  }

  return { ...resolved, matched: overrides.map(({ override }) => override.match) }
}

/**
 * The slice of resolved settings that actually changes the bytes of one
 * encoded variant — and therefore the only slice that belongs in a cache key.
 *
 * `eager`, `widths` and `formats` are deliberately excluded: they steer which
 * variants get built and how they are rendered, not what any one encode
 * produces. Flipping `eager` must not invalidate a warm cache.
 */
export const encoderSettings = (resolved, format) => {
  if (!SUPPORTED_FORMATS.includes(format)) {
    fail(`encoderSettings: unsupported format ${JSON.stringify(format)}.`)
  }
  const explicit = resolved.quality?.[format]
  return explicit === undefined
    ? { format, mode: 'target', target: resolved.target }
    : { format, mode: 'quality', quality: explicit }
}

export { MediaConfigError }
