// Video encoding: the per-master AV1 / VP9 / H.264 ladder plus a poster.
//
// Each source becomes three same-resolution derivatives in <source> order
// (AV1/WebM, VP9/WebM, H.264/MP4), each CRF-targeted, and a poster routed
// through the image pipeline so it is a first-class manifest image.
//
// Byte budget: a `budget` from media.config.mjs is either a number (the AV1
// rung only, the one a modern browser downloads) or an { av1, vp9, h264 }
// object budgeting each named rung. A budgeted rung is encoded, measured, and
// the CRF stepped up until it fits or its floor quality is reached. Duration,
// frame rate and resolution are never touched; if the floor is hit the achieved
// bytes and CRF are reported (`met: false`) and the output still ships. An
// unbudgeted rung encodes once at its start CRF, chosen to sit near AV1's quality.
//
// Cache: the output filename carries a hash of (master bytes, codec, encoder
// settings incl. budget), so a warm run is one existsSync per rung. The CRF a
// stepped rung settled on is kept in the quality cache (.cache/media/), since
// it cannot be read back from the file.
//
// Invoked deliberately via `npm run media:video`; never part of build.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { canonicalJson, hashFile, createMemoryQualityCache } from './cache.mjs'
import { resolveSettings } from './config.mjs'
import {
  VIDEO_CODEC_ORDER,
  stripExtension,
  videoCodec,
  videoDerivativeFile,
  videoDerivativeName,
  videoDerivativeUrlPath
} from './paths.mjs'

// Bump when the flags below change what a given CRF produces.
export const VIDEO_ENCODER_VERSION = 1

// AV1/VP9 CRF runs 0-63, H.264 0-51 (lower = better). `start` is the first
// attempt; `floor` is the worst CRF we will ship; `step` is the stepping unit.
export const RUNGS = {
  av1: { start: 34, floor: 48, step: 2 },
  vp9: { start: 34, floor: 48, step: 2 },
  h264: { start: 23, floor: 32, step: 1 }
}

// Long keyframe interval, carried over from the old script (-g 9999): these
// are silent loops, so frequent keyframes only cost bytes. 240 frames is 10 s
// at 24 fps and still leaves seeking and range requests usable.
export const KEYFRAME_INTERVAL = 240

/** The ffmpeg output arguments (everything between -i <input> and <output>). */
export const buildEncodeArgs = ({ codec, crf, hasAudio }) => {
  const common = ['-pix_fmt', 'yuv420p', '-g', String(KEYFRAME_INTERVAL)]
  // Silent loops carry no audio track (-an), as the old script did.
  const audio = (name) => (hasAudio ? ['-c:a', name, '-b:a', '96k'] : ['-an'])

  if (codec === 'av1') {
    return ['-c:v', 'libsvtav1', '-preset', '4', '-crf', String(crf), ...common, ...audio('libopus'), '-f', 'webm']
  }
  if (codec === 'vp9') {
    return [
      '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-deadline', 'good', '-cpu-used', '2',
      '-row-mt', '1', '-aq-mode', '0', ...common, ...audio('libopus'), '-f', 'webm'
    ]
  }
  if (codec === 'h264') {
    return [
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), ...common, '-movflags', '+faststart',
      ...audio('aac'), '-f', 'mp4'
    ]
  }
  throw new Error(`encode-video: unsupported codec ${JSON.stringify(codec)}.`)
}

/**
 * Step the CRF up until `bytes <= budget` or `floor` is reached.
 *
 * @param {(crf: number) => Promise<number>} attempt encode at a CRF, resolve its bytes
 * @returns {Promise<{crf: number, bytes: number, met: boolean, attempts: number[]}>}
 *   The last attempt is always the one returned, so its output is the one on disk.
 */
export const fitToBudget = async ({ attempt, start, floor, step, budget }) => {
  const attempts = []
  let crf = start
  for (;;) {
    const bytes = await attempt(crf)
    attempts.push(crf)
    if (budget === undefined || bytes <= budget) return { crf, bytes, met: true, attempts }
    if (crf >= floor) return { crf, bytes, met: false, attempts }
    crf = Math.min(crf + step, floor)
  }
}

// A scalar budget is the AV1 rung's alone; an object budgets each named rung.
export const rungBudget = (budget, codec) =>
  typeof budget === 'number' ? (codec === 'av1' ? budget : undefined) : budget?.[codec]

const rungKey = (masterHash, codec, settings) =>
  createHash('sha256').update(canonicalJson({ masterHash, codec, settings })).digest('hex').slice(0, 8)

const POSTER_SIBLINGS = ['.jpg', '.jpeg', '.png']

