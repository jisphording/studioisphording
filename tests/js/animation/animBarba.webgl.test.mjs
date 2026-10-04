// @vitest-environment jsdom
//
// The WebGL lifecycle across Barba page transitions (dev/js/animation/animBarba.mjs):
// leaving a container that holds the #webgl canvas tears the running Experience
// down, and entering one starts it for the new canvas. startWebgl.mjs is mocked,
// so nothing here imports three; Barba, GSAP and ScrollTrigger are fakes that
// record the transition and hooks animBarba() registers.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installFakeGlobals } from '../helpers/globals.mjs'

vi.mock('../../../dev/js/utils/startWebgl.mjs', () => ({
  startWebgl: vi.fn(() => Promise.resolve(true)),
  stopWebgl: vi.fn(() => true)
}))

const { startWebgl, stopWebgl } = await import('../../../dev/js/utils/startWebgl.mjs')
const { animBarba } = await import('../../../dev/js/animation/animBarba.mjs')

function makeFakeBarba() {
  const hook = () => vi.fn()
  return {
    init: vi.fn(),
    hooks: { before: hook(), enter: hook(), afterEnter: hook(), after: hook() }
  }
}

// An awaitable timeline that settles to undefined. (makeFakeTimeline resolves
// to itself, which a real `await` keeps re-resolving forever.)
function awaitableTimeline() {
  const timeline = {
    set() { return timeline },
    to() { return timeline },
    then(onFulfilled) { return Promise.resolve().then(onFulfilled) }
  }
  return timeline
}

function container(html) {
  const el = document.createElement('div')
  el.setAttribute('data-barba', 'container')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

const WEBGL = '<canvas id="webgl" data-world="World_01"></canvas>'
const PLAIN = '<p>about</p>'

describe('animBarba WebGL lifecycle', () => {
  let globals
  let barba

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    globals = installFakeGlobals()
    globals.gsap.timeline = vi.fn(awaitableTimeline)
    barba = makeFakeBarba()
    window.barba = barba
    window.ScrollTrigger = { killAll: vi.fn() }
    document.body.innerHTML = '<div class="loadingScreen"></div>'
    startWebgl.mockClear()
    stopWebgl.mockClear()
    animBarba()
  })

  afterEach(() => {
    globals.restore()
    delete window.barba
    delete window.ScrollTrigger
    document.body.innerHTML = ''
  })

  const transition = () => barba.init.mock.calls[0][0].transitions[0]
  const afterEnter = () => barba.hooks.afterEnter.mock.calls.at(-1)[0]

  async function leave(html) {
    await transition().leave({ current: { url: { href: '/de/from' }, container: container(html) } })
  }

  function enter(html) {
    const next = container(html)
    afterEnter()({ next: { url: { href: '/de/to' }, container: next } })
    return next
  }

  it('stops the experience once when leaving a #webgl container', async () => {
    await leave(WEBGL)

    expect(stopWebgl).toHaveBeenCalledOnce()
  })

  it('starts the experience for the new container when entering a #webgl one', () => {
    const next = enter(WEBGL)

    expect(startWebgl).toHaveBeenCalledOnce()
    expect(startWebgl).toHaveBeenCalledWith(next)
  })

  it('neither stops nor starts for a non-WebGL to non-WebGL transition', async () => {
    await leave(PLAIN)
    enter(PLAIN)

    expect(stopWebgl).not.toHaveBeenCalled()
    expect(startWebgl).not.toHaveBeenCalled()
  })
})
