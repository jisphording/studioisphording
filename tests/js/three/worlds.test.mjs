// Guards the world registry (dev/js/three/worlds.mjs) and the World_Sources
// lists it wires up, so a new world or a source-list typo fails here instead of
// at runtime in the browser. The worlds import the Experience singleton, whose
// real module cannot load headless, so it is replaced with the shared fake.

import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../dev/js/three/modules/Experience.mjs', async () => {
  const { experienceMockFactory } = await import('../helpers/fakeExperience.mjs')
  return experienceMockFactory()
})

const { worlds } = await import('../../../dev/js/three/worlds.mjs')

const MODES = ['batch', 'progressive']
const SOURCE_TYPES = ['gltfModel', 'texture', 'cubeTexture']

describe('worlds registry', () => {
  it('registers World_01 and World_02', () => {
    expect(Object.keys(worlds)).toEqual(['World_01', 'World_02'])
  })

  describe.each(Object.entries(worlds))('%s', (_key, entry) => {
    it('has a constructable World, a valid mode and a name', () => {
      expect(typeof entry.World).toBe('function')
      expect(entry.World.prototype).toBeDefined()
      expect(MODES).toContain(entry.mode)
      expect(typeof entry.name).toBe('string')
      expect(entry.name).not.toBe('')
    })

    it('has a non-empty sources array', () => {
      expect(Array.isArray(entry.sources)).toBe(true)
      expect(entry.sources.length).toBeGreaterThan(0)
    })

    it('has uniquely named sources with a known type and a valid path', () => {
      const names = entry.sources.map((s) => s.name)
      expect(new Set(names).size).toBe(names.length)

      for (const source of entry.sources) {
        expect(typeof source.name).toBe('string')
        expect(source.name).not.toBe('')
        expect(SOURCE_TYPES).toContain(source.type)
        if (source.type === 'cubeTexture') {
          expect(Array.isArray(source.path)).toBe(true)
          expect(source.path).toHaveLength(6)
        } else {
          expect(typeof source.path).toBe('string')
        }
      }
    })

    it('progressive worlds carry at least one moodboardImage_ texture', () => {
      if (entry.mode !== 'progressive') return
      expect(
        entry.sources.some((s) => s.type === 'texture' && s.name.startsWith('moodboardImage_'))
      ).toBe(true)
    })
  })
})
