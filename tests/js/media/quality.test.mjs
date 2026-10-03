// Tests for scripts/media/quality.mjs — the encode-score-adjust loop, the
// calibrated fallback mapping and their wiring into encodeImages().
//
// Uses the stub encoder and a fake scorer: the stub's decode() is the
// identity, so the candidate file carries the settings the stub encoded with
// and the fake scorer reads the quality back out of it. No sharp, no real
// ssimulacra2, no app/content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { CALIBRATION, MAPPED_NOTICE, createQualityResolver, mappedQuality, searchQuality } from '../../../scripts/media/quality.mjs'
import { createMemoryQualityCache, createQualityCache, qualityKey } from '../../../scripts/media/cache.mjs'
import { createStubEncoder } from '../../../scripts/media/encoder.mjs'
import { encodeImages } from '../../../scripts/media/encode-images.mjs'
import { validateConfig } from '../../../scripts/media/config.mjs'

// Score rises with quality; `offset` shifts the curve per format.
const curve = (quality, offset = 0) => Math.min(100, 30 + quality * 0.65 + offset)

const fakeScorer = (offsets = {}) => {
  const calls = []
  return {
    available: true,
    calls,
    async score(reference, candidate) {
      const body = readFileSync(candidate, 'utf8')
      const quality = Number(/"quality":(\d+)/.exec(body)[1])
      const format = body.split('|')[2]
      calls.push({ reference, format, quality })
      return curve(quality, offsets[format] ?? 0)
    }
  }
}

describe('mappedQuality', () => {
  it('returns the calibration row exactly at a row score', () => {
    for (const row of CALIBRATION) {
      expect(mappedQuality('jpeg', row.score)).toBe(row.jpeg)
      expect(mappedQuality('avif', row.score)).toBe(row.avif)
      expect(mappedQuality('webp', row.score)).toBe(row.webp)
    }
  })

  it('carries the research equivalence rows JPEG 50/60/70/80 ~ AVIF 48/51/56/64 ~ WebP 55/64/72/82', () => {
    const rows = CALIBRATION.map(({ jpeg, avif, webp }) => [jpeg, avif, webp])
    expect(rows).toEqual(expect.arrayContaining([[50, 48, 55], [60, 51, 64], [70, 56, 72], [80, 64, 82]]))
  })

  it('interpolates between rows and clamps outside them', () => {
    const [a, b] = [CALIBRATION[3], CALIBRATION[4]]
    const mid = (a.score + b.score) / 2
    expect(mappedQuality('jpeg', mid)).toBe(Math.round((a.jpeg + b.jpeg) / 2))
    expect(mappedQuality('avif', 0)).toBe(CALIBRATION[0].avif)
    expect(mappedQuality('avif', 100)).toBe(CALIBRATION.at(-1).avif)
  })

  it('maps one target to three different codec numbers', () => {
    const q = ['avif', 'webp', 'jpeg'].map((f) => mappedQuality(f, 86))
    expect(new Set(q).size).toBe(3)
  })

  it('rises monotonically with the target for every codec', () => {
    for (const format of ['avif', 'webp', 'jpeg']) {
      const values = [60, 70, 80, 84, 88, 92].map((t) => mappedQuality(format, t))
      expect(values).toEqual([...values].sort((x, y) => x - y))
    }
  })
})

describe('searchQuality', () => {
  const measureWith = (score) => {
    const tried = []
    return { tried, measure: async (q) => (tried.push(q), { score: score(q) }) }
  }

  it('lands in band and reports the quality, score and iteration count', async () => {
    const { tried, measure } = measureWith((q) => curve(q))
    const r = await searchQuality({ target: 84, tolerance: 2, measure, initial: 50 })

    expect(r.inBand).toBe(true)
    expect(r.score).toBeGreaterThanOrEqual(82)
    expect(r.score).toBeLessThanOrEqual(86)
    expect(r.iterations).toBe(tried.length)
    expect(r.quality).toBe(tried.at(-1))
  })

  it('stops after one measurement when the initial guess is in band', async () => {
    const { tried, measure } = measureWith((q) => curve(q))
    const r = await searchQuality({ target: 84, tolerance: 2, measure, initial: 83 })

    expect(tried).toEqual([83])
    expect(r).toMatchObject({ quality: 83, iterations: 1, inBand: true })
  })

  it('respects the iteration cap and reports the miss, preferring fidelity', async () => {
    // A step function that jumps clean over the 88-92 band.
    const { tried, measure } = measureWith((q) => (q < 70 ? 80 : 95))
    const r = await searchQuality({ target: 90, tolerance: 2, measure, initial: 10, maxIterations: 4 })

    expect(tried.length).toBeLessThanOrEqual(4)
    expect(r.inBand).toBe(false)
    expect(r.score).toBe(95)
    expect(r.quality).toBe(Math.min(...tried.filter((q) => q >= 70)))
  })

  it('reports the best attempt when even quality 100 is below the band', async () => {
    const { measure } = measureWith((q) => q * 0.5)
    const r = await searchQuality({ target: 90, tolerance: 2, measure, initial: 50 })

    expect(r.inBand).toBe(false)
    expect(r.quality).toBe(100)
    expect(r.score).toBe(50)
  })
})

