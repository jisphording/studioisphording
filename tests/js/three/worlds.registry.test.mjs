// The world registry (dev/js/three/worlds.mjs) must stay importable without
// pulling in Three.js: it is the table the Experience looks names up in, and
// each world is its own lazily imported chunk. `three` and both world chunks
// are mocked to throw, so any eager import fails this file.

import { describe, it, expect, vi } from 'vitest'

vi.mock('three', () => {
  throw new Error('three was imported')
})
vi.mock('../../../dev/js/three/projects/isphording-inneneinrichtung/index.mjs', () => {
  throw new Error('World_01 chunk was imported')
})
vi.mock('../../../dev/js/three/projects/moodboard/index.mjs', () => {
  throw new Error('World_02 chunk was imported')
})

const { worlds, loadWorld } = await import('../../../dev/js/three/worlds.mjs')

describe('worlds registry (lazy)', () => {
  it('resolves each registered name to a loader function', () => {
    expect(Object.keys(worlds)).toEqual(['World_01', 'World_02'])
    for (const entry of Object.values(worlds)) {
      expect(typeof entry.load).toBe('function')
    }
  })

  it('reports an unknown name with the registered names and resolves null', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(loadWorld('World_Nope')).resolves.toBeNull()

    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0][0]).toContain('World_Nope')
    expect(error.mock.calls[0][0]).toContain('World_01, World_02')
  })

  it('does not treat inherited object keys as worlds', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(loadWorld('toString')).resolves.toBeNull()
  })
})
