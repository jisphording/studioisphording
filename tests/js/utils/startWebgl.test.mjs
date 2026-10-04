// @vitest-environment jsdom
//
// Tests for dev/js/utils/startWebgl.mjs: the Three.js experience is imported
// only when the page renders a #webgl canvas with a data-world, so non-WebGL
// routes never download the vendor-three chunk. The loader is injected, so
// nothing here imports three. stopWebgl() tears the running experience down
// through the stop handle runExperience returns (Barba calls it when leaving a
// WebGL page); the module keeps that handle, so every case starts by stopping.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startWebgl, stopWebgl } from '../../../dev/js/utils/startWebgl.mjs'

describe('startWebgl', () => {
  beforeEach(() => {
    stopWebgl()
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

  it('looks for the canvas inside the given root (the container Barba swapped in)', async () => {
    document.body.innerHTML = '<canvas id="webgl" data-world="World_01"></canvas>'
    const runExperience = vi.fn()
    const load = vi.fn().mockResolvedValue({ runExperience })
    const container = document.createElement('div')
    container.innerHTML = '<p>no canvas here</p>'

    await expect(startWebgl(container, load)).resolves.toBe(false)
    expect(load).not.toHaveBeenCalled()
  })

  it('does not start a second experience for the canvas already running', async () => {
    document.body.innerHTML = '<canvas id="webgl" data-world="World_01"></canvas>'
    const runExperience = vi.fn()
    const load = vi.fn().mockResolvedValue({ runExperience })

    await startWebgl(document, load)
    await expect(startWebgl(document, load)).resolves.toBe(true)

    expect(runExperience).toHaveBeenCalledOnce()
  })
})

describe('stopWebgl', () => {
  beforeEach(() => {
    stopWebgl()
    document.body.innerHTML = '<canvas id="webgl" data-world="World_01"></canvas>'
  })

  it('calls the stop handle runExperience returned, once', async () => {
    const stop = vi.fn()
    const load = vi.fn().mockResolvedValue({ runExperience: vi.fn(() => stop) })
    await startWebgl(document, load)

    expect(stopWebgl()).toBe(true)
    expect(stopWebgl()).toBe(false)
    expect(stop).toHaveBeenCalledOnce()
  })

  it('is a no-op when nothing is running', () => {
    expect(stopWebgl()).toBe(false)
  })

  it('lets a later start run the experience again', async () => {
    const runExperience = vi.fn(() => vi.fn())
    const load = vi.fn().mockResolvedValue({ runExperience })
    await startWebgl(document, load)
    stopWebgl()

    document.body.innerHTML = '<canvas id="webgl" data-world="World_01"></canvas>'
    await startWebgl(document, load)

    expect(runExperience).toHaveBeenCalledTimes(2)
  })

  it('cancels a start whose experience chunk is still loading', async () => {
    let resolveLoad
    const runExperience = vi.fn(() => vi.fn())
    const load = vi.fn(() => new Promise((resolve) => { resolveLoad = resolve }))
    const started = startWebgl(document, load)

    stopWebgl()
    resolveLoad({ runExperience })

    await expect(started).resolves.toBe(false)
    expect(runExperience).not.toHaveBeenCalled()
  })
})
