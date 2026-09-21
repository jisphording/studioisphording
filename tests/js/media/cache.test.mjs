// Tests for scripts/media/cache.mjs — the content-hash cache key and the
// hit/miss decision. Uses a temp directory; never reads app/content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { canonicalJson, cacheDecision, hashBytes, hashFile, variantHash } from '../../../scripts/media/cache.mjs'
import { encoderSettings } from '../../../scripts/media/config.mjs'

const settings = (overrides = {}) => encoderSettings({ target: 86, ...overrides }, 'avif')

const key = (overrides = {}) =>
  variantHash({
    masterHash: 'aaaa',
    width: 800,
    format: 'avif',
    settings: settings(),
    ...overrides
  })

describe('canonicalJson', () => {
  it('does not depend on key order', () => {
    expect(canonicalJson({ a: 1, b: { c: 2, d: 3 } })).toBe(canonicalJson({ b: { d: 3, c: 2 }, a: 1 }))
  })

  it('preserves array order, which is meaningful', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]))
  })
})

describe('variantHash', () => {
  it('is stable for identical input', () => {
    expect(key()).toBe(key())
  })

  it('changes when the master bytes change', () => {
    expect(key({ masterHash: hashBytes(Buffer.from('a')) }))
      .not.toBe(key({ masterHash: hashBytes(Buffer.from('b')) }))
  })

  it('changes when the width changes', () => {
    expect(key({ width: 1200 })).not.toBe(key())
  })

  it('changes when the format changes', () => {
    expect(key({ format: 'webp' })).not.toBe(key())
  })

  it('changes when the resolved encoder settings change', () => {
    expect(key({ settings: settings({ target: 90 }) })).not.toBe(key())
    expect(key({ settings: settings({ quality: { avif: 64 } }) })).not.toBe(key())
  })

  it('does not change when eager, widths or formats change', () => {
    const a = encoderSettings({ target: 86, eager: false, widths: [480], formats: ['avif'] }, 'avif')
    const b = encoderSettings({ target: 86, eager: true, widths: [2000], formats: ['avif', 'webp'] }, 'avif')

    expect(key({ settings: a })).toBe(key({ settings: b }))
  })

  it('is lowercase hex of the requested length', () => {
    expect(key()).toMatch(/^[0-9a-f]{8}$/)
    expect(variantHash({ masterHash: 'aaaa', width: 800, format: 'avif', settings: settings() }, 16))
      .toMatch(/^[0-9a-f]{16}$/)
  })

  it('rejects incomplete input', () => {
    expect(() => variantHash({ width: 800, format: 'avif' })).toThrow(/masterHash is required/)
    expect(() => variantHash({ masterHash: 'a', width: 0, format: 'avif' })).toThrow(/positive integer/)
    expect(() => variantHash({ masterHash: 'a', width: 8, format: '' })).toThrow(/format is required/)
  })
})

describe('cacheDecision', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'media-cache-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const decide = (extra = {}) =>
    cacheDecision({
      mediaRoot: root,
      contentPath: 'projects/01-a/a-00_keyvisual.jpg',
      width: 800,
      format: 'avif',
      masterHash: 'aaaa',
      settings: settings(),
      ...extra
    })

  it('misses when the derivative does not exist yet', () => {
    const decision = decide()

    expect(decision.hit).toBe(false)
    expect(decision.bytes).toBe(null)
    expect(decision.name).toBe(`projects/01-a/a-00_keyvisual.800.${decision.hash}.avif`)
    expect(decision.url).toBe(`assets/media/${decision.name}`)
  })

  it('hits, with the file size, once the derivative is on disk', () => {
    const first = decide()
    mkdirSync(dirname(first.file), { recursive: true })
    writeFileSync(first.file, 'xxxxx')

    const second = decide()

    expect(second.hash).toBe(first.hash)
    expect(second.hit).toBe(true)
    expect(second.bytes).toBe(5)
  })

  it('misses again after the encoder settings change, leaving the warm file alone', () => {
    const warm = decide()
    mkdirSync(dirname(warm.file), { recursive: true })
    writeFileSync(warm.file, 'xxxxx')

    const changed = decide({ settings: settings({ target: 92 }) })

    expect(changed.hash).not.toBe(warm.hash)
    expect(changed.hit).toBe(false)
    expect(decide().hit).toBe(true)
  })
})

describe('hashFile', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'media-hash-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('hashes a file to the same value as its bytes', async () => {
    const file = join(dir, 'master.bin')
    writeFileSync(file, 'master bytes')

    expect(await hashFile(file)).toBe(hashBytes(Buffer.from('master bytes')))
  })
})
