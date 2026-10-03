// Media manifest: accumulation and atomic, deterministic write.
//
// ============================================================================
// MANIFEST SCHEMA v1 — app/assets/media/manifest.json
// ============================================================================
//
// The PHP side (a `media-manifest` plugin modelled on vite-manifest) reads this
// file once per request, statically caches it, and resolves a content-relative
// master path to <picture> sources. It must not have to reverse-engineer the
// shape, so it is specified here and pinned by tests/js/media/manifest.test.mjs.
//
// {
//   "version": 1,
//   "images": {
//     "<content-relative master path>": {          // e.g. "home/landing_reel.jpg"
//       "width":  <int>,                            // intrinsic width of the master
//       "height": <int>,                            // intrinsic height of the master
//       "eager":  <bool>,                           // render eagerly (LCP candidate)
//       "variants": [
//         {
//           "format": "avif" | "webp" | "jpeg",
//           "width":  <int>,                        // derivative width in pixels
//           "height": <int>,                        // derivative height in pixels
//           "bytes":  <int>,                        // encoded file size
//           "url":    "assets/media/<...>"          // path relative to app/assets'
//         }                                         //   parent; feed it to url()
//       ]
//     }
//   }
// }
//
// Guarantees the PHP side may rely on:
//
//   * `images` keys are the content-relative path of the master, with forward
//     slashes and no leading slash — exactly what $file->id() yields.
//   * Every entry has at least one variant.
//   * `variants` is sorted by format (the order in FORMAT_ORDER: avif, webp,
//     jpeg — the correct <source> order) and then by width ascending, so a
//     snippet can group by format and emit srcsets without re-sorting.
//   * `url` is immutable: it carries the variant content hash, so it may be
//     served with `Cache-Control: max-age=31536000, immutable`.
//   * A master absent from `images` is not an error. The caller degrades to
//     Kirby's existing thumb path, never to a broken image.
//
// VIDEO ADDITION (additive, still version 1 — the PHP side ignores it until
// phase 7). The top-level `videos` key is present only when a video run has
// written entries:
//
//   "videos": {
//     "<content-relative master path>": {          // e.g. "home/landing_reel.mp4"
//       "width": <int>, "height": <int>, "duration": <seconds>,
//       "poster": "<key into `images`>",             // a first-class image entry
//       "variants": [
//         { "codec": "av1" | "vp9" | "h264", "type": "<source type attr>",
//           "bytes": <int>, "crf": <int|null>, "url": "assets/media/<...>" }
//       ]                                            // sorted av1, vp9, h264
//     }
//   }
//
// `images` and `videos` are written by two separate commands, so each command
// merges into the file rather than replacing it (see the helpers below).
//
// The file is written atomically (temp file + rename) with sorted keys and no
// timestamp, so it is byte-identical for identical input and diffs cleanly.
// ============================================================================

import { mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { manifestFile } from './paths.mjs'

export const MANIFEST_VERSION = 1

// Also the correct <source> order: AVIF first, JPEG as the universal floor.
export const FORMAT_ORDER = ['avif', 'webp', 'jpeg']

const requireInt = (value, label) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`manifest: ${label} must be a positive integer, got ${JSON.stringify(value)}.`)
  }
  return value
}

const sortVariants = (variants) =>
  [...variants].sort((a, b) => {
    const delta = FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)
    return delta !== 0 ? delta : a.width - b.width
  })

const normaliseVariant = (variant) => {
  if (!FORMAT_ORDER.includes(variant.format)) {
    throw new Error(`manifest: unknown variant format ${JSON.stringify(variant.format)}.`)
  }
  if (typeof variant.url !== 'string' || variant.url.length === 0) {
    throw new Error('manifest: a variant needs a url.')
  }
  return {
    format: variant.format,
    width: requireInt(variant.width, 'variant width'),
    height: requireInt(variant.height, 'variant height'),
    bytes: requireInt(variant.bytes, 'variant bytes'),
    url: variant.url
  }
}

