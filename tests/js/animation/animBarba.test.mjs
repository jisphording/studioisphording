// @vitest-environment jsdom
//
// Characterization tests for the readiness gate in dev/js/animation/animBarba.mjs.
//
// waitForPageReady is the one piece of the transition that must never hang and
// never reject: it holds the loader cover until the incoming container is
// presentable, bounded by a timeout. These tests pin exactly that contract, so
// phase 5 can split the module without changing it.
//
// animGsap.mjs is imported by animBarba.mjs but only declares a function — no
// import-time side effects — so it needs no vi.mock. Barba/GSAP/ScrollTrigger
// are never reached here: waitForPageReady touches none of them.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForPageReady } from '../../../dev/js/animation/animBarba.mjs'

// Flush pending microtasks so a settled promise's .then has run. The gate chains
// Promise.all -> race -> catch -> finally, each of which costs a tick or two, so
// this is deliberately generous rather than exact.
async function flush(times = 25) {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

/** Track whether a promise has settled, without awaiting it. */
function track(promise) {
  const state = { settled: false, rejected: false }
  promise.then(
    () => { state.settled = true },
    () => { state.settled = true; state.rejected = true }
  )
  return state
}

/** An <img> that the gate will consider in-viewport and not yet complete. */
function inViewportImage(decodeResult) {
  const img = document.createElement('img')
  img.getBoundingClientRect = () => ({
    top: 10, left: 10, bottom: 210, right: 210, width: 200, height: 200, x: 10, y: 10
  })
  Object.defineProperty(img, 'complete', { value: false, configurable: true })
  img.decode = vi.fn(() => decodeResult)
  return img
}

/** An <img> that sits well below the fold. */
function offscreenImage() {
  const img = document.createElement('img')
  img.getBoundingClientRect = () => ({
    top: 5000, left: 10, bottom: 5200, right: 210, width: 200, height: 200, x: 10, y: 5000
  })
  Object.defineProperty(img, 'complete', { value: false, configurable: true })
  img.decode = vi.fn(() => Promise.resolve())
  return img
}

/** An autoplaying <video> with the given readyState. */
function autoplayVideo(readyState = 0) {
  const video = document.createElement('video')
  video.setAttribute('autoplay', '')
  Object.defineProperty(video, 'readyState', { value: readyState, configurable: true })
  return video
}

describe('waitForPageReady', () => {
  let container

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    container.setAttribute('data-barba', 'container')
    document.body.appendChild(container)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('resolves promptly for an empty container, without waiting out the timeout', async () => {
    const state = track(waitForPageReady(container, { timeout: 3000 }))

    await flush()

    expect(state.settled).toBe(true)
    expect(state.rejected).toBe(false)
  })

  it('ignores images that do not intersect the viewport', async () => {
    const img = offscreenImage()
    container.appendChild(img)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    expect(img.decode).not.toHaveBeenCalled()
    expect(state.settled).toBe(true)
  })

  it('waits on decode() for an in-viewport, incomplete image', async () => {
    let resolveDecode
    const img = inViewportImage(new Promise(resolve => { resolveDecode = resolve }))
    container.appendChild(img)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    expect(img.decode).toHaveBeenCalledTimes(1)
    expect(state.settled).toBe(false)

    resolveDecode()
    await flush()

    expect(state.settled).toBe(true)
  })

  it('still resolves when decode() rejects', async () => {
    const img = inViewportImage(Promise.reject(new Error('404')))
    container.appendChild(img)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    expect(state.settled).toBe(true)
    expect(state.rejected).toBe(false)
  })

  it('does not wait on an autoplay video that already has a frame', async () => {
    const video = autoplayVideo(4)
    const addSpy = vi.spyOn(video, 'addEventListener')
    container.appendChild(video)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    expect(addSpy).not.toHaveBeenCalled()
    expect(state.settled).toBe(true)
  })

  it('resolves when a stalled autoplay video dispatches canplay', async () => {
    const video = autoplayVideo(0)
    container.appendChild(video)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()
    expect(state.settled).toBe(false)

    video.dispatchEvent(new Event('canplay'))
    await flush()

    expect(state.settled).toBe(true)
  })

  it('also accepts loadeddata as the video readiness signal', async () => {
    const video = autoplayVideo(0)
    container.appendChild(video)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    video.dispatchEvent(new Event('loadeddata'))
    await flush()

    expect(state.settled).toBe(true)
  })

  it('resolves at the timeout when the video never becomes ready, and removes its listeners', async () => {
    const video = autoplayVideo(0)
    const removeSpy = vi.spyOn(video, 'removeEventListener')
    container.appendChild(video)

    const state = track(waitForPageReady(container, { timeout: 3000 }))

    await vi.advanceTimersByTimeAsync(2999)
    expect(state.settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await flush()

    expect(state.settled).toBe(true)
    expect(state.rejected).toBe(false)
    expect(removeSpy.mock.calls.map(call => call[0]).sort()).toEqual(['canplay', 'loadeddata'])
  })

  it('defaults the timeout to 3000ms when none is given', async () => {
    container.appendChild(autoplayVideo(0))

    const state = track(waitForPageReady(container))

    await vi.advanceTimersByTimeAsync(2999)
    expect(state.settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(state.settled).toBe(true)
  })

  it('resolves even when a cleanup throws on a detached node', async () => {
    const video = autoplayVideo(0)
    vi.spyOn(video, 'removeEventListener').mockImplementation(() => {
      throw new Error('detached node')
    })
    container.appendChild(video)

    const state = track(waitForPageReady(container, { timeout: 100 }))

    await vi.advanceTimersByTimeAsync(100)
    await flush()

    expect(state.settled).toBe(true)
    expect(state.rejected).toBe(false)
  })

  it('waits for the slowest signal when several are pending', async () => {
    let resolveDecode
    const img = inViewportImage(new Promise(resolve => { resolveDecode = resolve }))
    const video = autoplayVideo(0)
    container.append(img, video)

    const state = track(waitForPageReady(container, { timeout: 3000 }))
    await flush()

    video.dispatchEvent(new Event('canplay'))
    await flush()
    expect(state.settled).toBe(false)

    resolveDecode()
    await flush()
    expect(state.settled).toBe(true)
  })
})
