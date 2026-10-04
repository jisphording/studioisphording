// @vitest-environment jsdom
//
// Tests for dev/js/three/utils/Time.mjs: the animation loop ticks through
// requestAnimationFrame, and destroy() cancels the pending frame so a torn-down
// Experience (leaving a WebGL page through Barba) leaves no loop behind.
// requestAnimationFrame is stubbed with a manual frame queue.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Time } from '../../../../dev/js/three/utils/Time.mjs'

let frames
let nextId

/** Run every queued frame callback once (callbacks queued meanwhile wait). */
function runFrame() {
  const pending = [...frames.entries()]
  frames.clear()
  pending.forEach(([, callback]) => callback())
}

describe('Time', () => {
  beforeEach(() => {
    frames = new Map()
    nextId = 0
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      nextId += 1
      frames.set(nextId, callback)
      return nextId
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => frames.delete(id)))
  })

  it('loops via requestAnimationFrame, ticking once per frame', () => {
    const time = new Time()
    const tick = vi.fn()
    time.on('tick', tick)

    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    runFrame()
    runFrame()

    expect(tick).toHaveBeenCalledTimes(2)
    expect(frames.size).toBe(1)
  })

  it('destroy() cancels the pending frame and stops ticking', () => {
    const time = new Time()
    const tick = vi.fn()
    time.on('tick', tick)
    runFrame()

    time.destroy()
    runFrame()

    expect(cancelAnimationFrame).toHaveBeenCalledOnce()
    expect(frames.size).toBe(0)
    expect(tick).toHaveBeenCalledOnce()
  })

  it('destroy() is idempotent', () => {
    const time = new Time()
    time.destroy()

    expect(() => time.destroy()).not.toThrow()
    expect(cancelAnimationFrame).toHaveBeenCalledOnce()
  })
})
