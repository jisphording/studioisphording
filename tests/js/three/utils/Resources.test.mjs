// @vitest-environment jsdom
//
// Characterization tests for dev/js/three/utils/Resources.mjs.
//
// Resources' constructor reads `document.querySelector('.loading-bar')` (hence
// jsdom) and does `new Experience`, whose real module pulls in dat.gui, both
// worlds and several three/addons — so Experience is mocked with the shared
// helper. After construction the real three loaders are swapped for FakeLoaders,
// which makes the load/settle handshake observable without touching the network.
//
// Fake timers are on throughout: the constructor arms a 2000ms "start() was
// never called" warning, and leaving that on real timers would leak console
// noise between tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FakeLoader } from '../../helpers/fakeLoader.mjs'

vi.mock('../../../../dev/js/three/modules/Experience.mjs', async () => {
  const { experienceMockFactory } = await import('../../helpers/fakeExperience.mjs')
  return experienceMockFactory()
})

const { Resources } = await import('../../../../dev/js/three/utils/Resources.mjs')

/** n moodboard texture sources, named the way Resources detects them. */
function moodboardSources(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `moodboardImage_${i + 1}`,
    type: 'texture',
    path: `/moodboard/${i + 1}.jpg`
  }))
}

/** Swap the real three loaders for recording fakes. */
function withFakeLoaders(resources) {
  const fakes = {
    textureLoader: new FakeLoader(),
    gltfLoader: new FakeLoader(),
    cubeTextureLoader: new FakeLoader()
  }
  Object.assign(resources.loaders, fakes)
  return fakes
}

