// @vitest-environment jsdom
//
// runExperience and Resources narrate progress with console.log. That chatter
// belongs to dev builds only (production already strips console.log through
// terser pure_funcs, so this quiets dev/test output). console.warn/error stay.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FakeLoader } from '../helpers/fakeLoader.mjs'

vi.mock('../../../dev/js/three/modules/Experience.mjs', async () => {
  const { experienceMockFactory } = await import('../helpers/fakeExperience.mjs')
  return experienceMockFactory()
})

const { Resources } = await import('../../../dev/js/three/utils/Resources.mjs')
const { runExperience } = await import('../../../dev/js/three/runExperience.js')

function moodboardSources(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `moodboardImage_${i + 1}`,
    type: 'texture',
    path: `/moodboard/${i + 1}.jpg`
  }))
}

function withFakeLoaders(resources) {
  const fakes = {
    textureLoader: new FakeLoader(),
    gltfLoader: new FakeLoader(),
    cubeTextureLoader: new FakeLoader()
  }
  Object.assign(resources.loaders, fakes)
  return fakes
}

/** Drive batch + progressive loading through every logging branch. */
function exercise() {
  runExperience('#webgl', 'World_02')

  const batch = new Resources([{ name: 'floor', type: 'texture', path: '/floor.jpg' }], 'batch', 'World_01')
  const batchLoaders = withFakeLoaders(batch)
  batch.start()
  batchLoaders.textureLoader.resolve('/floor.jpg')

  const prog = new Resources(
    [{ name: 'model', type: 'gltfModel', path: '/model.glb' }, ...moodboardSources(3)],
    'progressive',
    'World_02'
  )
  const loaders = withFakeLoaders(prog)
  prog.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
  loaders.gltfLoader.resolve('/model.glb', { scene: {} })
  loaders.textureLoader.resolve('/moodboard/1.jpg')
  loaders.textureLoader.resolve('/moodboard/2.jpg')
  prog.trigger('batchProcessed')
  loaders.textureLoader.resolve('/moodboard/3.jpg')
  prog.trigger('batchProcessed')
}

describe('dev-only console.log', () => {
  let log

  beforeEach(() => {
    vi.useFakeTimers()
    log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('logs nothing from runExperience or Resources when DEV is false', () => {
    vi.stubEnv('DEV', false)
    exercise()
    expect(log).not.toHaveBeenCalled()
  })

  it('keeps the messages when DEV is true', () => {
    vi.stubEnv('DEV', true)
    exercise()
    const messages = log.mock.calls.map((c) => String(c[0]))
    expect(messages.some((m) => m.startsWith('runExperience in'))).toBe(true)
    expect(messages.some((m) => m.startsWith('Resources: Starting progressive loading'))).toBe(true)
    expect(messages).toContain('floor loaded')
  })
})
