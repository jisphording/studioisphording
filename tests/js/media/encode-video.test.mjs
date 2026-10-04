// Video ladder against a fake ffmpeg: no real encode ever runs here.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateConfig } from '../../../scripts/media/config.mjs'
import { createMemoryQualityCache } from '../../../scripts/media/cache.mjs'
import { buildEncodeArgs, encodeVideos, fitToBudget, RUNGS } from '../../../scripts/media/encode-video.mjs'
import { createFfmpeg } from '../../../scripts/media/ffmpeg.mjs'
import { keepVideoState, mergeManifestData } from '../../../scripts/media/manifest.mjs'
import { VIDEO_CODEC_ORDER, videoDerivativeName } from '../../../scripts/media/paths.mjs'

const config = (budget) =>
  validateConfig({
    default: { target: 84, widths: [100], formats: ['jpeg'] },
    overrides: budget === undefined ? [] : [{ match: 'home/reel.mp4', budget }]
  })

// Fake ffmpeg: bytes are a function of codec + crf, written to disk so the
// pipeline's rename and stat see a real file.
const fakeFfmpeg = ({ bytesFor = () => 1000, hasAudio = false } = {}) => {
  const calls = { encode: [], frame: [] }
  return {
    calls,
    async probe() {
      return { width: 1920, height: 1080, duration: 36.6667, hasAudio }
    },
    async encode({ input, output, args }) {
      calls.encode.push({ input, output, args })
      const codec = args[args.indexOf('-c:v') + 1]
      const crf = Number(args[args.indexOf('-crf') + 1])
      const bytes = bytesFor(codec, crf)
      writeFileSync(output, Buffer.alloc(bytes))
      return { bytes }
    },
    async extractFrame({ output }) {
      calls.frame.push(output)
      writeFileSync(output, 'frame')
      return { bytes: 5 }
    }
  }
}

let dir, contentRoot, mediaRoot, posterRoot, posterJobs
const encodePoster = async ({ root, path }) => {
  posterJobs.push({ root, path })
  return { images: { [path]: { width: 1920, height: 1080, eager: false, variants: [] } } }
}
const run = (extra = {}) =>
  encodeVideos({
    contentRoot, mediaRoot, posterRoot, config: config(), masters: ['home/reel.mp4'],
    ffmpeg: fakeFfmpeg(), encodePoster, ...extra
  })

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'media-vid-'))
  contentRoot = join(dir, 'content')
  mediaRoot = join(dir, 'media')
  posterRoot = join(dir, 'posters')
  posterJobs = []
  mkdirSync(join(contentRoot, 'home'), { recursive: true })
  writeFileSync(join(contentRoot, 'home', 'reel.mp4'), 'master bytes')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('buildEncodeArgs', () => {
  it('uses libsvtav1 preset 4 for AV1 and a long keyframe interval, silent', () => {
    const args = buildEncodeArgs({ codec: 'av1', crf: 34, hasAudio: false })
    expect(args).toEqual(expect.arrayContaining(['-c:v', 'libsvtav1', '-preset', '4', '-crf', '34', '-g', '240', '-an']))
    expect(args.slice(-2)).toEqual(['-f', 'webm'])
  })

  it('uses constant-quality VP9 (-b:v 0) and faststart H.264', () => {
    const vp9 = buildEncodeArgs({ codec: 'vp9', crf: 34, hasAudio: false })
    expect(vp9).toEqual(expect.arrayContaining(['-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-an']))
    const h264 = buildEncodeArgs({ codec: 'h264', crf: 23, hasAudio: false })
    expect(h264).toEqual(expect.arrayContaining(['-c:v', 'libx264', '-crf', '23', '-movflags', '+faststart', '-an']))
    expect(h264.slice(-2)).toEqual(['-f', 'mp4'])
  })

  it('keeps audio only when the source has some', () => {
    const args = buildEncodeArgs({ codec: 'av1', crf: 34, hasAudio: true })
    expect(args).toEqual(expect.arrayContaining(['-c:a', 'libopus']))
    expect(args).not.toContain('-an')
  })
})

describe('fitToBudget', () => {
  const sizes = (map) => async (crf) => map[crf]

  it('stops at the first CRF that fits', async () => {
    const out = await fitToBudget({ start: 30, floor: 40, step: 2, budget: 500, attempt: sizes({ 30: 900, 32: 700, 34: 480 }) })
    expect(out).toMatchObject({ crf: 34, bytes: 480, met: true, attempts: [30, 32, 34] })
  })

  it('stops at the floor and reports the miss rather than going further', async () => {
    const out = await fitToBudget({ start: 30, floor: 33, step: 2, budget: 100, attempt: sizes({ 30: 900, 32: 800, 33: 700 }) })
    expect(out).toMatchObject({ crf: 33, bytes: 700, met: false, attempts: [30, 32, 33] })
  })

  it('encodes once when there is no budget', async () => {
    const out = await fitToBudget({ start: 30, floor: 40, step: 2, budget: undefined, attempt: sizes({ 30: 900 }) })
    expect(out).toMatchObject({ crf: 30, met: true, attempts: [30] })
  })
})

