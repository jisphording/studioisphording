// @vitest-environment jsdom
//
// Tests for dev/js/three/modules/Experience.mjs: world lookup through the
// registry, construction order (Resources before World), the unknown-world
// path, the singleton, and destroy() (teardown when Barba leaves a WebGL
// page, so the next WebGL entry binds a fresh Experience). Everything Experience constructs is mocked, and the
// module keeps its singleton in module scope, so every case re-imports it
// after vi.resetModules(). The registry itself is real — it imports nothing
// eagerly — and the World_01 chunk it lazily imports is mocked; the world is
// built asynchronously, so cases await `exp.ready`.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const order = []
const resourcesCtor = vi.fn()
const worldUpdate = vi.fn()
const worldDestroy = vi.fn()
// The latest stub instance per label, so destroy() cases can inspect them.
const built = {}

function mockModules() {
  const stub = (label) =>
    class {
      constructor(...args) {
        order.push(label)
        built[label] = this
        this.args = args
        this.on = vi.fn()
        this.resize = vi.fn()
        this.update = vi.fn()
        this.destroy = vi.fn()
        this.controls = { dispose: vi.fn() }
        this.instance = { dispose: vi.fn() }
        this.traverse = vi.fn()
      }
    }

  vi.doMock('three', () => ({ Scene: stub('Scene') }))
  vi.doMock('../../../../dev/js/three/utils/Sizes.mjs', () => ({ Sizes: stub('Sizes') }))
  vi.doMock('../../../../dev/js/three/utils/Time.mjs', () => ({ Time: stub('Time') }))
  vi.doMock('../../../../dev/js/three/modules/Camera.mjs', () => ({ Camera: stub('Camera') }))
  vi.doMock('../../../../dev/js/three/modules/Renderer.mjs', () => ({ Renderer: stub('Renderer') }))
  vi.doMock('../../../../dev/js/three/utils/Debug.mjs', () => ({ Debug: stub('Debug') }))
  vi.doMock('../../../../dev/js/three/utils/Resources.mjs', () => ({
    Resources: class {
      constructor(...args) {
        order.push('Resources')
        built.Resources = this
        resourcesCtor(...args)
        this.destroy = vi.fn()
      }
    }
  }))
}

const sources = [{ name: 'a', type: 'texture', path: '/a.png' }]

function mockRegistry() {
  vi.doMock('../../../../dev/js/three/projects/isphording-inneneinrichtung/index.mjs', () => ({
    World: class {
      constructor() {
        order.push('World')
      }
      update() {
        worldUpdate()
      }
      destroy() {
        worldDestroy()
      }
    },
    sources
  }))
}

async function loadExperience() {
  const { Experience } = await import('../../../../dev/js/three/modules/Experience.mjs')
  return Experience
}

