// @vitest-environment jsdom
//
// Tests for dev/js/three/projects/moodboard/ImageZoom.mjs: lightbox display,
// close button glyph (×), and close paths (button click, overlay click, Escape).
// Canvas, camera, panControls and the mesh are mocked. The AbortController
// detaches listeners on close, so Escape after close does not re-enable.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImageZoom } from '../../../../../dev/js/three/projects/moodboard/ImageZoom.mjs'

describe('ImageZoom', () => {
  let imageZoom
  let canvas
  let camera
  let scene
  let panControls
  let mesh

  beforeEach(() => {
    // Create a fake canvas element
    canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 768
    document.body.appendChild(canvas)

    // Mock camera
    camera = {
      instance: { position: { set: vi.fn() } }
    }

    // Mock scene
    scene = {
      add: vi.fn(),
      remove: vi.fn()
    }

    // Mock panControls
    panControls = {
      disable: vi.fn(),
      enable: vi.fn()
    }

    // Mock mesh with material.map.image structure
    mesh = {
      material: {
        map: {
          image: {
            src: '/media/a-b_c.jpg'
          }
        }
      },
      scale: { set: vi.fn(), lerp: vi.fn() },
      targetScale: { set: vi.fn() }
    }

    imageZoom = new ImageZoom(camera, scene, canvas, [mesh], panControls)
  })

  afterEach(() => {
    // Remove canvas from body
    if (canvas && canvas.parentNode === document.body) {
      document.body.removeChild(canvas)
    }
    // Clear any remaining DOM to clean up
    document.body.innerHTML = ''
  })

  it('creates a lightbox overlay with role=dialog', () => {
    imageZoom.showLightbox(mesh)

    const overlay = document.querySelector('.lightbox-overlay')
    expect(overlay).toBeDefined()
    expect(overlay.getAttribute('role')).toBe('dialog')
    expect(overlay.getAttribute('aria-modal')).toBe('true')
  })

  it('creates a close button with × glyph and aria-label', () => {
    imageZoom.showLightbox(mesh)

    const closeButton = document.querySelector('.lightbox-close')
    expect(closeButton).toBeDefined()
    expect(closeButton.textContent).toBe('×')
    expect(closeButton.getAttribute('aria-label')).toBe('Close image lightbox')
    // Verify no child elements (text is direct textContent)
    expect(closeButton.children.length).toBe(0)
  })

  it('derives alt text from filename, replacing - and _ with spaces', () => {
    imageZoom.showLightbox(mesh)

    const img = document.querySelector('.lightbox-image')
    expect(img).toBeDefined()
    expect(img.getAttribute('alt')).toBe('a b c')
  })

  it('disables panControls when showing lightbox', () => {
    imageZoom.showLightbox(mesh)

    expect(panControls.disable).toHaveBeenCalledOnce()
  })

  it('closes lightbox and re-enables panControls on close button click', () => {
    imageZoom.showLightbox(mesh)

    const closeButton = document.querySelector('.lightbox-close')
    closeButton.click()

    expect(document.querySelector('.lightbox-overlay')).toBeNull()
    expect(panControls.enable).toHaveBeenCalledOnce()
  })

  it('closes lightbox and re-enables panControls on overlay click', () => {
    imageZoom.showLightbox(mesh)

    const overlay = document.querySelector('.lightbox-overlay')
    overlay.click()

    expect(document.querySelector('.lightbox-overlay')).toBeNull()
    expect(panControls.enable).toHaveBeenCalledOnce()
  })

  it('closes lightbox and re-enables panControls on Escape', async () => {
    imageZoom.showLightbox(mesh)

    // Simulate Escape key press via native event
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })
    await new Promise(resolve => {
      document.addEventListener('keydown', () => resolve(), { once: true })
      document.dispatchEvent(event)
    })

    expect(document.querySelector('.lightbox-overlay')).toBeNull()
    expect(panControls.enable).toHaveBeenCalledOnce()
  })

  it('detaches listeners after close, so Escape does not re-enable', async () => {
    imageZoom.showLightbox(mesh)

    const closeButton = document.querySelector('.lightbox-close')
    closeButton.click()

    expect(panControls.enable).toHaveBeenCalledOnce()

    // Try to trigger Escape again - listener should be detached
    panControls.enable.mockClear()
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    // Small delay to ensure no async handlers run
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(panControls.enable).not.toHaveBeenCalled()
  })
})
