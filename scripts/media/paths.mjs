// Derivative naming scheme for the media pipeline.
//
// Every derivative lives under app/assets/media/ — the one output root that is
// both gitignored (like app/assets/bundle) and actually pushed by
// scripts/deploy.sh, whose rsync excludes /content/, /video/ and /media/ but
// has no blanket /assets/ exclude.
//
// Name:  <content-relative-dir>/<basename>.<width>.<hash>.<ext>
// e.g.   projects/01-phenotype-agency/phenotype-agency-00_keyvisual.800.a1b2c3d4.avif
//
// The hash is the variant cache key from cache.mjs, so a name is immutable:
// changing the master bytes, the width, the format or the encoder settings
// produces a different filename. That is what lets the server serve these with
// `Cache-Control: max-age=31536000, immutable`.
//
// The extension is the delivered one (jpeg -> .jpg); FORMAT_EXTENSIONS is the
// single place that mapping lives, and parseDerivativeName() inverts it.

import { posix } from 'node:path'

export const MEDIA_DIR = 'assets/media'
export const MANIFEST_NAME = 'manifest.json'

export const FORMAT_EXTENSIONS = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg'
}

const EXTENSION_FORMATS = Object.fromEntries(
  Object.entries(FORMAT_EXTENSIONS).map(([format, ext]) => [ext, format])
)

export const formatExtension = (format) => {
  const ext = FORMAT_EXTENSIONS[format]
  if (!ext) throw new Error(`paths: unsupported format ${JSON.stringify(format)}.`)
  return ext
}

/** Strip the final extension from a filename, keeping any inner dots. */
export const stripExtension = (filename) => {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/**
 * The derivative's path relative to the media root.
 *
 * @param {string} contentPath content-relative master path, e.g. 'home/landing_reel.jpg'
 * @param {number} width       derivative width in pixels
 * @param {string} hash        variant cache key (hex)
 * @param {string} format      'avif' | 'webp' | 'jpeg'
 */
export const derivativeName = (contentPath, width, hash, format) => {
  if (typeof contentPath !== 'string' || contentPath.length === 0) {
    throw new Error('paths: a content-relative master path is required.')
  }
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`paths: width must be a positive integer, got ${JSON.stringify(width)}.`)
  }
  if (typeof hash !== 'string' || !/^[0-9a-f]+$/.test(hash)) {
    throw new Error(`paths: hash must be a lowercase hex string, got ${JSON.stringify(hash)}.`)
  }

  const dir = posix.dirname(contentPath)
  const base = stripExtension(posix.basename(contentPath))
  const name = `${base}.${width}.${hash}.${formatExtension(format)}`

  return dir === '.' ? name : posix.join(dir, name)
}

/** Absolute path on disk, below the given media root. */
export const derivativeFile = (mediaRoot, contentPath, width, hash, format) =>
  posix.join(mediaRoot, derivativeName(contentPath, width, hash, format))

/**
 * The URL path a Kirby snippet resolves with url(): relative to app/assets,
 * i.e. 'assets/media/<name>'. Kept as a path, not a full URL, so the PHP side
 * stays free to prefix it (see app/site/plugins/vite-manifest/index.php).
 */
export const derivativeUrlPath = (contentPath, width, hash, format) =>
  posix.join(MEDIA_DIR, derivativeName(contentPath, width, hash, format))

/** The manifest's path relative to app/assets — 'assets/media/manifest.json'. */
export const manifestUrlPath = () => posix.join(MEDIA_DIR, MANIFEST_NAME)

/** The manifest's absolute path below a media root. */
export const manifestFile = (mediaRoot) => posix.join(mediaRoot, MANIFEST_NAME)

/**
 * Inverse of derivativeName(): parse a media-root-relative derivative path
 * back into its parts. Returns null when the name does not fit the scheme.
 *
 * The master's original extension is not recoverable from the name — only its
 * directory and basename are — so `base` is returned rather than a content
 * path. The manifest, not the filename, is the authority on which master a
 * derivative came from.
 */
export const parseDerivativeName = (name) => {
  if (typeof name !== 'string' || name.length === 0) return null

  const dir = posix.dirname(name)
  const parts = posix.basename(name).split('.')
  if (parts.length < 4) return null

  const [ext, hash, width] = [parts.pop(), parts.pop(), parts.pop()]
  const base = parts.join('.')

  const format = EXTENSION_FORMATS[ext]
  if (!format) return null
  if (!/^[0-9a-f]+$/.test(hash)) return null
  if (!/^[1-9][0-9]*$/.test(width)) return null
  if (base.length === 0) return null

  return { dir: dir === '.' ? '' : dir, base, width: Number(width), hash, format }
}

// --- video derivatives --------------------------------------------------------
//
// Name:  <content-relative-dir>/<basename>.<codec>.<hash>.<ext>
// e.g.   home/landing_reel.av1.a1b2c3d4.webm
//
// Videos are not resized, so there is no width segment; the codec takes its
// place. The `type` is what a <source type> attribute carries, so a browser can
// skip a rung it cannot decode without downloading it. Declared order is the
// correct <source> order: AV1 first, H.264 as the universal floor.

export const VIDEO_CODECS = {
  av1: { ext: 'webm', type: 'video/webm; codecs="av01.0.08M.08"' },
  vp9: { ext: 'webm', type: 'video/webm; codecs="vp09.00.40.08"' },
  h264: { ext: 'mp4', type: 'video/mp4; codecs="avc1.640028"' }
}

export const VIDEO_CODEC_ORDER = Object.keys(VIDEO_CODECS)

export const videoCodec = (codec) => {
  const entry = VIDEO_CODECS[codec]
  if (!entry) throw new Error(`paths: unsupported video codec ${JSON.stringify(codec)}.`)
  return entry
}

export const videoDerivativeName = (contentPath, codec, hash) => {
  if (typeof contentPath !== 'string' || contentPath.length === 0) {
    throw new Error('paths: a content-relative master path is required.')
  }
  if (typeof hash !== 'string' || !/^[0-9a-f]+$/.test(hash)) {
    throw new Error(`paths: hash must be a lowercase hex string, got ${JSON.stringify(hash)}.`)
  }
  const dir = posix.dirname(contentPath)
  const name = `${stripExtension(posix.basename(contentPath))}.${codec}.${hash}.${videoCodec(codec).ext}`
  return dir === '.' ? name : posix.join(dir, name)
}

export const videoDerivativeFile = (mediaRoot, contentPath, codec, hash) =>
  posix.join(mediaRoot, videoDerivativeName(contentPath, codec, hash))

export const videoDerivativeUrlPath = (contentPath, codec, hash) =>
  posix.join(MEDIA_DIR, videoDerivativeName(contentPath, codec, hash))
