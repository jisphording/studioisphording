// Tests for scripts/media/prune.mjs — report-only by default, deletes only
// what the manifest no longer references, never leaves the media root.
// Uses a temp directory.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { applyPrune, planPrune, referencedPaths } from '../../../scripts/media/prune.mjs'

let root
let mediaRoot

const put = (relative, content = 'x') => {
  const file = join(mediaRoot, relative)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

const variant = (url, extra = {}) => ({ width: 800, height: 600, bytes: 1, url, ...extra })

const writeManifestJson = (data) => put('manifest.json', JSON.stringify(data))

const manifestWithImageAndVideo = () => ({
  version: 1,
  images: {
    'home/a.jpg': {
      width: 4000, height: 3000, eager: false,
      variants: [
        variant('assets/media/home/a.800.aaaa1111.avif', { format: 'avif' }),
        variant('assets/media/home/a.800.aaaa1111.jpg', { format: 'jpeg' })
      ]
    },
    'home/reel.poster.jpg': {
      width: 1920, height: 1080, eager: false,
      variants: [variant('assets/media/home/reel.poster.1920.bbbb2222.jpg', { format: 'jpeg' })]
    }
  },
  videos: {
    'home/reel.mp4': {
      width: 1920, height: 1080, duration: 5, poster: 'home/reel.poster.jpg',
      variants: [
        { codec: 'av1', type: 'video/webm', bytes: 1, crf: 30, url: 'assets/media/home/reel.av1.cccc3333.webm' },
        { codec: 'h264', type: 'video/mp4', bytes: 1, crf: 23, url: 'assets/media/home/reel.h264.dddd4444.mp4' }
      ]
    }
  }
})

const referencedFiles = [
  'home/a.800.aaaa1111.avif',
  'home/a.800.aaaa1111.jpg',
  'home/reel.poster.1920.bbbb2222.jpg',
  'home/reel.av1.cccc3333.webm',
  'home/reel.h264.dddd4444.mp4'
]

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'prune-'))
  mediaRoot = join(root, 'media')
  mkdirSync(mediaRoot)
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('referencedPaths', () => {
  it('collects image variants, video variants and manifest.json itself', () => {
    const paths = referencedPaths(manifestWithImageAndVideo())
    expect([...paths].sort()).toEqual([...referencedFiles, 'manifest.json'].sort())
  })

  it('rejects a url that does not live under assets/media/', () => {
    const bad = { version: 1, images: { 'a.jpg': { variants: [variant('assets/bundle/x.js')] } } }
    expect(() => referencedPaths(bad)).toThrow(/outside/)
  })

  it('rejects a url that climbs out of the media root', () => {
    const bad = { version: 1, images: { 'a.jpg': { variants: [variant('assets/media/../../content/x.jpg')] } } }
    expect(() => referencedPaths(bad)).toThrow(/outside/)
  })
})

describe('planPrune', () => {
  it('keeps referenced files, including video files and posters, and lists the rest', async () => {
    writeManifestJson(manifestWithImageAndVideo())
    for (const file of referencedFiles) put(file)
    put('home/a.800.stale000.webp', '12345')
    put('projects/gone/old.400.deadbeef.avif', '123')

    const plan = await planPrune(mediaRoot)

    expect(plan.orphans.map((o) => o.path).sort()).toEqual([
      'home/a.800.stale000.webp',
      'projects/gone/old.400.deadbeef.avif'
    ])
    expect(plan.bytes).toBe(8)
    expect(plan.kept).toBe(referencedFiles.length + 1)
  })

  it('lists nothing when every file is referenced', async () => {
    writeManifestJson(manifestWithImageAndVideo())
    for (const file of referencedFiles) put(file)
    expect((await planPrune(mediaRoot)).orphans).toEqual([])
  })

  it('aborts when manifest.json is missing', async () => {
    put('home/a.800.stale000.webp')
    await expect(planPrune(mediaRoot)).rejects.toThrow(/manifest/)
    expect(existsSync(join(mediaRoot, 'home/a.800.stale000.webp'))).toBe(true)
  })

  it('aborts when manifest.json is unparseable', async () => {
    put('manifest.json', '{ not json')
    put('home/a.800.stale000.webp')
    await expect(planPrune(mediaRoot)).rejects.toThrow(/manifest/)
  })

  it('aborts when the manifest references nothing', async () => {
    writeManifestJson({ version: 1, images: {} })
    put('home/a.800.stale000.webp')
    await expect(planPrune(mediaRoot)).rejects.toThrow(/no files/)
  })

  it('does not follow a symlink out of the media root', async () => {
    writeManifestJson(manifestWithImageAndVideo())
    const outside = join(root, 'outside')
    mkdirSync(outside)
    writeFileSync(join(outside, 'precious.txt'), 'keep')
    symlinkSync(outside, join(mediaRoot, 'link'))

    const plan = await planPrune(mediaRoot)
    expect(plan.orphans.map((o) => o.path)).not.toContain('link/precious.txt')
  })
})

describe('applyPrune', () => {
  it('deletes exactly the orphans and leaves referenced files', async () => {
    writeManifestJson(manifestWithImageAndVideo())
    for (const file of referencedFiles) put(file)
    put('home/a.800.stale000.webp')
    put('projects/gone/old.400.deadbeef.avif')

    const plan = await planPrune(mediaRoot)
    await applyPrune(mediaRoot, plan)

    expect(existsSync(join(mediaRoot, 'home/a.800.stale000.webp'))).toBe(false)
    expect(existsSync(join(mediaRoot, 'projects/gone/old.400.deadbeef.avif'))).toBe(false)
    for (const file of [...referencedFiles, 'manifest.json']) {
      expect(existsSync(join(mediaRoot, file))).toBe(true)
    }
  })

  it('removes directories the deletion left empty, never the media root', async () => {
    writeManifestJson(manifestWithImageAndVideo())
    for (const file of referencedFiles) put(file)
    put('projects/gone/old.400.deadbeef.avif')

    await applyPrune(mediaRoot, await planPrune(mediaRoot))

    expect(existsSync(join(mediaRoot, 'projects'))).toBe(false)
    expect(existsSync(mediaRoot)).toBe(true)
  })
})
