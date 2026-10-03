// Sharp encoder + discovery against small generated fixtures in a temp dir.
// Never reads app/content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { validateConfig } from '../../../scripts/media/config.mjs'
import { discoverMasters } from '../../../scripts/media/discover.mjs'
import { createSharpEncoder, encodeImages } from '../../../scripts/media/encode-images.mjs'

const config = validateConfig({
  default: { target: 86, widths: [100, 200, 400], formats: ['avif', 'webp', 'jpeg'] }
})

let dir, contentRoot, mediaRoot
const makeMaster = async (rel, width, height, color = '#c33') => {
  const file = join(contentRoot, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  await sharp({ create: { width, height, channels: 3, background: color } }).jpeg().toFile(file)
}
const run = (extra = {}) =>
  encodeImages({ contentRoot, mediaRoot, config, masters: ['p/a.jpg'], encoder: createSharpEncoder(), ...extra })

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'media-enc-'))
  contentRoot = join(dir, 'content')
  mediaRoot = join(dir, 'media')
  await makeMaster('p/a.jpg', 300, 200)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('encodeImages', () => {
  it('emits every format at widths capped to the master and never upscales', async () => {
    const { manifest, encoded } = await run()
    const entry = manifest.toJSON().images['p/a.jpg']
    expect(entry.width).toBe(300)
    expect(entry.height).toBe(200)
    expect(entry.variants.map((v) => `${v.format}${v.width}`)).toEqual([
      'avif100', 'avif200', 'webp100', 'webp200', 'jpeg100', 'jpeg200'
    ])
    expect(encoded).toBe(6)
    for (const v of entry.variants) {
      const meta = await sharp(join(mediaRoot, v.url.replace('assets/media/', ''))).metadata()
      expect(meta.width).toBe(v.width)
      expect(meta.width).toBeLessThanOrEqual(300)
    }
  })

  it('emits a master narrower than every width once, at its own width', async () => {
    await makeMaster('p/small.jpg', 50, 50)
    const { manifest } = await run({ masters: ['p/small.jpg'] })
    expect(manifest.toJSON().images['p/small.jpg'].variants.every((v) => v.width === 50)).toBe(true)
  })

  it('performs zero encodes on a warm second run and keeps the manifest identical', async () => {
    const first = await run()
    const second = await run()
    expect(second.encoded).toBe(0)
    expect(second.cached).toBe(6)
    expect(second.manifest.toJSON()).toEqual(first.manifest.toJSON())
  })

  it('re-encodes when the master changes', async () => {
    await run()
    await makeMaster('p/a.jpg', 300, 200, '#36c')
    const again = await run()
    expect(again.encoded).toBe(6)
  })

  it('writes nothing in dry-run mode', async () => {
    const result = await run({ dryRun: true })
    expect(result.encoded).toBe(6)
    expect(() => readdirSync(mediaRoot)).toThrow()
  })

  it('leaves the content tree untouched', async () => {
    const before = readdirSync(join(contentRoot, 'p'))
    await run()
    expect(readdirSync(join(contentRoot, 'p'))).toEqual(before)
  })
})

describe('discoverMasters', () => {
  it('returns sorted content-relative image paths and honours a prefix', async () => {
    await makeMaster('p/b.JPG', 10, 10)
    writeFileSync(join(contentRoot, 'p/notes.txt'), 'x')
    await makeMaster('q/c.jpg', 10, 10)
    expect(await discoverMasters(contentRoot)).toEqual(['p/a.jpg', 'p/b.JPG', 'q/c.jpg'])
    expect(await discoverMasters(contentRoot, { prefix: 'q/' })).toEqual(['q/c.jpg'])
  })

  it('has no write path into app/content: the module imports no fs write API', () => {
    const source = readFileSync(new URL('../../../scripts/media/discover.mjs', import.meta.url), 'utf8')
    expect(source).not.toMatch(/writeFile|mkdir|rm\(|rmSync|unlink|rename|copyFile|appendFile/)
  })
})
