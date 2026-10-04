// @vitest-environment jsdom
//
// Tests for dev/js/three/modules/Experience.mjs: world lookup through the
// registry, construction order (Resources before World), the unknown-world
// path, and the singleton. Everything Experience constructs is mocked, and the
// module keeps its singleton in module scope, so every case re-imports it
// after vi.resetModules(). The registry itself is real — it imports nothing
// eagerly — and the World_01 chunk it lazily imports is mocked; the world is
// built asynchronously, so cases await `exp.ready`.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const order = []
const resourcesCtor = vi.fn()
const worldUpdate = vi.fn()

function mockModules() {
  const stub = (label) =>
    class {
      constructor(...args) {
        order.push(label)
        this.args = args
        this.on = vi.fn()
        this.resize = vi.fn()
        this.update = vi.fn()
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
        resourcesCtor(...args)
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
})
