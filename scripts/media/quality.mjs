// Quality targeting: turn an SSIMULACRA2 target into a per-codec quality number.
//
// Measured (scorer available): encode -> decode -> score -> adjust, bisecting
// the codec's quality number until the score lands in target +/- tolerance or
// the iteration cap is hit. A miss is never silent: the result says inBand:
// false and the caller reports it.
//
// Mapped (scorer absent): the target is looked up in CALIBRATION and
// interpolated between rows. That is an estimate, not a measurement, and the
// resolver logs so — once per run.
//
// The resolved quality per (master hash, width, format, target, tolerance) is
// cached (cache.mjs createQualityCache), so a re-run never repeats a search
// even when the derivative file itself has been deleted.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryQualityCache, qualityKey } from './cache.mjs'

// Fallback mapping, SSIMULACRA2 score -> per-codec quality for this repo's
// sharp encoders (AVIF effort 4, WebP smartSubsample, mozjpeg JPEG 4:4:4).
//
// Rows 60-76 are the research's cross-codec equivalence (RES-28, dssim-matched
// on 4 images): JPEG 50/60/70/80 ~ AVIF 48/51/56/64 ~ WebP 55/64/72/82. Their
// `score` is what SSIMULACRA2 measured for those JPEG qualities here (mean of
// two keyvisuals, 1200w). Rows 84 and 90 — the bands this repo actually uses —
// are the highest quality the loop resolved per codec across the 2026-10-03
// validation (two keyvisuals x 800w/1600w), i.e. deliberately generous. WebP
// 99 at 90 is its ceiling, not a band hit. Provenance and caveats:
// readme/PERFORMANCE.md "Fidelity bands". Used only when the scorer is absent.
export const CALIBRATION = [
  { score: 60, jpeg: 50, avif: 48, webp: 55 },
  { score: 64, jpeg: 60, avif: 51, webp: 64 },
  { score: 69, jpeg: 70, avif: 56, webp: 72 },
  { score: 76, jpeg: 80, avif: 64, webp: 82 },
  { score: 84, jpeg: 93, avif: 83, webp: 96 },
  { score: 90, jpeg: 96, avif: 94, webp: 99 }
]

/**
 * Map a target score to a codec quality by linear interpolation between
 * CALIBRATION rows, clamped to the first/last row.
 */
export const mappedQuality = (format, target, table = CALIBRATION) => {
  if (!(format in table[0])) throw new Error(`quality: no calibration for format ${JSON.stringify(format)}.`)
  if (target <= table[0].score) return table[0][format]
  const last = table[table.length - 1]
  if (target >= last.score) return last[format]
  for (let i = 1; i < table.length; i += 1) {
    const [a, b] = [table[i - 1], table[i]]
    if (target <= b.score) {
      const t = (target - a.score) / (b.score - a.score)
      return Math.round(a[format] + t * (b[format] - a[format]))
    }
  }
  return last[format]
}

/**
 * Bisect a quality number until `measure(quality)` scores inside
 * [target - tolerance, target + tolerance].
 *
 * Score is assumed to rise with quality. On a miss, the result is the lowest
 * quality that cleared the band's floor (fidelity before bytes), or failing
 * that the highest-scoring attempt.
 *
 * @param {object} input
 * @param {number} input.target
 * @param {number} input.tolerance
 * @param {(quality: number) => Promise<{score: number}>} input.measure
 * @param {number} [input.initial]        first quality to try
 * @param {number} [input.maxIterations]  cap on measurements
 * @returns {Promise<{quality, score, iterations, inBand, attempt}>} `attempt`
 *   is whatever measure() returned for the chosen quality.
 */
export const searchQuality = async ({ target, tolerance, measure, initial, min = 1, max = 100, maxIterations = 7 }) => {
  const floor = target - tolerance
  const ceiling = target + tolerance
  const tried = new Map()
  let lo = min
  let hi = max
  let quality = Math.min(max, Math.max(min, Math.round(initial ?? (min + max) / 2)))

  while (tried.size < maxIterations && lo <= hi && !tried.has(quality)) {
    const attempt = await measure(quality)
    tried.set(quality, attempt)
    if (attempt.score >= floor && attempt.score <= ceiling) {
      return { quality, score: attempt.score, iterations: tried.size, inBand: true, attempt }
    }
    if (attempt.score < floor) lo = quality + 1
    else hi = quality - 1
    quality = Math.round((lo + hi) / 2)
  }

  const attempts = [...tried].map(([q, attempt]) => ({ q, attempt }))
  const clearing = attempts.filter(({ attempt }) => attempt.score >= floor).sort((a, b) => a.q - b.q)
  const pick = clearing[0] ?? attempts.sort((a, b) => b.attempt.score - a.attempt.score)[0]
  return { quality: pick.q, score: pick.attempt.score, iterations: tried.size, inBand: false, attempt: pick.attempt }
}

export const MAPPED_NOTICE =
  'quality: ssimulacra2 not found — quality is MAPPED from the calibration table, not measured. ' +
  'Run scripts/media/setup-scorer.sh to measure it.'

/**
 * Resolve the quality for one (master, width, format, target) variant.
 *
 * The encoder must offer encode() with a { mode: 'quality' } setting plus,
 * for measuring, reference({ masterFile, width }) -> lossless PNG bytes of the
 * master at that width and decode(data) -> PNG bytes of an encoded candidate.
 *
 * resolve() returns { method: 'measured'|'mapped', quality, score, iterations,
 * inBand, cached, out } — `out` is the encoder output for the chosen quality
 * when the search produced it, so the caller need not encode it again.
 */
export const createQualityResolver = ({ scorer, encoder, cache = createMemoryQualityCache(), log = () => {}, maxIterations = 7 }) => {
  const method = scorer.available ? 'measured' : 'mapped'
  const references = new Map()
  let tmp = null
  let warned = false

  const scratch = () => (tmp ??= mkdtempSync(join(tmpdir(), 'media-score-')))

  const referenceFile = async (masterFile, masterHash, width) => {
    const id = `${masterHash}.${width}`
    if (!references.has(id)) {
      const file = join(scratch(), `ref-${id}.png`)
      writeFileSync(file, await encoder.reference({ masterFile, width }))
      references.set(id, file)
    }
    return references.get(id)
  }

  return {
    method,

    async resolve({ masterFile, masterHash, width, format, target, tolerance }) {
      const initial = mappedQuality(format, target)
      if (method === 'mapped') {
        if (!warned) {
          log(MAPPED_NOTICE)
          warned = true
        }
        return { method, quality: initial, score: null, iterations: 0, inBand: null, cached: false, out: null }
      }

      const key = qualityKey({ masterHash, width, format, target, tolerance })
      const hit = cache.get(key)
      if (hit) return { method, ...hit, cached: true, out: null }

      const reference = await referenceFile(masterFile, masterHash, width)
      const candidate = join(scratch(), 'candidate.png')
      const result = await searchQuality({
        target,
        tolerance,
        initial,
        maxIterations,
        measure: async (quality) => {
          const out = await encoder.encode({ masterFile, width, format, settings: { format, mode: 'quality', quality } })
          writeFileSync(candidate, await encoder.decode(out.data))
          return { score: await scorer.score(reference, candidate), out }
        }
      })

      const record = { quality: result.quality, score: result.score, iterations: result.iterations, inBand: result.inBand }
      cache.set(key, record)
      return { method, ...record, cached: false, out: result.attempt.out }
    },

    /** Drop the scratch directory of reference/candidate PNGs. */
    dispose() {
      if (tmp) rmSync(tmp, { recursive: true, force: true })
      tmp = null
      references.clear()
    }
  }
}
