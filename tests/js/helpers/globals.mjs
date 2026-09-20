// Window globals the front-end reads but tests must not load from a CDN.
//
// GSAP, Barba and ScrollTrigger arrive as window globals in production. Tests
// install minimal stand-ins and remove them again:
//
//   const globals = installFakeGlobals({ reducedMotion: false })
//   // ... exercise code that reads window.gsap / matchMedia ...
//   globals.restore()
//
// installFakeGlobals uses vi.stubGlobal where a real global exists (jsdom's
// matchMedia) and plain assignment otherwise, and restore() undoes both. With
// `restoreMocks`/`unstubGlobals` on in vitest.config.js, calling restore() in
// an afterEach is belt-and-braces rather than strictly required.

import { vi } from 'vitest'

/** A gsap stand-in: delayedCall runs through setTimeout so fake timers drive it. */
export function makeFakeGsap() {
  const gsap = {
    delayedCall: vi.fn((seconds, fn) => {
      const id = setTimeout(fn, seconds * 1000)
      return { kill: () => clearTimeout(id) }
    }),
    set: vi.fn(),
    to: vi.fn(() => makeFakeTimeline()),
    timeline: vi.fn(() => makeFakeTimeline())
  }
  return gsap
}

/**
 * A chainable timeline stand-in. set()/to() return `this`, and it is awaitable
 * (then) so `await gsap.timeline().to(...)` resolves immediately, as the real
 * GSAP timeline promise does once the tween finishes.
 */
export function makeFakeTimeline() {
  const timeline = {
    calls: [],
    set(...args) { this.calls.push(['set', ...args]); return this },
    to(...args) { this.calls.push(['to', ...args]); return this },
    then(onFulfilled) { return Promise.resolve(this).then(onFulfilled) }
  }
  return timeline
}

/**
 * Install fake window globals.
 * @param {Object} [opts]
 * @param {boolean} [opts.reducedMotion=false] - what matchMedia reports for
 *   '(prefers-reduced-motion: reduce)'.
 * @param {boolean} [opts.gsap=true] - install window.gsap.
 * @returns {{gsap: Object|null, matchMedia: Function, restore: Function}}
 */
export function installFakeGlobals({ reducedMotion = false, gsap = true } = {}) {
  const hadGsap = 'gsap' in globalThis
  const previousGsap = globalThis.gsap

  const fakeGsap = gsap ? makeFakeGsap() : null
  if (gsap) {
    globalThis.gsap = fakeGsap
  }

  const matchMedia = vi.fn(query => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query) ? reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
  vi.stubGlobal('matchMedia', matchMedia)

  return {
    gsap: fakeGsap,
    matchMedia,
    restore() {
      vi.unstubAllGlobals()
      if (hadGsap) {
        globalThis.gsap = previousGsap
      } else {
        delete globalThis.gsap
      }
    }
  }
}
