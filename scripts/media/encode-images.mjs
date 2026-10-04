// Image encoding: sharp encoder + the per-master x width x format loop.
//
// Never upscales: widths above the master's intrinsic width are dropped, and
// when the master is narrower than every configured width it is emitted once
// at its own width. Invoked deliberately via `npm run media:images`; not part
// of prebuild/build.
//
// Quality: an explicit per-codec `quality` map encodes once at that number. A
// `target` goes through quality.mjs — measured with SSIMULACRA2 when the
// scorer is available, mapped from the calibration table when it is not. Every
// measured variant that misses its band is logged and counted in `misses`.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import { encoderSettings, resolveSettings } from './config.mjs'
import { cacheDecision, createMemoryQualityCache, hashFile } from './cache.mjs'
import { ENCODER_OPTIONS } from './encoder-options.mjs'
import { createManifest } from './manifest.mjs'
import { createQualityResolver } from './quality.mjs'

const resized = (masterFile, width) => sharp(masterFile).rotate().resize({ width, withoutEnlargement: true })

export const createSharpEncoder = () => ({
  async probe(masterFile) {
    const { width, height } = await sharp(masterFile).metadata()
    return { width, height }
  },

  async reference({ masterFile, width }) {
    return resized(masterFile, width).png({ compressionLevel: 1 }).toBuffer()
  },

  async decode(data) {
    return sharp(data).png({ compressionLevel: 1 }).toBuffer()
  },

  async encode({ masterFile, width, format, settings }) {
    if (settings.mode !== 'quality') {
      throw new Error(`encoder: needs a resolved quality, got mode ${JSON.stringify(settings.mode)}.`)
    }
    const { quality } = settings
    const pipeline = resized(masterFile, width)
    // Options live in encoder-options.mjs so qualityKey hashes the same values.
    const options = { quality, ...ENCODER_OPTIONS[format] }
    if (format === 'avif') pipeline.avif(options)
    else if (format === 'webp') pipeline.webp(options)
    else pipeline.jpeg(options)
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
    return { data, width: info.width, height: info.height }
  }
})

const effectiveWidths = (widths, intrinsicWidth) => {
  const capped = widths.filter((w) => w <= intrinsicWidth)
  return capped.length > 0 ? capped : [intrinsicWidth]
}

/**
 * @param {object} input
 * @param {object} input.scorer        scorer.mjs createScorer(); `{ available: false }` maps instead
 * @param {object} [input.qualityCache] cache.mjs createQualityCache(); in-memory by default
 * @returns {Promise<{manifest, encoded: number, cached: number, bytes: number, masters: number,
 *            method: string, searches: number, misses: object[]}>}
 */
export const encodeImages = async ({
  contentRoot,
  mediaRoot,
  config,
  masters,
  encoder,
  scorer = { available: false },
  qualityCache = createMemoryQualityCache(),
  dryRun = false,
  log = () => {}
}) => {
  const manifest = createManifest()
  const resolver = createQualityResolver({ scorer, encoder, cache: qualityCache, log })
  const stats = { encoded: 0, cached: 0, bytes: 0, masters: masters.length, method: resolver.method, searches: 0, misses: [] }

  try {
    for (const contentPath of masters) {
      const masterFile = join(contentRoot, contentPath)
      const masterHash = await hashFile(masterFile)
      const resolved = resolveSettings(config, contentPath)
      const intrinsic = await encoder.probe(masterFile)
      const variants = []

      for (const format of resolved.formats) {
        const settings = encoderSettings(resolved, format)
        // A target-mode variant is keyed on how its quality was found, too.
        const keySettings = settings.mode === 'target' ? { ...settings, method: resolver.method } : settings
        for (const width of effectiveWidths(resolved.widths, intrinsic.width)) {
          const decision = cacheDecision({ mediaRoot, contentPath, width, format, masterHash, settings: keySettings })
          let { bytes } = decision
          let height = Math.max(1, Math.round((width * intrinsic.height) / intrinsic.width))

          if (decision.hit) {
            stats.cached += 1
          } else {
            stats.encoded += 1
            if (dryRun) log(`would encode ${decision.name}`)
            else {
              const out = await encodeVariant({ resolver, encoder, stats, log, masterFile, masterHash, width, format, settings, name: decision.name })
              mkdirSync(dirname(decision.file), { recursive: true })
              writeFileSync(decision.file, out.data)
              bytes = out.data.length
              height = out.height
            }
          }
          if (bytes !== null) {
            stats.bytes += bytes
            variants.push({ format, width, height, bytes, url: decision.url })
          }
        }
      }

      if (variants.length > 0) {
        manifest.addImage({
          source: contentPath,
          width: intrinsic.width,
          height: intrinsic.height,
          eager: resolved.eager,
          variants
        })
      }
    }
  } finally {
    resolver.dispose()
  }

  return { manifest, ...stats }
}

const fmtScore = (score) => (score === null ? 'n/a' : score.toFixed(2))

// Encode one variant that missed the file cache: straight through for an
// explicit quality, via the resolver (search, cached search or mapping) for a
// target.
const encodeVariant = async ({ resolver, encoder, stats, log, masterFile, masterHash, width, format, settings, name }) => {
  if (settings.mode === 'quality') {
    log(`encode ${name} q=${settings.quality} (explicit)`)
    return encoder.encode({ masterFile, width, format, settings })
  }

  const { target, tolerance } = settings
  const r = await resolver.resolve({ masterFile, masterHash, width, format, target, tolerance })
  if (r.method === 'measured' && !r.cached) stats.searches += 1
  const how = r.method === 'mapped' ? 'mapped' : r.cached ? 'measured, cached' : `measured, ${r.iterations} tries`
  log(`encode ${name} q=${r.quality} score=${fmtScore(r.score)} band=${target - tolerance}-${target + tolerance} (${how})`)
  if (r.method === 'measured' && !r.inBand) {
    stats.misses.push({ name, format, width, target, tolerance, quality: r.quality, score: r.score })
    log(`MISS ${name}: score ${fmtScore(r.score)} outside ${target - tolerance}-${target + tolerance} at q=${r.quality}`)
  }
  return r.out ?? encoder.encode({ masterFile, width, format, settings: { format, mode: 'quality', quality: r.quality } })
}
