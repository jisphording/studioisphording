// Tests for scripts/media/paths.mjs — the derivative naming scheme and its
// inverse. Pure string logic; touches no filesystem.

import { describe, it, expect } from 'vitest'
import {
  MEDIA_DIR,
  derivativeFile,
  derivativeName,
  derivativeUrlPath,
  formatExtension,
  manifestUrlPath,
  parseDerivativeName,
  stripExtension
} from '../../../scripts/media/paths.mjs'

describe('derivativeName', () => {
  it('follows <dir>/<basename>.<width>.<hash>.<ext>', () => {
    expect(derivativeName('projects/01-a/a-00_keyvisual.jpg', 800, 'a1b2c3d4', 'avif'))
      .toBe('projects/01-a/a-00_keyvisual.800.a1b2c3d4.avif')
  })

  it('maps the jpeg format to the conventional .jpg extension', () => {
    expect(derivativeName('home/landing_reel.jpg', 1200, 'deadbeef', 'jpeg'))
      .toBe('home/landing_reel.1200.deadbeef.jpg')
    expect(formatExtension('jpeg')).toBe('jpg')
  })

  it('keeps a master at the content root flat', () => {
    expect(derivativeName('cover.jpg', 480, 'abc123', 'webp')).toBe('cover.480.abc123.webp')
  })

  it('strips only the final extension, keeping inner dots', () => {
    expect(stripExtension('reel.v2.jpg')).toBe('reel.v2')
    expect(derivativeName('home/reel.v2.jpg', 480, 'abc123', 'webp')).toBe('home/reel.v2.480.abc123.webp')
  })

  it('is stable for identical input', () => {
    const args = ['projects/01-a/x.jpg', 1600, 'ffffffff', 'webp']
    expect(derivativeName(...args)).toBe(derivativeName(...args))
  })

  it('changes when the width, hash or format changes', () => {
    const name = derivativeName('a/b.jpg', 800, 'aaaaaaaa', 'avif')
    expect(derivativeName('a/b.jpg', 1200, 'aaaaaaaa', 'avif')).not.toBe(name)
    expect(derivativeName('a/b.jpg', 800, 'bbbbbbbb', 'avif')).not.toBe(name)
    expect(derivativeName('a/b.jpg', 800, 'aaaaaaaa', 'webp')).not.toBe(name)
  })

  it('rejects a bad width, hash, format or path', () => {
    expect(() => derivativeName('a/b.jpg', 0, 'abc123', 'avif')).toThrow(/positive integer/)
    expect(() => derivativeName('a/b.jpg', 800, 'XYZ', 'avif')).toThrow(/hex string/)
    expect(() => derivativeName('a/b.jpg', 800, 'abc123', 'jxl')).toThrow(/unsupported format/)
    expect(() => derivativeName('', 800, 'abc123', 'avif')).toThrow(/master path is required/)
  })
})

describe('urls and files', () => {
  it('places the url below assets/media, with no leading slash', () => {
    const url = derivativeUrlPath('home/landing_reel.jpg', 800, 'abc123', 'avif')

    expect(url).toBe('assets/media/home/landing_reel.800.abc123.avif')
    expect(url.startsWith(MEDIA_DIR)).toBe(true)
    expect(url.startsWith('/')).toBe(false)
  })

  it('places the file below the given media root', () => {
    expect(derivativeFile('/tmp/media', 'home/a.jpg', 480, 'abc123', 'webp'))
      .toBe('/tmp/media/home/a.480.abc123.webp')
  })

  it('points the manifest at assets/media/manifest.json', () => {
    expect(manifestUrlPath()).toBe('assets/media/manifest.json')
  })
})

describe('parseDerivativeName', () => {
  it('round-trips a generated name', () => {
    const name = derivativeName('projects/01-a/a-00_keyvisual.jpg', 1600, 'a1b2c3d4', 'jpeg')

    expect(parseDerivativeName(name)).toEqual({
      dir: 'projects/01-a',
      base: 'a-00_keyvisual',
      width: 1600,
      hash: 'a1b2c3d4',
      format: 'jpeg'
    })
  })

  it('round-trips a name with inner dots and one at the root', () => {
    expect(parseDerivativeName(derivativeName('home/reel.v2.jpg', 800, 'abc123', 'avif')).base).toBe('reel.v2')
    expect(parseDerivativeName(derivativeName('cover.jpg', 480, 'abc123', 'webp')).dir).toBe('')
  })

  it('returns null for anything that is not a derivative', () => {
    expect(parseDerivativeName('home/landing_reel.jpg')).toBe(null)
    expect(parseDerivativeName('home/a.800.ZZZZ.avif')).toBe(null)
    expect(parseDerivativeName('home/a.0.abc123.avif')).toBe(null)
    expect(parseDerivativeName('home/a.800.abc123.jxl')).toBe(null)
    expect(parseDerivativeName('manifest.json')).toBe(null)
    expect(parseDerivativeName('')).toBe(null)
  })
})
