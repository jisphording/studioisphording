// Tests for scripts/media/manifest.mjs — the schema phase 5 reads from PHP,
// its deterministic ordering and the atomic write. Uses a temp directory.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  FORMAT_ORDER,
  MANIFEST_VERSION,
  createManifest,
  readManifest,
  serialiseManifest,
  writeManifest
} from '../../../scripts/media/manifest.mjs'

const variant = (format, width, extra = {}) => ({
  format,
  width,
  height: Math.round(width * 0.75),
  bytes: width * 10,
  url: `assets/media/home/landing_reel.${width}.abc123.${format === 'jpeg' ? 'jpg' : format}`,
  ...extra
})

const populated = () =>
  createManifest()
    .addImage({
      source: 'projects/01-a/a-00_keyvisual.jpg',
      width: 4000,
      height: 3000,
      variants: [variant('webp', 800), variant('avif', 800)]
    })
    .addImage({
      source: 'home/landing_reel.jpg',
      width: 3840,
      height: 2160,
      eager: true,
      variants: [variant('jpeg', 1200), variant('avif', 1200), variant('avif', 480)]
    })

describe('manifest schema', () => {
  it('carries a version and an images map keyed by content-relative path', () => {
    const data = populated().toJSON()

    expect(data.version).toBe(MANIFEST_VERSION)
    expect(Object.keys(data.images)).toContain('home/landing_reel.jpg')
    expect(Object.keys(data.images).every((key) => !key.startsWith('/'))).toBe(true)
  })

  it('records the master intrinsic size and the eager flag', () => {
    const entry = populated().toJSON().images['home/landing_reel.jpg']

    expect(entry.width).toBe(3840)
    expect(entry.height).toBe(2160)
    expect(entry.eager).toBe(true)
  })

  it('defaults eager to false', () => {
    expect(populated().toJSON().images['projects/01-a/a-00_keyvisual.jpg'].eager).toBe(false)
  })

  it('records width, height, bytes and url on every variant', () => {
    const [first] = populated().toJSON().images['home/landing_reel.jpg'].variants

    expect(Object.keys(first).sort()).toEqual(['bytes', 'format', 'height', 'url', 'width'])
    expect(first.url.startsWith('assets/media/')).toBe(true)
  })

  it('sorts sources alphabetically and variants by source order then width', () => {
    const data = populated().toJSON()

    expect(Object.keys(data.images)).toEqual([
      'home/landing_reel.jpg',
      'projects/01-a/a-00_keyvisual.jpg'
    ])
    expect(data.images['home/landing_reel.jpg'].variants.map((v) => [v.format, v.width]))
      .toEqual([['avif', 480], ['avif', 1200], ['jpeg', 1200]])
    expect(FORMAT_ORDER).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('is deterministic regardless of insertion order', () => {
    const forwards = populated()
    const backwards = createManifest()
      .addImage({
        source: 'home/landing_reel.jpg',
        width: 3840,
        height: 2160,
        eager: true,
        variants: [variant('avif', 1200), variant('jpeg', 1200), variant('avif', 480)]
      })
      .addImage({
        source: 'projects/01-a/a-00_keyvisual.jpg',
        width: 4000,
        height: 3000,
        variants: [variant('avif', 800), variant('webp', 800)]
      })

    expect(serialiseManifest(backwards)).toBe(serialiseManifest(forwards))
  })

  it('accepts variants added after the image entry', () => {
    const manifest = createManifest()
      .addImage({ source: 'a/b.jpg', width: 100, height: 50, variants: [variant('avif', 480)] })
    manifest.addVariant('a/b.jpg', variant('webp', 480))

    expect(manifest.toJSON().images['a/b.jpg'].variants).toHaveLength(2)
  })

  it('rejects an entry with no variants, a bad size or an unknown format', () => {
    expect(() => createManifest().addImage({ source: 'a/b.jpg', width: 1, height: 1 }).toJSON())
      .toThrow(/has no variants/)
    expect(() => createManifest().addImage({ source: 'a/b.jpg', width: 0, height: 1 }))
      .toThrow(/positive integer/)
    expect(() => createManifest().addImage({
      source: 'a/b.jpg', width: 1, height: 1, variants: [{ ...variant('avif', 480), format: 'jxl' }]
    })).toThrow(/unknown variant format/)
    expect(() => createManifest().addImage({ source: '', width: 1, height: 1 }))
      .toThrow(/content-relative source path/)
    expect(() => createManifest().addVariant('a/b.jpg', variant('avif', 480)))
      .toThrow(/addVariant before addImage/)
  })
})

describe('writeManifest', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'media-manifest-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes manifest.json below the media root and round-trips it', async () => {
    const target = writeManifest(root, populated())

    expect(target).toBe(join(root, 'manifest.json'))
    expect(await readManifest(root)).toEqual(populated().toJSON())
  })

  it('leaves no temp file behind', () => {
    writeManifest(root, populated())

    expect(readdirSync(root)).toEqual(['manifest.json'])
  })

  it('writes byte-identical output for identical input', () => {
    writeManifest(root, populated())
    const first = readFileSync(join(root, 'manifest.json'), 'utf8')
    writeManifest(root, populated())

    expect(readFileSync(join(root, 'manifest.json'), 'utf8')).toBe(first)
    expect(first.endsWith('\n')).toBe(true)
    expect(first).not.toMatch(/generatedAt|timestamp/)
  })

  it('replaces an existing manifest atomically rather than appending', () => {
    writeManifest(root, populated())
    writeManifest(root, createManifest().addImage({
      source: 'a/b.jpg', width: 10, height: 10, variants: [variant('avif', 480)]
    }))

    const data = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
    expect(Object.keys(data.images)).toEqual(['a/b.jpg'])
  })

  it('creates the media root when it does not exist yet', () => {
    const nested = join(root, 'nested', 'media')
    writeManifest(nested, populated())

    expect(existsSync(join(nested, 'manifest.json'))).toBe(true)
  })

  it('returns null when there is no manifest to read', async () => {
    expect(await readManifest(join(root, 'absent'))).toBe(null)
  })
})
