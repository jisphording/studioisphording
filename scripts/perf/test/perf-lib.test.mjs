// Unit tests for the pure parts of the perf tooling.
// Run: node --test scripts/perf/test/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { median, formatBytes, kindOf } from '../lib/util.mjs'
import { parseAttrs, parseSrcset, imageFlags, videoFlags } from '../lib/page-media.mjs'
import { stemOf, fileKey } from '../lib/disk-media.mjs'
import { row } from '../lib/delta.mjs'

test('median handles odd, even, empty and non-numeric input', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.equal(median([]), null)
  assert.equal(median([null, 5, NaN]), 5)
})

test('formatBytes and kindOf', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(kindOf('/assets/three/meshes/x.glb'), '3d')
  assert.equal(kindOf('/media/a-490x390-q60.webp?v=1'), 'image')
  assert.equal(kindOf('/video/a.webm'), 'video')
})

test('parseAttrs survives markup inside quoted attribute values', () => {
  // The site's alt texts contain <mark>, which broke naive [^>]* tag matching.
  const attrs = parseAttrs(' src="/a.jpg" alt="Project: <mark>X</mark>" loading=lazy playsinline')
  assert.equal(attrs.src, '/a.jpg')
  assert.equal(attrs.alt, 'Project: <mark>X</mark>')
  assert.equal(attrs.loading, 'lazy')
  assert.equal(attrs.playsinline, '')
})

test('parseSrcset reads URLs and width descriptors across whitespace', () => {
  const candidates = parseSrcset('/a-490.jpg 490w,\n\t\t /a-4320.jpg 4320w')
  assert.deepEqual(candidates, [
    { url: '/a-490.jpg', width: 490 },
    { url: '/a-4320.jpg', width: 4320 },
  ])
  assert.deepEqual(parseSrcset(undefined), [])
})

test('imageFlags: lazy first media element is an LCP risk, eager later ones are lazy-load candidates', () => {
  const lazy = { url: '/a.jpg', bytes: 1000, srcsetCount: 10, largestCandidate: { bytes: 2 * 1024 ** 2 }, attrs: { loading: 'lazy' } }
  const flags0 = imageFlags(lazy, 0)
  assert.ok(flags0.includes('lazy-first-media-lcp-risk'))
  assert.ok(flags0.includes('unsized-cls-risk'))
  assert.ok(flags0.includes('many-srcset-candidates(10)'))
  assert.ok(flags0.includes('largest-candidate>1MB'))
  assert.ok(flags0.includes('legacy-format'))
  assert.ok(!imageFlags(lazy, 1).includes('lazy-first-media-lcp-risk'))

  const eager = { url: '/b.webp', bytes: 400 * 1024, srcsetCount: 0, largestCandidate: null, attrs: { width: '10', height: '10' } }
  const flags3 = imageFlags(eager, 3)
  assert.deepEqual(flags3, ['eager-below-fold-candidate', 'no-srcset', 'src>300KB'])
})

test('videoFlags distinguishes the first autoplay video from later ones', () => {
  const v = { bytes: 6 * 1024 ** 2, poster: null, attrs: { autoplay: true } }
  assert.deepEqual(videoFlags(v, 0), ['autoplay-downloads-eagerly', 'no-poster', 'heavy-video>5MB'])
  assert.ok(videoFlags(v, 2).includes('offscreen-autoplay-candidate'))
  assert.deepEqual(videoFlags({ bytes: 10, poster: '/p.jpg', attrs: {} }, 0), ['no-preload-attr'])
})

test('stemOf strips Kirby thumb suffixes; fileKey keeps the extension', () => {
  assert.equal(stemOf('/media/pages/x/abc-123/Keyvisual-1200x960-q90.jpg'), 'keyvisual')
  assert.equal(stemOf('app/content/projects/x/keyvisual.jpg'), 'keyvisual')
  assert.equal(fileKey('/media/pages/x/abc/keyvisual-490x390-q60.jpg'), fileKey('app/content/x/keyvisual.jpg'))
  // A .gif must not count as "seen" because the .mp4 of the same name was requested.
  assert.notEqual(fileKey('/video/clip.mp4'), fileKey('app/video/gif/clip.gif'))
})

test('delta row verdicts respect direction and noise thresholds', () => {
  assert.equal(row('LCP', 2000, 1500, 'ms')[5], '✅ better')
  assert.equal(row('LCP', 1500, 2000, 'ms')[5], '❌ worse')
  assert.equal(row('LCP', 2000, 2040, 'ms')[5], '· same') // under 5%
  assert.equal(row('TBT', 10, 25, 'ms', { absNoise: 20 })[5], '· same') // big %, tiny absolute
  assert.equal(row('Score', 80, 90, 'score', { higherIsBetter: true })[5], '✅ better')
  assert.equal(row('Bytes', 0, 100, 'bytes')[4], 'n/a')
  assert.equal(row('Bytes', null, 100, 'bytes')[5], 'new/removed')
  assert.equal(row('Bytes', null, null, 'bytes'), null)
})
