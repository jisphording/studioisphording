// Integration test for the pipeline spine: config -> cache -> paths ->
// manifest, driven by the stub encoder from scripts/media/encoder.mjs.
//
// This is what phase 3's sharp encoder drops into. It proves the pieces fit
// and that a warm second run is a no-op. Uses a temp directory for both the
// fake content tree and the media root; never reads app/content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { encoderSettings, resolveSettings, validateConfig } from '../../../scripts/media/config.mjs'
import { cacheDecision, hashFile } from '../../../scripts/media/cache.mjs'
import { createManifest, serialiseManifest, writeManifest } from '../../../scripts/media/manifest.mjs'
import { createStubEncoder } from '../../../scripts/media/encoder.mjs'

const config = validateConfig({
  default: { target: 86, widths: [480, 800], formats: ['avif', 'jpeg'] },
  overrides: [{ match: 'home/landing_reel.jpg', target: 92, eager: true }]
})

const masters = ['home/landing_reel.jpg', 'projects/01-a/a-00_keyvisual.jpg']

// One pipeline run: encode every missing variant, accumulate the manifest.
const run = async (contentRoot, mediaRoot, encoder) => {
  const manifest = createManifest()

  for (const contentPath of masters) {
    const masterFile = join(contentRoot, contentPath)
    const masterHash = await hashFile(masterFile)
    const resolved = resolveSettings(config, contentPath)
    const intrinsic = await encoder.probe(masterFile)

    const variants = []
    for (const format of resolved.formats) {
      const settings = encoderSettings(resolved, format)
      for (const width of resolved.widths) {
        const decision = cacheDecision({ mediaRoot, contentPath, width, format, masterHash, settings })
        let { bytes } = decision
        let height = Math.round((width * intrinsic.height) / intrinsic.width)

        if (!decision.hit) {
          const encoded = await encoder.encode({ masterFile, width, format, settings })
          mkdirSync(dirname(decision.file), { recursive: true })
          writeFileSync(decision.file, encoded.data)
          bytes = encoded.data.length
          height = encoded.height
        }

        variants.push({ format, width, height, bytes, url: decision.url })
      }
    }

    manifest.addImage({
      source: contentPath,
      width: intrinsic.width,
      height: intrinsic.height,
      eager: resolved.eager,
      variants
    })
  }

  writeManifest(mediaRoot, manifest)
  return manifest
}

describe('pipeline spine', () => {
  let contentRoot
  let mediaRoot
  let encoder

  beforeEach(() => {
    contentRoot = mkdtempSync(join(tmpdir(), 'media-content-'))
    mediaRoot = mkdtempSync(join(tmpdir(), 'media-out-'))
    encoder = createStubEncoder({ intrinsic: { width: 4000, height: 2000 } })

    for (const contentPath of masters) {
      const file = join(contentRoot, contentPath)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, `master bytes for ${contentPath}`)
    }
  })

  afterEach(() => {
    rmSync(contentRoot, { recursive: true, force: true })
    rmSync(mediaRoot, { recursive: true, force: true })
  })

  it('encodes every variant on a cold run', async () => {
    await run(contentRoot, mediaRoot, encoder)

    // 2 masters x 2 formats x 2 widths
    expect(encoder.calls).toHaveLength(8)
  })

  it('is a no-op on a warm run and writes the same manifest', async () => {
    const cold = await run(contentRoot, mediaRoot, encoder)
    const before = serialiseManifest(cold)

    const warm = createStubEncoder({ intrinsic: { width: 4000, height: 2000 } })
    const second = await run(contentRoot, mediaRoot, warm)

    expect(warm.calls).toHaveLength(0)
    expect(serialiseManifest(second)).toBe(before)
  })

  it('re-encodes only the master whose bytes changed', async () => {
    await run(contentRoot, mediaRoot, encoder)
    writeFileSync(join(contentRoot, 'home/landing_reel.jpg'), 'different master bytes')

    const second = createStubEncoder({ intrinsic: { width: 4000, height: 2000 } })
    await run(contentRoot, mediaRoot, second)

    expect(second.calls).toHaveLength(4)
    expect(second.calls.every((call) => call.masterFile.endsWith('landing_reel.jpg'))).toBe(true)
  })

  it('passes the resolved target through to the encoder per master', async () => {
    await run(contentRoot, mediaRoot, encoder)
    const targets = new Map(encoder.calls.map((call) => [call.masterFile.split('/').pop(), call.settings.target]))

    expect(targets.get('landing_reel.jpg')).toBe(92)
    expect(targets.get('a-00_keyvisual.jpg')).toBe(86)
  })

  it('carries eager and intrinsic dimensions into the manifest', async () => {
    const manifest = await run(contentRoot, mediaRoot, encoder)
    const images = manifest.toJSON().images

    expect(images['home/landing_reel.jpg'].eager).toBe(true)
    expect(images['projects/01-a/a-00_keyvisual.jpg'].eager).toBe(false)
    expect(images['home/landing_reel.jpg']).toMatchObject({ width: 4000, height: 2000 })
    expect(images['home/landing_reel.jpg'].variants[0]).toMatchObject({ width: 480, height: 240 })
  })
})
