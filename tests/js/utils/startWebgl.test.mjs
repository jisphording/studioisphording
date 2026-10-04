// @vitest-environment jsdom
//
// Tests for dev/js/utils/startWebgl.mjs: the Three.js experience is imported
// only when the page renders a #webgl canvas with a data-world, so non-WebGL
// routes never download the vendor-three chunk. The loader is injected, so
// nothing here imports three.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startWebgl } from '../../../dev/js/utils/startWebgl.mjs'

describe('startWebgl', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('does not import the experience when the page has no #webgl canvas', async () => {
    const load = vi.fn()

    await expect(startWebgl(document, load)).resolves.toBe(false)
    expect(load).not.toHaveBeenCalled()
  })

  it('does not import the experience when #webgl names no world', async () => {
    document.body.innerHTML = '<canvas id="webgl"></canvas>'
    const load = vi.fn()

    await expect(startWebgl(document, load)).resolves.toBe(false)
    expect(load).not.toHaveBeenCalled()
  })

  it('imports the experience and runs the canvas world', async () => {
    document.body.innerHTML = '<canvas id="webgl" data-world="World_02"></canvas>'
    const runExperience = vi.fn()
    const load = vi.fn().mockResolvedValue({ runExperience })

    await expect(startWebgl(document, load)).resolves.toBe(true)
    expect(load).toHaveBeenCalledOnce()
    expect(runExperience).toHaveBeenCalledWith('#webgl', 'World_02')
  })

  it('logs and resolves false when the experience chunk fails to load', async () => {
    document.body.innerHTML = '<canvas id="webgl" data-world="World_01"></canvas>'
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const load = vi.fn().mockRejectedValue(new Error('chunk 404'))

    await expect(startWebgl(document, load)).resolves.toBe(false)
    expect(error).toHaveBeenCalledOnce()
  })
})