describe('createQualityResolver', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'media-q-'))
    writeFileSync(join(dir, 'a.jpg'), 'master')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const input = () => ({ masterFile: join(dir, 'a.jpg'), masterHash: 'h1', width: 800, format: 'avif', target: 84, tolerance: 2 })

  it('measures, scoring each candidate against a same-width reference', async () => {
    const scorer = fakeScorer()
    const encoder = createStubEncoder()
    const resolver = createQualityResolver({ scorer, encoder })
    const r = await resolver.resolve(input())
    resolver.dispose()

    expect(r).toMatchObject({ method: 'measured', inBand: true, cached: false })
    expect(scorer.calls.length).toBe(r.iterations)
    expect(new Set(scorer.calls.map((c) => c.reference)).size).toBe(1)
    expect(r.out.data.toString()).toContain(`"quality":${r.quality}`)
  })

  it('serves a repeated search from the quality cache with no encodes', async () => {
    const cache = createMemoryQualityCache()
    const first = createQualityResolver({ scorer: fakeScorer(), encoder: createStubEncoder(), cache })
    const r1 = await first.resolve(input())
    first.dispose()

    const encoder = createStubEncoder()
    const scorer = fakeScorer()
    const second = createQualityResolver({ scorer, encoder, cache })
    const r2 = await second.resolve(input())

    expect(r2).toMatchObject({ quality: r1.quality, score: r1.score, cached: true, out: null })
    expect(encoder.calls).toHaveLength(0)
    expect(scorer.calls).toHaveLength(0)
  })

  it('maps without the scorer and logs that once, however many variants resolve', async () => {
    const lines = []
    const encoder = createStubEncoder()
    const resolver = createQualityResolver({ scorer: { available: false }, encoder, log: (l) => lines.push(l) })

    const r = await resolver.resolve(input())
    await resolver.resolve({ ...input(), format: 'webp' })

    expect(r).toMatchObject({ method: 'mapped', quality: mappedQuality('avif', 84), score: null })
    expect(lines).toEqual([MAPPED_NOTICE])
    expect(lines[0]).toMatch(/MAPPED .* not measured/)
    expect(encoder.calls).toHaveLength(0)
  })
})

