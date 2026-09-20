// @vitest-environment jsdom
//
// Pins the DOM-state helpers in dev/js/animation/barba/pageState.mjs.

import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('../../../../dev/js/animation/animGsap.mjs', () => ({ animGsap: vi.fn() }))
import {
  prepareNewPage,
  pinScrollToTop,
  syncPageClass,
  resetPageElements,
  addTransitionClasses,
  removeTransitionClasses,
  assertSingleContainer
} from '../../../../dev/js/animation/barba/pageState.mjs'

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.className = ''
  delete window.barba
  vi.restoreAllMocks()
})

describe('resetPageElements', () => {
  it('scrolls to 0 and clears parallax transforms and showreel top', () => {
    document.body.innerHTML = `
      <div class="showreel" style="top: 40%"></div>
      <div class="parallax__layer--title" style="transform: translateY(9px); opacity: 0.2"></div>
      <div class="parallax__layer--back" style="transform: translateY(5px)"></div>`
    window.scrollTo = vi.fn()
    resetPageElements()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.querySelector('.showreel').style.top).toBe('0%')
    const title = document.querySelector('.parallax__layer--title')
    expect(title.style.transform).toBe('')
    expect(title.style.opacity).toBe('1')
    expect(document.querySelector('.parallax__layer--back').style.transform).toBe('')
  })

  it('tolerates pages without those elements', () => {
    window.scrollTo = vi.fn()
    expect(() => resetPageElements()).not.toThrow()
  })
})

describe('transition classes', () => {
  it('toggles is-transitioning on <html> and is-animating on the barba wrapper', () => {
    const wrapper = document.createElement('div')
    window.barba = { wrapper }
    addTransitionClasses()
    expect(document.documentElement.classList.contains('is-transitioning')).toBe(true)
    expect(wrapper.classList.contains('is-animating')).toBe(true)
    removeTransitionClasses()
    expect(document.documentElement.classList.contains('is-transitioning')).toBe(false)
    expect(wrapper.classList.contains('is-animating')).toBe(false)
  })

  it('works without a barba wrapper', () => {
    addTransitionClasses()
    expect(document.documentElement.classList.contains('is-transitioning')).toBe(true)
    removeTransitionClasses()
    expect(document.documentElement.classList.contains('is-transitioning')).toBe(false)
  })
})

describe('assertSingleContainer', () => {
  const containers = n => {
    document.body.innerHTML = '<div data-barba="container"></div>'.repeat(n)
  }

  it('is silent when exactly one container exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    containers(1)
    assertSingleContainer()
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([0, 2])('warns when %i containers exist', n => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    containers(n)
    assertSingleContainer()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain(`found ${n}`)
  })
})

describe('prepareNewPage', () => {
  it('leaves the new page at the top even when ScrollTrigger.refresh() restores the old scroll', async () => {
    vi.stubGlobal('requestAnimationFrame', cb => cb())
    let y = 6000
    window.scrollTo = vi.fn((_x, top) => { y = top })
    let remembered = 6000
    const ScrollTrigger = {
      clearScrollMemory: vi.fn(() => { remembered = 0 }),
      // Mimics GSAP: refresh() scrolls back to whatever it remembered
      refresh: vi.fn(() => { window.scrollTo(0, remembered) })
    }
    await prepareNewPage(ScrollTrigger)
    expect(ScrollTrigger.refresh).toHaveBeenCalled()
    expect(y).toBe(0)
    vi.unstubAllGlobals()
  })

  it('still pins to the top when clearScrollMemory is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', cb => cb())
    let y = 6000
    window.scrollTo = vi.fn((_x, top) => { y = top })
    const ScrollTrigger = { refresh: vi.fn(() => { window.scrollTo(0, 6000) }) }
    await prepareNewPage(ScrollTrigger)
    expect(y).toBe(0)
    vi.unstubAllGlobals()
  })
})

describe('pinScrollToTop', () => {
  it('re-pins to the top on every refresh until released', () => {
    let y = 0
    window.scrollTo = vi.fn((_x, top) => { y = top })
    const listeners = new Set()
    const ScrollTrigger = {
      addEventListener: (_t, fn) => listeners.add(fn),
      removeEventListener: (_t, fn) => listeners.delete(fn)
    }
    const release = pinScrollToTop(ScrollTrigger)
    for (let i = 0; i < 2; i++) {
      y = 4107 // a queued refresh restores the old position
      listeners.forEach(fn => fn())
      expect(y).toBe(0)
    }
    release()
    expect(listeners.size).toBe(0)
  })

  it('tolerates a ScrollTrigger without event support', () => {
    expect(() => pinScrollToTop({})()).not.toThrow()
  })
})

describe('syncPageClass', () => {
  const page = cls => `<!DOCTYPE html><html lang="en" class="${cls}"><head></head><body></body></html>`

  it('replaces the origin page--* class with the destination one and keeps other classes', () => {
    document.documentElement.className = 'page--about lightmode js-ready is-transitioning'
    syncPageClass(page('page--home lightmode is-loading'))
    const cl = document.documentElement.classList
    expect(cl.contains('page--home')).toBe(true)
    expect(cl.contains('page--about')).toBe(false)
    expect(cl.contains('js-ready')).toBe(true)
    expect(cl.contains('is-transitioning')).toBe(true)
    expect(cl.contains('is-loading')).toBe(false)
  })

  it('does not overwrite a user-chosen darkmode with the destination lightmode', () => {
    document.documentElement.className = 'page--home darkmode'
    syncPageClass(page('page--about lightmode is-loading'))
    expect(document.documentElement.classList.contains('darkmode')).toBe(true)
    expect(document.documentElement.classList.contains('lightmode')).toBe(false)
  })

  it('ignores missing or non-string html', () => {
    document.documentElement.className = 'page--home'
    syncPageClass(undefined)
    syncPageClass('<html><body></body></html>')
    expect(document.documentElement.classList.contains('page--home')).toBe(false)
  })
})
