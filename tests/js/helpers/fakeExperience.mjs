// Fake Experience singleton.
//
// dev/js/three/utils/Resources.mjs does `new Experience` in its constructor.
// Importing the real module pulls in Renderer (dat.gui), Debug, both worlds and
// several three/addons — none of which can run headless. Tests replace it:
//
//   import { experienceMockFactory } from '../../helpers/fakeExperience.mjs'
//   vi.mock('../../../../dev/js/three/modules/Experience.mjs', experienceMockFactory)
//
// The vi.mock path must be written relative to the TEST file (Vitest resolves
// module ids from the importer), which is why the factory is exported rather
// than the path.
//
// The returned Experience is a plain class whose instances expose the minimal
// surface Resources and the worlds read: renderer, scene, camera. It is NOT a
// singleton, so no vi.resetModules() dance is needed for consumers of it.

import { vi } from 'vitest'

export function makeFakeExperience() {
  return {
    canvas: null,
    scene: { needsUpdate: false, add: vi.fn(), remove: vi.fn() },
    camera: { instance: { position: { set: vi.fn() } } },
    renderer: { instance: null, update: vi.fn(), resize: vi.fn() },
    sizes: { width: 1024, height: 768, pixelRatio: 1 },
    time: { elapsed: 0, delta: 16 }
  }
}

/** vi.mock factory for dev/js/three/modules/Experience.mjs. */
export function experienceMockFactory() {
  return {
    Experience: class Experience {
      constructor(canvas, world, clearColor) {
        Object.assign(this, makeFakeExperience())
        this.canvas = canvas ?? null
        this.worldName = world
        this.clearColor = clearColor
      }
    }
  }
}