describe('encodeVideos', () => {
  it('emits the ladder in AV1, VP9, H.264 order with manifest entries and a poster', async () => {
    const { manifest, encoded } = await run()
    const entry = manifest.videos['home/reel.mp4']
    expect(entry.variants.map((v) => v.codec)).toEqual(VIDEO_CODEC_ORDER)
    expect(entry.variants.map((v) => v.url.split('.').pop())).toEqual(['webm', 'webm', 'mp4'])
    expect(entry.variants[0].type).toContain('video/webm')
    expect(entry).toMatchObject({ width: 1920, height: 1080, duration: 36.667, poster: 'home/reel.poster.jpg' })
    expect(encoded).toBe(3)
    for (const v of entry.variants) expect(existsSync(join(mediaRoot, v.url.replace('assets/media/', '')))).toBe(true)
  })

  it('runs the codecs with their own flags, never the input as output', async () => {
    const ffmpeg = fakeFfmpeg()
    await run({ ffmpeg })
    expect(ffmpeg.calls.encode.map((c) => c.args[c.args.indexOf('-c:v') + 1])).toEqual(['libsvtav1', 'libvpx-vp9', 'libx264'])
    expect(ffmpeg.calls.encode.every((c) => c.input !== c.output)).toBe(true)
  })

  it('steps only the AV1 rung for a scalar budget and records its CRF', async () => {
    const ffmpeg = fakeFfmpeg({ bytesFor: (codec, crf) => (codec === 'libsvtav1' ? 1000 - (crf - RUNGS.av1.start) * 100 : 5000) })
    const { manifest, rungs, unmet } = await run({ ffmpeg, config: config(800) })
    const av1 = manifest.videos['home/reel.mp4'].variants[0]
    expect(av1).toMatchObject({ codec: 'av1', crf: RUNGS.av1.start + 2, bytes: 800 })
    expect(rungs.find((r) => r.codec === 'av1').attempts).toEqual([34, 36])
    expect(rungs.find((r) => r.codec === 'vp9').attempts).toEqual([34])
    expect(rungs.find((r) => r.codec === 'h264').attempts).toEqual([RUNGS.h264.start])
    expect(unmet).toEqual([])
  })

  it('steps each budgeted rung of an object budget and encodes unbudgeted rungs once', async () => {
    const ffmpeg = fakeFfmpeg({
      bytesFor: (codec, crf) =>
        codec === 'libsvtav1' ? 1000 - (crf - RUNGS.av1.start) * 100 : codec === 'libx264' ? 3000 - (crf - RUNGS.h264.start) * 500 : 5000
    })
    const { manifest, rungs, unmet } = await run({ ffmpeg, config: config({ av1: 800, h264: 2000 }) })
    const [av1, vp9, h264] = manifest.videos['home/reel.mp4'].variants
    expect(av1).toMatchObject({ crf: RUNGS.av1.start + 2, bytes: 800 })
    expect(vp9).toMatchObject({ crf: RUNGS.vp9.start, bytes: 5000 })
    expect(h264).toMatchObject({ crf: RUNGS.h264.start + 2, bytes: 2000 })
    expect(rungs.find((r) => r.codec === 'vp9').budget).toBeNull()
    expect(rungs.find((r) => r.codec === 'h264')).toMatchObject({ budget: 2000, met: true })
    expect(unmet).toEqual([])
  })

  it('reports a miss on the rung that hit its own floor', async () => {
    const ffmpeg = fakeFfmpeg({ bytesFor: () => 5000 })
    const { unmet } = await run({ ffmpeg, config: config({ vp9: 100 }) })
    expect(unmet).toEqual([expect.objectContaining({ codec: 'vp9', crf: RUNGS.vp9.floor, budget: 100 })])
  })

  it('stops at the floor, reports the miss and never alters duration or frame rate', async () => {
    const ffmpeg = fakeFfmpeg({ bytesFor: () => 5000 })
    const { rungs, unmet, manifest } = await run({ ffmpeg, config: config(100) })
    const av1 = rungs.find((r) => r.codec === 'av1')
    expect(av1).toMatchObject({ crf: RUNGS.av1.floor, bytes: 5000, met: false })
    expect(unmet).toEqual([expect.objectContaining({ codec: 'av1', crf: RUNGS.av1.floor, bytes: 5000, budget: 100 })])
    expect(manifest.videos['home/reel.mp4'].variants[0].bytes).toBe(5000)
    const flags = ffmpeg.calls.encode.flatMap((c) => c.args)
    for (const forbidden of ['-t', '-to', '-r', '-vf', '-ss']) expect(flags).not.toContain(forbidden)
  })

  it('performs zero encodes on a warm second run', async () => {
    const cache = createMemoryQualityCache()
    const first = await run({ qualityCache: cache, config: config(800), ffmpeg: fakeFfmpeg({ bytesFor: () => 700 }) })
    const ffmpeg = fakeFfmpeg()
    const second = await run({ qualityCache: cache, config: config(800), ffmpeg })
    expect(first.encoded).toBe(3)
    expect(second.encoded).toBe(0)
    expect(second.cached).toBe(3)
    expect(ffmpeg.calls.encode).toEqual([])
    expect(second.manifest).toEqual(first.manifest)
  })

  it('re-encodes when the budget changes', async () => {
    await run({ config: config(800) })
    const again = await run({ config: config(900) })
    expect(again.encoded).toBe(1) // only the AV1 rung's key moved
  })

  it('re-encodes only the rung whose object budget changed', async () => {
    await run({ config: config({ av1: 800, vp9: 900 }) })
    const again = await run({ config: config({ av1: 800, vp9: 950 }) })
    expect(again.encoded).toBe(1)
  })

  it('writes nothing on a dry run', async () => {
    const ffmpeg = fakeFfmpeg()
    const out = await run({ ffmpeg, dryRun: true })
    expect(ffmpeg.calls.encode).toEqual([])
    expect(existsSync(mediaRoot)).toBe(false)
    expect(out.manifest.videos).toEqual({})
  })

  it('extracts a poster frame outside the content tree and routes it through the image pipeline', async () => {
    const ffmpeg = fakeFfmpeg()
    const { manifest } = await run({ ffmpeg })
    expect(ffmpeg.calls.frame).toEqual([join(posterRoot, 'home/reel.poster.jpg')])
    expect(posterJobs).toEqual([{ root: posterRoot, path: 'home/reel.poster.jpg' }])
    expect(Object.keys(manifest.images)).toEqual(['home/reel.poster.jpg'])
    expect(existsSync(join(contentRoot, 'home', 'reel.poster.jpg'))).toBe(false)
  })

  it('prefers an authored sibling image as the poster', async () => {
    writeFileSync(join(contentRoot, 'home', 'reel.jpg'), 'poster')
    const ffmpeg = fakeFfmpeg()
    const { manifest } = await run({ ffmpeg })
    expect(ffmpeg.calls.frame).toEqual([])
    expect(posterJobs).toEqual([{ root: contentRoot, path: 'home/reel.jpg' }])
    expect(manifest.videos['home/reel.mp4'].poster).toBe('home/reel.jpg')
  })

  it('names derivatives by codec and a hash, never beside the master', async () => {
    const { manifest } = await run()
    for (const v of manifest.videos['home/reel.mp4'].variants) {
      expect(v.url).toMatch(/^assets\/media\/home\/reel\.(av1|vp9|h264)\.[0-9a-f]{8}\.(webm|mp4)$/)
    }
    expect(videoDerivativeName('home/reel.mp4', 'av1', 'abcd1234')).toBe('home/reel.av1.abcd1234.webm')
  })
})

