// Media pipeline CLI.   node scripts/media/index.mjs images [--dry-run] [--prefix <content-path-prefix>]
//                       node scripts/media/index.mjs video  [--dry-run] [--prefix <content-path-prefix>]
//                       node scripts/media/index.mjs scorer   (is ssimulacra2 available?)
//
// Invoked deliberately (`npm run media:images` / `npm run media:video`) — NOT
// part of prebuild/build, because a cold run encodes thousands of variants. A warm run is a no-op.
// Reads app/content, writes only app/assets/media/.

import { join } from 'node:path'
import { loadConfig, repoRoot } from './config.mjs'
import { discoverMasters, VIDEO_MASTER_EXTENSIONS } from './discover.mjs'
import { createSharpEncoder, encodeImages } from './encode-images.mjs'
import { encodeVideos } from './encode-video.mjs'
import { createFfmpeg } from './ffmpeg.mjs'
import { keepVideoState, mergeManifestData, readManifest, writeManifest } from './manifest.mjs'
import { createScorer, describeScorer } from './scorer.mjs'
import { createMemoryQualityCache, createQualityCache } from './cache.mjs'

const [command, ...args] = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)

const scorer = createScorer()

if (command === 'scorer') {
  console.log(describeScorer(scorer))
  process.exit(scorer.available ? 0 : 1)
}

if (command !== 'images' && command !== 'video') {
  console.error('usage: node scripts/media/index.mjs images|video [--dry-run] [--prefix <path>] | scorer')
  process.exit(2)
}

const contentRoot = join(repoRoot, 'app', 'content')
const mediaRoot = join(repoRoot, 'app', 'assets', 'media')
const dryRun = flag('--dry-run')
const prefix = value('--prefix') ?? ''
const started = Date.now()
// The loop's results, outside app/ so the deploy never ships them.
const qualityCache = dryRun ? createMemoryQualityCache() : createQualityCache(join(repoRoot, '.cache', 'media', 'quality.json'))

console.log(describeScorer(scorer))

const config = await loadConfig()

if (command === 'video') {
  // Extracted poster frames are staged outside app/ so the deploy never ships them.
  const posterRoot = join(repoRoot, '.cache', 'media', 'posters')
  const encoder = createSharpEncoder()
  const masters = await discoverMasters(contentRoot, { prefix, extensions: VIDEO_MASTER_EXTENSIONS })
  const result = await encodeVideos({
    contentRoot,
    mediaRoot,
    posterRoot,
    config,
    masters,
    ffmpeg: createFfmpeg(),
    qualityCache,
    dryRun,
    log: (line) => console.log(line),
    encodePoster: async ({ root, path }) => {
      const poster = await encodeImages({
        contentRoot: root, mediaRoot, config, masters: [path], encoder, scorer, qualityCache, log: (line) => console.log(line)
      })
      return { images: poster.manifest.toJSON().images }
    }
  })
  qualityCache.save()

  // Video entries are merged into the existing manifest, so a scoped run
  // cannot clobber the rest of it.
  if (!dryRun) writeManifest(mediaRoot, mergeManifestData(await readManifest(mediaRoot), result.manifest))
  else console.log('manifest not written (dry run)')

  console.log(
    `${masters.length} videos, ${result.encoded} ${dryRun ? 'to encode' : 'encoded'}, ${result.cached} cached, ` +
      `${((Date.now() - started) / 1000).toFixed(1)}s`
  )
  for (const rung of result.rungs) {
    console.log(
      `  ${rung.source} ${rung.codec}: crf ${rung.crf}, ${(rung.bytes / 1e6).toFixed(2)} MB, ` +
        `${(rung.ms / 1000).toFixed(1)}s` + (rung.budget === null ? '' : rung.met ? ', budget met' : ', BUDGET NOT MET')
    )
  }
  process.exit(0)
}

const masters = await discoverMasters(contentRoot, { prefix })
const result = await encodeImages({
  contentRoot,
  mediaRoot,
  config,
  masters,
  encoder: createSharpEncoder(),
  scorer,
  qualityCache,
  dryRun,
  log: (line) => console.log(line)
})

qualityCache.save()

// A scoped or dry run must not overwrite the full manifest with a partial one.
if (!dryRun && prefix === '') writeManifest(mediaRoot, keepVideoState(await readManifest(mediaRoot), result.manifest.toJSON()))
else console.log(`manifest not written (${dryRun ? 'dry run' : 'scoped run'})`)

console.log(
  `${result.masters} masters, ${result.encoded} ${dryRun ? 'to encode' : 'encoded'}, ` +
    `${result.cached} cached, ${(result.bytes / 1e6).toFixed(2)} MB, ` +
    `quality ${result.method} (${result.searches} searches, ${result.misses.length} out of band), ` +
    `${((Date.now() - started) / 1000).toFixed(1)}s`
)
for (const miss of result.misses) {
  console.log(`  out of band: ${miss.name} score ${miss.score.toFixed(2)} vs ${miss.target}±${miss.tolerance} at q=${miss.quality}`)
}
