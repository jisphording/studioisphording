// @vitest-environment jsdom
//
// Tests for dev/js/three/utils/Sizes.mjs: it tracks the canvas size through a
// window resize listener, and destroy() removes that listener so a torn-down
// Experience stops reacting to resizes.

import { describe, it, expect, vi } from 'vitest'
import { Sizes } from '../../../../dev/js/three/utils/Sizes.mjs'

function makeCanvas() {
  const parent = document.createElement('div')
  const canvas = document.createElement('canvas')
  parent.appendChild(canvas)
  Object.defineProperty(parent, 'offsetWidth', { value: 800, configurable: true })
  Object.defineProperty(parent, 'offsetHeight', { value: 600, configurable: true })
  return canvas
}

describe('Sizes', () => {
  it('registers a passive window resize listener that re-measures and triggers resize', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const sizes = new Sizes(makeCanvas())
    const resize = vi.fn()
    sizes.on('resize', resize)

    expect(add).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true })
    window.dispatchEvent(new Event('resize'))

    expect(resize).toHaveBeenCalledOnce()
    expect(sizes.width).toBe(800)
    expect(sizes.height).toBe(600)
    sizes.destroy?.()
  })

  it('destroy() removes the resize listener', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const sizes = new Sizes(makeCanvas())
    const resize = vi.fn()
    sizes.on('resize', resize)

    sizes.destroy()
    window.dispatchEvent(new Event('resize'))

    const listener = add.mock.calls.find((call) => call[0] === 'resize')[1]
    expect(remove).toHaveBeenCalledWith('resize', listener)
    expect(resize).not.toHaveBeenCalled()
  })

  it('destroy() is idempotent', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const sizes = new Sizes(makeCanvas())
    sizes.destroy()

    expect(() => sizes.destroy()).not.toThrow()
    expect(remove.mock.calls.filter((call) => call[0] === 'resize')).toHaveLength(1)
  })
})