describe('manifest merging', () => {
  const image = { width: 1, height: 1, eager: false, variants: [] }
  const video = { width: 1, height: 1, duration: 1, poster: 'a/v.poster.jpg', variants: [] }

  it('overlays a scoped patch without dropping other entries', () => {
    const base = { images: { 'x.jpg': image }, videos: { 'old.mp4': video } }
    const out = mergeManifestData(base, { images: { 'a/v.poster.jpg': image }, videos: { 'new.mp4': video } })
    expect(Object.keys(out.images)).toEqual(['a/v.poster.jpg', 'x.jpg'])
    expect(Object.keys(out.videos)).toEqual(['new.mp4', 'old.mp4'])
  })

  it('omits videos when there are none, keeping the images-only shape', () => {
    expect(mergeManifestData(null, { images: { 'x.jpg': image } })).toEqual({ version: 1, images: { 'x.jpg': image } })
  })

  it('lets a full images run replace images but keep videos and their posters', () => {
    const existing = { images: { 'gone.jpg': image, 'a/v.poster.jpg': image }, videos: { 'a/v.mp4': video } }
    const out = keepVideoState(existing, { version: 1, images: { 'x.jpg': image } })
    expect(Object.keys(out.images)).toEqual(['a/v.poster.jpg', 'x.jpg'])
    expect(Object.keys(out.videos)).toEqual(['a/v.mp4'])
  })
})

describe('createFfmpeg', () => {
  it('parses probe output and reports encoded bytes via the injected runner', async () => {
    const seen = []
    const ff = createFfmpeg({
      run: async (bin, args) => {
        seen.push([bin, args])
        return {
          stdout: JSON.stringify({
            format: { duration: '36.6' },
            streams: [{ codec_type: 'video', width: 1920, height: 1080 }]
          })
        }
      },
      size: () => 42
    })
    expect(await ff.probe('in.mp4')).toEqual({ width: 1920, height: 1080, duration: 36.6, hasAudio: false })
    expect(await ff.encode({ input: 'in.mp4', output: 'out.webm', args: ['-an'] })).toEqual({ bytes: 42 })
    expect(seen[1][0]).toBe('ffmpeg')
    expect(seen[1][1].slice(-2)).toEqual(['-an', 'out.webm'])
  })
})