describe('createQualityCache', () => {
  it('round-trips through its JSON file and keys on every search input', () => {
    const dir = mkdtempSync(join(tmpdir(), 'media-qc-'))
    const file = join(dir, 'nested', 'quality.json')
    const key = qualityKey({ masterHash: 'h', width: 800, format: 'avif', target: 84, tolerance: 2 })

    const cache = createQualityCache(file)
    cache.set(key, { quality: 70, score: 84.1, iterations: 3, inBand: true })
    cache.save()
    expect(createQualityCache(file).get(key)).toEqual({ quality: 70, score: 84.1, iterations: 3, inBand: true })

    for (const change of [{ masterHash: 'x' }, { width: 1200 }, { format: 'webp' }, { target: 90 }, { tolerance: 1 }]) {
      expect(qualityKey({ masterHash: 'h', width: 800, format: 'avif', target: 84, tolerance: 2, ...change })).not.toBe(key)
    }
    rmSync(dir, { recursive: true, force: true })
  })

  it('starts empty when the file is missing or corrupt', () => {
    const dir = mkdtempSync(join(tmpdir(), 'media-qc-'))
    writeFileSync(join(dir, 'bad.json'), '{not json')
    expect(createQualityCache(join(dir, 'missing.json')).toJSON()).toEqual({})
    expect(createQualityCache(join(dir, 'bad.json')).toJSON()).toEqual({})
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('encodeImages with quality targeting', () => {
  let dir, contentRoot, mediaRoot
  const masters = ['p/a.jpg']

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'media-qe-'))
    contentRoot = join(dir, 'content')
    mediaRoot = join(dir, 'media')
    mkdirSync(join(contentRoot, 'p'), { recursive: true })
    writeFileSync(join(contentRoot, 'p/a.jpg'), 'master bytes')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const config = (extra = {}) =>
    validateConfig({ default: { target: 84, widths: [400, 800], formats: ['avif', 'webp', 'jpeg'], ...extra } })

  const run = (extra) =>
    encodeImages({ contentRoot, mediaRoot, config: config(), masters, encoder: createStubEncoder(), ...extra })

  const written = () => readdirSync(join(mediaRoot, 'p')).sort()
  const encodedQuality = (file) => Number(/"quality":(\d+)/.exec(readFileSync(join(mediaRoot, 'p', file), 'utf8'))[1])

  it('lands every variant in band with the scorer present, each format at its own quality', async () => {
    const scorer = fakeScorer({ avif: 8, webp: 2 })
    const lines = []
    const r = await run({ scorer, log: (l) => lines.push(l) })

    expect(r.method).toBe('measured')
    expect(r.misses).toEqual([])
    expect(r.searches).toBe(6)
    const scores = lines.filter((l) => l.startsWith('encode ')).map((l) => Number(/score=([\d.]+)/.exec(l)[1]))
    expect(scores).toHaveLength(6)
    for (const s of scores) expect(s).toBeGreaterThanOrEqual(82), expect(s).toBeLessThanOrEqual(86)

    const q = Object.fromEntries(written().map((f) => [f.split('.').pop(), encodedQuality(f)]))
    expect(new Set([q.avif, q.webp, q.jpg]).size).toBe(3)
  })

  it('reports an out-of-band variant explicitly instead of writing it silently', async () => {
    // A scorer whose curve jumps over the 82-86 band for every format.
    const scorer = { available: true, score: async (_ref, cand) => (/"quality":(\d+)/.exec(readFileSync(cand, 'utf8'))[1] < 75 ? 70 : 95) }
    const lines = []
    const r = await run({ scorer, log: (l) => lines.push(l) })

    expect(r.misses).toHaveLength(6)
    expect(r.misses[0]).toMatchObject({ target: 84, tolerance: 2, score: 95 })
    expect(lines.filter((l) => l.startsWith('MISS '))).toHaveLength(6)
  })

  it('still produces every derivative without the scorer, logging the mapping once', async () => {
    const lines = []
    const r = await run({ scorer: { available: false }, log: (l) => lines.push(l) })

    expect(r.method).toBe('mapped')
    expect(r.encoded).toBe(6)
    expect(written()).toHaveLength(6)
    expect(lines.filter((l) => l === MAPPED_NOTICE)).toHaveLength(1)
    const avif = written().find((f) => f.endsWith('.avif'))
    expect(encodedQuality(avif)).toBe(mappedQuality('avif', 84))
  })

  it('bypasses the loop entirely for a format with an explicit per-codec quality', async () => {
    const scorer = fakeScorer()
    const encoder = createStubEncoder()
    await run({ scorer, encoder, config: config({ quality: { avif: 61 } }) })

    expect(scorer.calls.some((c) => c.format === 'avif')).toBe(false)
    expect(encoder.calls.filter((c) => c.format === 'avif').map((c) => c.settings.quality)).toEqual([61, 61])
    expect(scorer.calls.some((c) => c.format === 'webp')).toBe(true)
  })

  it('performs no encodes and no scoring on a warm run', async () => {
    const qualityCache = createMemoryQualityCache()
    await run({ scorer: fakeScorer(), qualityCache })

    const encoder = createStubEncoder()
    const scorer = fakeScorer()
    const warm = await run({ scorer, encoder, qualityCache })

    expect(warm).toMatchObject({ encoded: 0, cached: 6, searches: 0 })
    expect(encoder.calls).toHaveLength(0)
    expect(scorer.calls).toHaveLength(0)
  })

  it('re-encodes a deleted derivative once at the cached quality, without searching', async () => {
    const qualityCache = createMemoryQualityCache()
    await run({ scorer: fakeScorer(), qualityCache })
    const victim = written().find((f) => f.startsWith('a.800.') && f.endsWith('.webp'))
    const before = encodedQuality(victim)
    rmSync(join(mediaRoot, 'p', victim))

    const encoder = createStubEncoder()
    const scorer = fakeScorer()
    const again = await run({ scorer, encoder, qualityCache })

    expect(again).toMatchObject({ encoded: 1, searches: 0 })
    expect(encoder.calls).toHaveLength(1)
    expect(scorer.calls).toHaveLength(0)
    expect(existsSync(join(mediaRoot, 'p', victim))).toBe(true)
    expect(encodedQuality(victim)).toBe(before)
  })

  it('re-encodes mapped variants once the scorer becomes available', async () => {
    await run({ scorer: { available: false } })
    const mapped = written()

    const measured = await run({ scorer: fakeScorer() })

    expect(measured.encoded).toBe(6)
    expect(written().filter((f) => !mapped.includes(f))).toHaveLength(6)
  })

  it('writes nothing and scores nothing on a dry run', async () => {
    const scorer = fakeScorer()
    const r = await run({ scorer, dryRun: true })

    expect(r.encoded).toBe(6)
    expect(scorer.calls).toHaveLength(0)
    expect(existsSync(mediaRoot)).toBe(false)
  })
})