describe('Experience', () => {
  beforeEach(() => {
    vi.resetModules()
    order.length = 0
    resourcesCtor.mockClear()
    worldUpdate.mockClear()
    worldDestroy.mockClear()
    for (const key of Object.keys(built)) delete built[key]
    mockModules()
    mockRegistry()
  })

  it('builds Resources from the registry entry before constructing the World', async () => {
    const Experience = await loadExperience()
    const exp = new Experience({}, 'World_01', 0xffffff)
    expect(exp.world).toBeNull()
    await exp.ready

    expect(resourcesCtor).toHaveBeenCalledWith(sources, 'batch', 'isphording-inneneinrichtung')
    expect(order.indexOf('Resources')).toBeGreaterThan(-1)
    expect(order.indexOf('Resources')).toBeLessThan(order.indexOf('World'))
    expect(exp.world).not.toBeNull()

    exp.update()
    expect(worldUpdate).toHaveBeenCalledOnce()
  })

  it('logs one console.error for an unknown world and update() does not throw', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Experience = await loadExperience()
    const exp = new Experience({}, 'World_Nope', 0xffffff)
    await exp.ready

    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0][0]).toContain('World_Nope')
    expect(error.mock.calls[0][0]).toContain('World_01')
    expect(exp.world).toBeNull()
    expect(resourcesCtor).not.toHaveBeenCalled()
    expect(() => exp.update()).not.toThrow()
  })

  it('logs a world chunk that fails to load and keeps running without a world', async () => {
    vi.doMock('../../../../dev/js/three/projects/isphording-inneneinrichtung/index.mjs', () => {
      throw new Error('chunk 404')
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Experience = await loadExperience()
    const exp = new Experience({}, 'World_01', 0xffffff)
    await exp.ready

    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0][0]).toContain('World_01')
    expect(exp.world).toBeNull()
    expect(resourcesCtor).not.toHaveBeenCalled()
    expect(() => exp.update()).not.toThrow()
  })

  it('returns the same instance on a second construction', async () => {
    const Experience = await loadExperience()
    const first = new Experience({}, 'World_01', 0xffffff)
    const second = new Experience()
    await first.ready

    expect(second).toBe(first)
    expect(resourcesCtor).toHaveBeenCalledOnce()
  })

  it('sets window.experience when import.meta.env.DEV is true', async () => {
    vi.stubEnv('DEV', true)
    const Experience = await loadExperience()
    const exp = new Experience({}, 'World_01', 0xffffff)

    expect(typeof window.experience).toBe('object')
    expect(window.experience).toBe(exp)
    delete window.experience
  })

  it('does not set window.experience when import.meta.env.DEV is false', async () => {
    vi.stubEnv('DEV', false)
    const Experience = await loadExperience()
    const exp = new Experience({}, 'World_01', 0xffffff)

    expect(typeof window.experience).toBe('undefined')
  })

  describe('destroy()', () => {
    it('stops Time, Sizes and Resources and disposes world, controls and renderer', async () => {
      const Experience = await loadExperience()
      const exp = new Experience({}, 'World_01', 0xffffff)
      await exp.ready

      exp.destroy()

      expect(built.Time.destroy).toHaveBeenCalledOnce()
      expect(built.Sizes.destroy).toHaveBeenCalledOnce()
      expect(worldDestroy).toHaveBeenCalledOnce()
      expect(built.Camera.controls.dispose).toHaveBeenCalledOnce()
      expect(built.Renderer.instance.dispose).toHaveBeenCalledOnce()
      expect(built.Resources.destroy).toHaveBeenCalledOnce()
      expect(built.Scene.traverse).toHaveBeenCalledOnce()
    })

    it('disposes the geometry, materials and textures of every scene object', async () => {
      const Experience = await loadExperience()
      const exp = new Experience({}, 'World_01', 0xffffff)
      await exp.ready

      const texture = { isTexture: true, dispose: vi.fn() }
      const material = { map: texture, dispose: vi.fn() }
      const otherMaterial = { dispose: vi.fn() }
      const geometry = { dispose: vi.fn() }
      const meshes = [
        { geometry, material },
        { material: [otherMaterial] },
        {}
      ]
      built.Scene.traverse.mockImplementation((visit) => meshes.forEach(visit))

      exp.destroy()

      expect(geometry.dispose).toHaveBeenCalledOnce()
      expect(material.dispose).toHaveBeenCalledOnce()
      expect(texture.dispose).toHaveBeenCalledOnce()
      expect(otherMaterial.dispose).toHaveBeenCalledOnce()
    })

    it('resets the singleton so a later construction binds to the new canvas', async () => {
      const Experience = await loadExperience()
      const firstCanvas = { id: 'first' }
      const secondCanvas = { id: 'second' }
      const first = new Experience(firstCanvas, 'World_01', 0xffffff)
      await first.ready
      first.destroy()

      const second = new Experience(secondCanvas, 'World_01', 0xffffff)
      await second.ready

      expect(second).not.toBe(first)
      expect(second.canvas).toBe(secondCanvas)
      expect(resourcesCtor).toHaveBeenCalledTimes(2)
    })

    it('is idempotent', async () => {
      const Experience = await loadExperience()
      const exp = new Experience({}, 'World_01', 0xffffff)
      await exp.ready
      exp.destroy()

      expect(() => exp.destroy()).not.toThrow()
      expect(built.Time.destroy).toHaveBeenCalledOnce()
      expect(worldDestroy).toHaveBeenCalledOnce()
    })

    it('never builds the world when destroyed before its chunk arrives', async () => {
      const Experience = await loadExperience()
      const exp = new Experience({}, 'World_01', 0xffffff)
      exp.destroy()
      await exp.ready

      expect(resourcesCtor).not.toHaveBeenCalled()
      expect(exp.world).toBeNull()
    })

    it('removes window.experience in DEV', async () => {
      vi.stubEnv('DEV', true)
      const Experience = await loadExperience()
      const exp = new Experience({}, 'World_01', 0xffffff)
      await exp.ready
      exp.destroy()

      expect(window.experience).toBeUndefined()
    })
  })
})