describe('Resources', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("mode 'batch'", () => {
    const sources = [
      { name: 'model', type: 'gltfModel', path: '/model.glb' },
      { name: 'floorTexture', type: 'texture', path: '/floor.jpg' },
      { name: 'env', type: 'cubeTexture', path: '/env/' }
    ]

    it('loads every non-moodboard source through its matching loader', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      resources.start()

      expect(loaders.gltfLoader.paths).toEqual(['/model.glb'])
      expect(loaders.textureLoader.paths).toEqual(['/floor.jpg'])
      expect(loaders.cubeTextureLoader.paths).toEqual(['/env/'])
    })

    it('fires resourcesReady exactly once, after the last source settles', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)
      const ready = vi.fn()
      resources.on('resourcesReady', ready)

      resources.start()
      expect(ready).not.toHaveBeenCalled()

      loaders.gltfLoader.resolve('/model.glb', { scene: {} })
      loaders.textureLoader.resolve('/floor.jpg')
      expect(ready).not.toHaveBeenCalled()

      loaders.cubeTextureLoader.resolve('/env/')
      expect(ready).toHaveBeenCalledTimes(1)
    })

    it('files each loaded source into items under its source name', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      resources.start()
      const gltf = loaders.gltfLoader.resolve('/model.glb', { scene: {} })
      const texture = loaders.textureLoader.resolve('/floor.jpg')
      const env = loaders.cubeTextureLoader.resolve('/env/')

      expect(resources.items).toEqual({
        model: gltf,
        floorTexture: texture,
        env: env
      })
      expect(resources.loaded).toBe(3)
      expect(resources.toLoad).toBe(3)
    })

    it('never touches the moodboard batch path', () => {
      const resources = new Resources([...sources, ...moodboardSources(4)], 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      resources.start()

      expect(loaders.textureLoader.paths).toEqual(['/floor.jpg'])
      expect(resources.moodboardSources).toHaveLength(4)
    })
  })

  describe("mode 'progressive'", () => {
    const otherSource = { name: 'model', type: 'gltfModel', path: '/model.glb' }

    function setup(moodboardCount = 5) {
      const resources = new Resources(
        [otherSource, ...moodboardSources(moodboardCount)],
        'progressive',
        'World_02'
      )
      const loaders = withFakeLoaders(resources)
      return { resources, loaders }
    }

    it('requests exactly initialBatchSize moodboard textures first', () => {
      const { resources, loaders } = setup(5)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 3 })

      expect(loaders.textureLoader.paths).toEqual(['/moodboard/1.jpg', '/moodboard/2.jpg'])
      expect(loaders.gltfLoader.paths).toEqual(['/model.glb'])
    })

    it('defaults to an initial batch of 10 when start() passes no options', () => {
      const { resources, loaders } = setup(14)

      resources.start()

      expect(loaders.textureLoader.callCount).toBe(10)
    })

    it('requests no further batch until batchProcessed is triggered, then backgroundBatchSize', () => {
      const { resources, loaders } = setup(5)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 3 })
      loaders.textureLoader.resolve('/moodboard/1.jpg')
      loaders.textureLoader.resolve('/moodboard/2.jpg')

      // Batch complete, but the world has not acknowledged it yet.
      expect(loaders.textureLoader.callCount).toBe(2)
      expect(resources.batchProcessing).toBe(true)

      resources.trigger('batchProcessed')

      expect(loaders.textureLoader.callCount).toBe(5)
      expect(loaders.textureLoader.paths.slice(2)).toEqual([
        '/moodboard/3.jpg',
        '/moodboard/4.jpg',
        '/moodboard/5.jpg'
      ])
    })

    it('triggers batchLoaded with [[{ name, path, texture }]] and needsUpdate set', () => {
      const { resources, loaders } = setup(2)
      const batchLoaded = vi.fn()
      resources.on('batchLoaded', batchLoaded)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
      loaders.textureLoader.resolve('/moodboard/1.jpg')
      expect(batchLoaded).not.toHaveBeenCalled()
      loaders.textureLoader.resolve('/moodboard/2.jpg')

      expect(batchLoaded).toHaveBeenCalledTimes(1)
      const [batch] = batchLoaded.mock.calls[0]
      expect(batch).toHaveLength(2)
      expect(batch.map(item => ({ name: item.name, path: item.path }))).toEqual([
        { name: 'moodboardImage_1', path: '/moodboard/1.jpg' },
        { name: 'moodboardImage_2', path: '/moodboard/2.jpg' }
      ])
      expect(batch.every(item => item.texture.needsUpdate === true)).toBe(true)
      expect(resources.items.moodboardImage_1).toBe(batch[0].texture)
    })

    it('still triggers batchLoaded with the survivors when one texture fails', () => {
      const { resources, loaders } = setup(2)
      const batchLoaded = vi.fn()
      resources.on('batchLoaded', batchLoaded)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
      loaders.textureLoader.resolve('/moodboard/1.jpg')
      loaders.textureLoader.reject('/moodboard/2.jpg')

      expect(batchLoaded).toHaveBeenCalledTimes(1)
      const [batch] = batchLoaded.mock.calls[0]
      expect(batch.map(item => item.name)).toEqual(['moodboardImage_1'])
      // A failed texture still counts towards the loaded tally.
      expect(resources.loaded).toBe(2)
    })

    // Phase 3 collapsed the success and error callbacks onto one finishBatch()
    // path, so a clean batch and a partially failed batch must now emit payloads
    // of exactly the same shape.
    it('emits the same payload shape whether or not a texture in the batch failed', () => {
      const shapes = []

      for (const failSecond of [false, true]) {
        const { resources, loaders } = setup(2)
        const batchLoaded = vi.fn()
        resources.on('batchLoaded', batchLoaded)

        resources.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
        loaders.textureLoader.resolve('/moodboard/1.jpg')
        if (failSecond) {
          loaders.textureLoader.reject('/moodboard/2.jpg')
        } else {
          loaders.textureLoader.resolve('/moodboard/2.jpg')
        }

        expect(batchLoaded).toHaveBeenCalledTimes(1)
        const [batch] = batchLoaded.mock.calls[0]
        expect(batch.every(item => item.texture.needsUpdate === true)).toBe(true)
        shapes.push(batch.map(item => Object.keys(item).sort()))
      }

      // Clean batch: two entries. Partial failure: one survivor. Same keys either way.
      expect(shapes[0]).toEqual([
        ['name', 'path', 'texture'],
        ['name', 'path', 'texture']
      ])
      expect(shapes[1]).toEqual([['name', 'path', 'texture']])
    })

    it('triggers batchProcessed without batchLoaded when a whole batch fails', () => {
      const { resources, loaders } = setup(2)
      const batchLoaded = vi.fn()
      const batchProcessed = vi.fn()
      resources.on('batchLoaded', batchLoaded)
      resources.on('batchProcessed', batchProcessed)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
      loaders.textureLoader.reject('/moodboard/1.jpg')
      loaders.textureLoader.reject('/moodboard/2.jpg')

      expect(batchLoaded).not.toHaveBeenCalled()
      expect(batchProcessed).toHaveBeenCalledTimes(1)
    })
  })

  describe('failed loads and resourcesReady', () => {
    it('counts a failed non-moodboard source, logs it, and still fires resourcesReady once', () => {
      const resources = new Resources([
        { name: 'model', type: 'gltfModel', path: '/model.glb' },
        { name: 'floor', type: 'texture', path: '/floor.jpg' },
        { name: 'env', type: 'cubeTexture', path: '/env/' }
      ], 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)
      const ready = vi.fn()
      resources.on('resourcesReady', ready)

      resources.start()
      loaders.gltfLoader.reject('/model.glb')
      loaders.textureLoader.reject('/floor.jpg')
      expect(ready).not.toHaveBeenCalled()
      loaders.cubeTextureLoader.resolve('/env/')

      expect(resources.loaded).toBe(3)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('model'), expect.any(Error)
      )
      expect(ready).toHaveBeenCalledTimes(1)
      // A failed source is absent from items, as with failed moodboard textures.
      expect(resources.items).not.toHaveProperty('model')
      expect(resources.items).not.toHaveProperty('floor')
    })

    it('fires resourcesReady once when the last other source settles after the batches', () => {
      const resources = new Resources([
        { name: 'model', type: 'gltfModel', path: '/model.glb' },
        ...moodboardSources(2)
      ], 'progressive', 'World_02')
      const loaders = withFakeLoaders(resources)
      const ready = vi.fn()
      resources.on('resourcesReady', ready)

      resources.start({ initialBatchSize: 2, backgroundBatchSize: 2 })
      loaders.textureLoader.resolve('/moodboard/1.jpg')
      loaders.textureLoader.resolve('/moodboard/2.jpg')
      expect(ready).not.toHaveBeenCalled()
      loaders.gltfLoader.reject('/model.glb')

      expect(ready).toHaveBeenCalledTimes(1)
    })

    it('fires resourcesReady at most once even when completion is checked repeatedly', () => {
      const resources = new Resources([{ name: 'm', type: 'gltfModel', path: '/m.glb' }], 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)
      const ready = vi.fn()
      resources.on('resourcesReady', ready)

      resources.start()
      loaders.gltfLoader.resolve('/m.glb', { scene: {} })
      resources.checkOverallLoadCompletion()
      resources.trigger('batchProcessed')

      expect(ready).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadSource() type routing', () => {
    it('routes each known source type to its matching loader', () => {
      const resources = new Resources([], 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      resources.loadSource({ name: 'model', type: 'gltfModel', path: '/model.glb' })
      resources.loadSource({ name: 'tex', type: 'texture', path: '/tex.jpg' })
      resources.loadSource({ name: 'env', type: 'cubeTexture', path: '/env/' })

      expect(loaders.gltfLoader.paths).toEqual(['/model.glb'])
      expect(loaders.textureLoader.paths).toEqual(['/tex.jpg'])
      expect(loaders.cubeTextureLoader.paths).toEqual(['/env/'])
    })

    it('loads nothing and does not throw for an unknown source type', () => {
      const resources = new Resources([], 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      expect(() => resources.loadSource({ name: 'x', type: 'audio', path: '/x.mp3' })).not.toThrow()

      expect(loaders.gltfLoader.callCount).toBe(0)
      expect(loaders.textureLoader.callCount).toBe(0)
      expect(loaders.cubeTextureLoader.callCount).toBe(0)
    })
  })

  describe('start() protocol', () => {
    const sources = [{ name: 'model', type: 'gltfModel', path: '/model.glb' }]

    it('warns and loads nothing extra when called twice', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      const loaders = withFakeLoaders(resources)

      resources.start()
      expect(loaders.gltfLoader.callCount).toBe(1)

      resources.start()

      expect(loaders.gltfLoader.callCount).toBe(1)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('start() called more than once for world "World_01"')
      )
    })

    it('warns naming the world when start() is never called within 2000ms', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      withFakeLoaders(resources)

      vi.advanceTimersByTime(1999)
      expect(console.warn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('start() was never called for world "World_01"')
      )
    })

    it('stays quiet when start() was called before the 2000ms deadline', () => {
      const resources = new Resources(sources, 'batch', 'World_01')
      withFakeLoaders(resources)

      resources.start()
      vi.advanceTimersByTime(2000)

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('warns and loads nothing when no mode was set', () => {
      const resources = new Resources(sources)
      const loaders = withFakeLoaders(resources)

      resources.start()

      expect(loaders.gltfLoader.callCount).toBe(0)
      expect(loaders.textureLoader.callCount).toBe(0)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('with no loading mode set')
      )
    })

    it('defaults worldName to "unknown"', () => {
      const resources = new Resources(sources)
      withFakeLoaders(resources)

      vi.advanceTimersByTime(2000)

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('world "unknown"'))
    })
  })
})
