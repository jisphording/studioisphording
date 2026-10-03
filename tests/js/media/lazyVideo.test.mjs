// @vitest-environment jsdom
//
// dev/js/media/lazyVideo.mjs: deferred start for loading="lazy" videos where
// the browser lacks native support; a no-op where it has it.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import lazyVideo from '../../../dev/js/media/lazyVideo.mjs'

const MARKUP = `
  <video id="hero" autoplay><source src="/hero.webm" type="video/webm"></video>
  <video id="lazy" loading="lazy" autoplay muted>
    <source src="/a.webm" type="video/webm"><source src="/a.mp4" type="video/mp4">
  </video>`

let observers
let play

beforeEach(() => {
  observers = []
  play = vi.fn(() => Promise.resolve())
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; this.observed = []; observers.push(this) }
    observe(el) { this.observed.push(el) }
    unobserve(el) { this.observed = this.observed.filter((o) => o !== el) }
  })
  HTMLMediaElement.prototype.load = vi.fn()
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.play = play
  document.body.innerHTML = MARKUP
})

afterEach(() => {
  delete HTMLMediaElement.prototype.loading
})

describe('lazyVideo without native support', () => {
  it('detaches sources and autoplay from lazy videos only', () => {
    lazyVideo()
    const lazy = document.getElementById('lazy')
    expect(lazy.hasAttribute('autoplay')).toBe(false)
    expect(lazy.querySelector('source').hasAttribute('src')).toBe(false)
    expect(lazy.querySelector('source').dataset.src).toBe('/a.webm')
    const hero = document.getElementById('hero')
    expect(hero.hasAttribute('autoplay')).toBe(true)
    expect(hero.querySelector('source').getAttribute('src')).toBe('/hero.webm')
    expect(observers[0].observed).toEqual([lazy])
  })

  it('starts the video only when it intersects', () => {
    lazyVideo()
    const lazy = document.getElementById('lazy')
    const [observer] = observers

    observer.callback([{ target: lazy, isIntersecting: false }])
    expect(play).not.toHaveBeenCalled()

    observer.callback([{ target: lazy, isIntersecting: true }])
    expect(play).toHaveBeenCalledTimes(1)
    expect(lazy.querySelector('source').getAttribute('src')).toBe('/a.webm')
    expect(lazy.querySelectorAll('source')[1].getAttribute('src')).toBe('/a.mp4')
    expect(lazy.hasAttribute('autoplay')).toBe(true)
    expect(observer.observed).toEqual([])
  })

  it('does not defer the same video twice', () => {
    lazyVideo()
    expect(lazyVideo()).toBeNull()
  })
})

describe('lazyVideo with native support', () => {
  it('is a no-op', () => {
    HTMLMediaElement.prototype.loading = 'auto'
    expect(lazyVideo()).toBeNull()
    expect(observers).toHaveLength(0)
    const lazy = document.getElementById('lazy')
    expect(lazy.hasAttribute('autoplay')).toBe(true)
    expect(lazy.querySelector('source').getAttribute('src')).toBe('/a.webm')
  })
})