/**
 * @param {object} input
 * @param {string} input.contentRoot app/content
 * @param {string} input.mediaRoot   app/assets/media
 * @param {string} input.posterRoot  where extracted poster frames are staged (outside app/)
 * @param {object} input.config      validated media config
 * @param {string[]} input.masters   content-relative video paths
 * @param {object} input.ffmpeg      ffmpeg.mjs createFfmpeg() or a fake
 * @param {(job: {root: string, path: string}) => Promise<{images: object, bytes: number}>} input.encodePoster
 *        runs one poster through the image pipeline; resolves its manifest `images` data
 * @returns {Promise<{manifest: {images: object, videos: object}, encoded: number, cached: number,
 *            rungs: object[], unmet: object[]}>}
 */
export const encodeVideos = async ({
  contentRoot,
  mediaRoot,
  posterRoot,
  config,
  masters,
  ffmpeg,
  encodePoster,
  qualityCache = createMemoryQualityCache(),
  dryRun = false,
  log = () => {}
}) => {
  const manifest = { images: {}, videos: {} }
  const stats = { encoded: 0, cached: 0, rungs: [], unmet: [] }

  for (const contentPath of masters) {
    const masterFile = join(contentRoot, contentPath)
    const masterHash = await hashFile(masterFile)
    const resolved = resolveSettings(config, contentPath)
    const probe = await ffmpeg.probe(masterFile)
    const variants = []

    for (const codec of VIDEO_CODEC_ORDER) {
      const rung = RUNGS[codec]
      const budget = rungBudget(resolved.budget, codec)
      const settings = { v: VIDEO_ENCODER_VERSION, ...rung, budget: budget ?? null, hasAudio: probe.hasAudio }
      const hash = rungKey(masterHash, codec, settings)
      const name = videoDerivativeName(contentPath, codec, hash)
      const file = videoDerivativeFile(mediaRoot, contentPath, codec, hash)
      const url = videoDerivativeUrlPath(contentPath, codec, hash)
      let bytes
      let crf

      if (existsSync(file)) {
        stats.cached += 1
        bytes = statSync(file).size
        crf = qualityCache.get(`video:${hash}`)?.crf ?? null
      } else {
        stats.encoded += 1
        if (dryRun) {
          log(`would encode ${name}`)
          continue
        }
        mkdirSync(dirname(file), { recursive: true })
        const part = `${file}.part`
        const started = Date.now()
        try {
          const fit = await fitToBudget({
            start: rung.start,
            floor: rung.floor,
            step: rung.step,
            budget,
            attempt: async (value) => {
              const out = await ffmpeg.encode({
                input: masterFile,
                output: part,
                args: buildEncodeArgs({ codec, crf: value, hasAudio: probe.hasAudio })
              })
              log(`  ${name} crf ${value}: ${(out.bytes / 1e6).toFixed(2)} MB`)
              return out.bytes
            }
          })
          renameSync(part, file)
          bytes = fit.bytes
          crf = fit.crf
          qualityCache.set(`video:${hash}`, { crf })
          const ms = Date.now() - started
          stats.rungs.push({ source: contentPath, codec, crf, bytes, ms, budget: budget ?? null, met: fit.met, attempts: fit.attempts })
          log(`encode ${name} crf=${crf} ${(bytes / 1e6).toFixed(2)} MB ${(ms / 1000).toFixed(1)}s`)
          if (!fit.met) {
            stats.unmet.push({ source: contentPath, codec, crf, bytes, budget })
            log(`BUDGET MISS ${name}: ${bytes} bytes > ${budget} at floor crf ${crf} — shipped as is`)
          }
        } finally {
          rmSync(part, { force: true })
        }
      }

      variants.push({ codec, type: videoCodec(codec).type, bytes, crf, url })
    }

    if (dryRun) continue

    // Poster: an authored sibling image if there is one, else a frame pulled
    // from the video into posterRoot. Either way it goes through the image
    // pipeline and lands in the manifest like any other image.
    const dir = posix.dirname(contentPath)
    const base = stripExtension(posix.basename(contentPath))
    const sibling = POSTER_SIBLINGS.map((ext) => (dir === '.' ? `${base}${ext}` : posix.join(dir, `${base}${ext}`))).find(
      (candidate) => existsSync(join(contentRoot, candidate))
    )
    let poster = sibling
    let root = contentRoot
    if (!sibling) {
      poster = dir === '.' ? `${base}.poster.jpg` : posix.join(dir, `${base}.poster.jpg`)
      root = posterRoot
      const frame = join(posterRoot, poster)
      if (!existsSync(frame) || statSync(frame).mtimeMs < statSync(masterFile).mtimeMs) {
        mkdirSync(dirname(frame), { recursive: true })
        await ffmpeg.extractFrame({ input: masterFile, output: frame, at: Math.min(1, probe.duration / 2) })
      }
    }
    const { images } = await encodePoster({ root, path: poster })
    Object.assign(manifest.images, images)

    manifest.videos[contentPath] = {
      width: probe.width,
      height: probe.height,
      duration: Math.round(probe.duration * 1000) / 1000,
      poster,
      variants
    }
  }

  return { manifest, ...stats }
}
