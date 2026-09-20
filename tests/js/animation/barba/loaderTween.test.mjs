// @vitest-environment jsdom
//
// Pins the loader wipe/cross-fade tweens in dev/js/animation/barba/loaderTween.mjs
// against a recording fake gsap: every timeline/set/to call captures its args.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { animateLoaderIn, animateLoaderOut } from '../../../../dev/js/animation/barba/loaderTween.mjs'
import { REVEAL_DURATION_S, CROSSFADE_DURATION_S } from '../../../../dev/js/animation/barba/timing.mjs'

function makeGsap() {
  const calls = []
  const timeline = {
    set(target, vars) { calls.push({ fn: 'set', target, vars }); return timeline },
    to(target, vars) { calls.push({ fn: 'to', target, vars }); return timeline }
  }
  return {
    calls,
    timeline: () => timeline,
    set: (target, vars) => calls.push({ fn: 'set', target, vars }),
    to: (target, vars) => { calls.push({ fn: 'to', target, vars }); return vars }
  }
}

function stubReducedMotion(reduce) {
  window.matchMedia = vi.fn(() => ({ matches: reduce }))
}

afterEach(() => {
  delete window.matchMedia
  vi.restoreAllMocks()
})

describe('animateLoaderOut', () => {
  it('reveals over REVEAL_DURATION_S and resets to the hidden wipe state', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    stubReducedMotion(false)
    const gsap = makeGsap()
    const loader = {}
    animateLoaderOut(gsap, loader)
    const to = gsap.calls.find(c => c.fn === 'to')
    expect(to.target).toBe(loader)
    expect(to.vars.duration).toBe(REVEAL_DURATION_S)
    expect(to.vars.scaleX).toBe(0)
    to.vars.onComplete()
    const reset = gsap.calls.find(c => c.fn === 'set')
    expect(reset.vars).toEqual({ scaleX: 0, xPercent: -5, transformOrigin: 'left center' })
  })

  it('cross-fades over CROSSFADE_DURATION_S with autoAlpha under reduced motion', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    stubReducedMotion(true)
    const gsap = makeGsap()
    animateLoaderOut(gsap, {})
    const to = gsap.calls.find(c => c.fn === 'to')
    expect(to.vars.duration).toBe(CROSSFADE_DURATION_S)
    expect(to.vars.autoAlpha).toBe(0)
    expect(to.vars.scaleX).toBeUndefined()
    to.vars.onComplete()
    expect(gsap.calls.find(c => c.fn === 'set').vars).toEqual({
      autoAlpha: 0, scaleX: 0, xPercent: -5, transformOrigin: 'left center'
    })
  })
})

describe('animateLoaderIn', () => {
  it('wipes in from the left over 0.8s', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    stubReducedMotion(false)
    const gsap = makeGsap()
    animateLoaderIn(gsap, {})
    expect(gsap.calls[0].vars).toMatchObject({ autoAlpha: 1, scaleX: 0, xPercent: -5, transformOrigin: 'left center' })
    expect(gsap.calls[1].vars).toMatchObject({ duration: 0.8, scaleX: 1, xPercent: 0 })
  })

  it('cross-fades over CROSSFADE_DURATION_S with autoAlpha under reduced motion', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    stubReducedMotion(true)
    const gsap = makeGsap()
    animateLoaderIn(gsap, {})
    expect(gsap.calls[0].vars).toMatchObject({ autoAlpha: 0, scaleX: 1, transformOrigin: 'center center' })
    expect(gsap.calls[1].vars).toMatchObject({ duration: CROSSFADE_DURATION_S, autoAlpha: 1 })
  })
})