/**
 * An accumulator for one pipeline run. Entries may arrive in any order and a
 * master's variants may arrive in several calls; the written file is sorted
 * either way.
 */
export const createManifest = () => {
  const images = new Map()

  return {
    /**
     * @param {object} entry
     * @param {string} entry.source   content-relative master path
     * @param {number} entry.width    intrinsic master width
     * @param {number} entry.height   intrinsic master height
     * @param {boolean} [entry.eager]
     * @param {Array} [entry.variants]
     */
    addImage({ source, width, height, eager = false, variants = [] }) {
      if (typeof source !== 'string' || source.length === 0) {
        throw new Error('manifest: an image entry needs a content-relative source path.')
      }
      const existing = images.get(source)
      images.set(source, {
        width: requireInt(width, 'image width'),
        height: requireInt(height, 'image height'),
        eager: Boolean(eager),
        variants: [...(existing?.variants ?? []), ...variants.map(normaliseVariant)]
      })
      return this
    },

    addVariant(source, variant) {
      const entry = images.get(source)
      if (!entry) throw new Error(`manifest: addVariant before addImage for ${JSON.stringify(source)}.`)
      entry.variants.push(normaliseVariant(variant))
      return this
    },

    get size() {
      return images.size
    },

    /** The manifest as a plain, deterministically ordered object. */
    toJSON() {
      const out = {}
      for (const source of [...images.keys()].sort()) {
        const entry = images.get(source)
        if (entry.variants.length === 0) {
          throw new Error(`manifest: ${JSON.stringify(source)} has no variants.`)
        }
        out[source] = {
          width: entry.width,
          height: entry.height,
          eager: entry.eager,
          variants: sortVariants(entry.variants)
        }
      }
      return { version: MANIFEST_VERSION, images: out }
    }
  }
}

/** Serialise a manifest to the exact bytes written to disk (2-space JSON + newline). */
export const serialiseManifest = (manifest) => {
  const data = typeof manifest.toJSON === 'function' ? manifest.toJSON() : manifest
  return `${JSON.stringify(data, null, 2)}\n`
}

/**
 * Write <mediaRoot>/manifest.json atomically: a temp file in the same
 * directory, then a rename, so a reader never sees a half-written manifest and
 * a crashed run never leaves a truncated one behind.
 *
 * @returns {string} the path written
 */
export const writeManifest = (mediaRoot, manifest) => {
  const target = manifestFile(mediaRoot)
  const temp = `${target}.${process.pid}.tmp`

  mkdirSync(dirname(target), { recursive: true })
  try {
    writeFileSync(temp, serialiseManifest(manifest))
    renameSync(temp, target)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }

  return target
}

/** Read a manifest back. Returns null when the file does not exist. */
export const readManifest = async (mediaRoot) => {
  try {
    return JSON.parse(await readFile(manifestFile(mediaRoot), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const sortedKeys = (object) =>
  Object.fromEntries(Object.keys(object).sort().map((key) => [key, object[key]]))

/**
 * Overlay `patch` on `base` (both plain manifest data), per master key, so a
 * scoped video run keeps every other entry. Either may be null/partial.
 */
export const mergeManifestData = (base, patch) => {
  const images = sortedKeys({ ...base?.images, ...patch?.images })
  const videos = sortedKeys({ ...base?.videos, ...patch?.videos })
  return {
    version: MANIFEST_VERSION,
    images,
    ...(Object.keys(videos).length > 0 ? { videos } : {})
  }
}

/**
 * A fresh, full images manifest replaces the old `images` — stale masters
 * disappear — but must not lose the video state: the `videos` map and the
 * poster entries those videos point at (extracted frames are not in app/content,
 * so an images run never rediscovers them).
 */
export const keepVideoState = (existing, data) => {
  const posters = {}
  for (const video of Object.values(existing?.videos ?? {})) {
    const entry = existing.images?.[video.poster]
    if (entry && !data.images[video.poster]) posters[video.poster] = entry
  }
  return mergeManifestData({ videos: existing?.videos }, { images: { ...data.images, ...posters } })
}
