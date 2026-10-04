// Tests for scripts/media/config.mjs — the media config's validation and its
// most-specific-glob-wins resolver.
//
// Pure logic plus one temp-directory round trip for loadConfig(). Never reads
// app/content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  SUPPORTED_FORMATS,
  encoderSettings,
  globSpecificity,
  loadConfig,
  matchesGlob,
  resolveSettings,
  validateConfig
} from '../../../scripts/media/config.mjs'

const base = () => ({
  default: { target: 86, widths: [480, 800], formats: ['avif', 'webp', 'jpeg'] },
  overrides: []
})

describe('globs', () => {
  it('matches `*` within one path segment only', () => {
    expect(matchesGlob('home/*.jpg', 'home/landing_reel.jpg')).toBe(true)
    expect(matchesGlob('home/*.jpg', 'home/nested/landing_reel.jpg')).toBe(false)
  })

  it('matches `**` across path segments', () => {
    expect(matchesGlob('projects/**/*_keyvisual*', 'projects/01-a/a-00_keyvisual.jpg')).toBe(true)
    expect(matchesGlob('projects/**', 'projects/01-a/deep/b.jpg')).toBe(true)
  })

  it('anchors both ends', () => {
    expect(matchesGlob('home/landing_reel.jpg', 'app/home/landing_reel.jpg')).toBe(false)
    expect(matchesGlob('home/landing_reel.jpg', 'home/landing_reel.jpg.bak')).toBe(false)
  })

  it('treats dots as literals, not regex wildcards', () => {
    expect(matchesGlob('home/a.jpg', 'home/axjpg')).toBe(false)
  })

  it('scores specificity as the count of literal characters', () => {
    expect(globSpecificity('home/landing_reel.jpg')).toBe(21)
    expect(globSpecificity('projects/**')).toBe(9)
    expect(globSpecificity('projects/**/*_keyvisual*')).toBeGreaterThan(globSpecificity('projects/**'))
  })
})

describe('validateConfig', () => {
  it('accepts the repo config shape', () => {
    expect(() => validateConfig(base())).not.toThrow()
  })

  it('rejects a scalar `quality` with an explanatory error', () => {
    const config = base()
    config.overrides = [{ match: 'projects/**', quality: 75 }]

    expect(() => validateConfig(config)).toThrow(/quality.*per-format map/s)
    expect(() => validateConfig(config)).toThrow(/not comparable/)
  })

  it('rejects a scalar `quality` in the default block too', () => {
    const config = base()
    config.default.quality = 80

    expect(() => validateConfig(config)).toThrow(/per-format map/)
  })

  it('accepts a per-format `quality` map', () => {
    const config = base()
    config.overrides = [{ match: 'projects/the-quay-hotel/**', quality: { avif: 64, webp: 82 } }]

    expect(() => validateConfig(config)).not.toThrow()
  })

  it('rejects an unknown format inside `quality`', () => {
    const config = base()
    config.overrides = [{ match: 'a/**', quality: { jxl: 70 } }]

    expect(() => validateConfig(config)).toThrow(/not a supported format/)
  })

  it('rejects an out-of-range quality number', () => {
    const config = base()
    config.overrides = [{ match: 'a/**', quality: { avif: 140 } }]

    expect(() => validateConfig(config)).toThrow(/1 to 100/)
  })

  it('rejects an unknown override key rather than ignoring it', () => {
    const config = base()
    config.overrides = [{ match: 'a/**', taget: 90 }]

    expect(() => validateConfig(config)).toThrow(/unknown key `taget`/)
  })

  it('requires target, widths and formats on the default block', () => {
    for (const key of ['target', 'widths', 'formats']) {
      const config = base()
      delete config.default[key]
      expect(() => validateConfig(config)).toThrow(new RegExp(`\`${key}\` is required`))
    }
  })

  it('rejects an empty widths list and a non-integer width', () => {
    const empty = base()
    empty.default.widths = []
    expect(() => validateConfig(empty)).toThrow(/non-empty array/)

    const fractional = base()
    fractional.default.widths = [480.5]
    expect(() => validateConfig(fractional)).toThrow(/positive integers/)
  })

  it('rejects an unsupported output format', () => {
    const config = base()
    config.default.formats = ['avif', 'jxl']
    expect(() => validateConfig(config)).toThrow(/supported: avif, webp, jpeg/)
  })

  it('rejects an out-of-range target and a non-boolean eager', () => {
    const target = base()
    target.default.target = 120
    expect(() => validateConfig(target)).toThrow(/SSIMULACRA2 score/)

    const eager = base()
    eager.overrides = [{ match: 'a/**', eager: 'yes' }]
    expect(() => validateConfig(eager)).toThrow(/`eager` must be a boolean/)
  })

  it('rejects a non-positive or oversized tolerance', () => {
    for (const tolerance of [0, -1, 11, '2']) {
      const config = base()
      config.overrides = [{ match: 'a/**', tolerance }]
      expect(() => validateConfig(config)).toThrow(/`tolerance` must be a band half-width/)
    }
  })

  it('requires a non-empty match on every override', () => {
    const config = base()
    config.overrides = [{ target: 90 }]
    expect(() => validateConfig(config)).toThrow(/`match` must be a non-empty glob/)
  })

  it('rejects an unknown top-level key', () => {
    expect(() => validateConfig({ ...base(), defaults: {} })).toThrow(/unknown top-level key/)
  })
})

describe('resolveSettings', () => {
  const config = {
    default: { target: 86, widths: [480, 800, 1200], formats: ['avif', 'webp', 'jpeg'] },
    overrides: [
      { match: 'projects/**', target: 80 },
      { match: 'projects/**/*_keyvisual*', target: 90 },
      { match: 'projects/03-tonica-artigianale/**', widths: [800] },
      { match: 'home/landing_reel.jpg', target: 92, eager: true }
    ]
  }

  it('falls back to the default when nothing matches', () => {
    const resolved = resolveSettings(config, 'about/portrait.jpg')

    expect(resolved.target).toBe(86)
    expect(resolved.widths).toEqual([480, 800, 1200])
    expect(resolved.eager).toBe(false)
    expect(resolved.matched).toEqual([])
  })

  it('lets the most specific matching glob win', () => {
    const resolved = resolveSettings(config, 'projects/01-a/a-00_keyvisual.jpg')

    expect(resolved.target).toBe(90)
    expect(resolved.matched).toEqual(['projects/**', 'projects/**/*_keyvisual*'])
  })

  it('layers less specific matches underneath for fields the winner omits', () => {
    const resolved = resolveSettings(config, 'projects/03-tonica-artigianale/b-00_keyvisual.jpg')

    // widths from the project glob, target from the keyvisual glob,
    // formats from the default.
    expect(resolved.widths).toEqual([800])
    expect(resolved.target).toBe(90)
    expect(resolved.formats).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('does not leak declaration order into the result', () => {
    const reversed = { ...config, overrides: [...config.overrides].reverse() }

    expect(resolveSettings(reversed, 'projects/01-a/a-00_keyvisual.jpg').target)
      .toBe(resolveSettings(config, 'projects/01-a/a-00_keyvisual.jpg').target)
  })

  it('breaks a specificity tie by declaration order, last wins', () => {
    const tie = {
      default: base().default,
      overrides: [
        { match: 'projects/*/a.jpg', target: 70 },
        { match: 'projects/*/a.jpg', target: 71 }
      ]
    }

    expect(resolveSettings(tie, 'projects/x/a.jpg').target).toBe(71)
  })

  it('carries non-quality concerns such as eager', () => {
    expect(resolveSettings(config, 'home/landing_reel.jpg').eager).toBe(true)
    expect(resolveSettings(config, 'home/other.jpg').eager).toBe(false)
  })

  it('requires a content-relative path', () => {
    expect(() => resolveSettings(config, '')).toThrow(/content-relative path is required/)
  })
})

describe('encoderSettings', () => {
  const resolved = { target: 86, quality: { avif: 64 }, eager: true, widths: [480], formats: ['avif'] }

  it('uses the target when no raw quality is set for the format', () => {
    expect(encoderSettings(resolved, 'webp')).toEqual({ format: 'webp', mode: 'target', target: 86, tolerance: 2 })
  })

  it('carries an explicit band tolerance, which changes what the loop accepts', () => {
    expect(encoderSettings({ ...resolved, tolerance: 1 }, 'webp')).toMatchObject({ target: 86, tolerance: 1 })
  })

  it('uses the raw quality escape hatch when the format has one', () => {
    expect(encoderSettings(resolved, 'avif')).toEqual({ format: 'avif', mode: 'quality', quality: 64 })
  })

  it('ignores eager, widths and formats, which do not change an encode', () => {
    const other = { ...resolved, eager: false, widths: [2000], formats: ['avif', 'webp'] }

    expect(encoderSettings(other, 'webp')).toEqual(encoderSettings(resolved, 'webp'))
  })

  it('rejects an unsupported format', () => {
    expect(() => encoderSettings(resolved, 'jxl')).toThrow(/unsupported format/)
  })
})

describe('loadConfig', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'media-config-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('loads and validates a config file', async () => {
    const file = join(dir, 'media.config.mjs')
    writeFileSync(file, 'export default { default: { target: 88, widths: [800], formats: ["avif"] } }\n')

    const config = await loadConfig(file)

    expect(config.default.target).toBe(88)
  })

  it('throws on an invalid config file', async () => {
    const file = join(dir, 'bad.config.mjs')
    writeFileSync(file, 'export default { default: { target: 88, widths: [800], formats: ["avif"], quality: 75 } }\n')

    await expect(loadConfig(file)).rejects.toThrow(/per-format map/)
  })

  it('loads the repo config, which carries the documented overrides', async () => {
    const config = await loadConfig()

    expect(config.default.target).toBeGreaterThan(0)
    expect(config.default.formats).toEqual(SUPPORTED_FORMATS)
    expect(config.overrides.some((o) => o.match.includes('_keyvisual'))).toBe(true)
    expect(config.overrides.some((o) => o.match === 'home/landing_reel.jpg')).toBe(true)
  })

  it('serves keyvisuals as AVIF + JPEG only, other project images as all three', async () => {
    const config = await loadConfig()

    expect(resolveSettings(config, 'projects/01-a/a-00_keyvisual.jpg').formats).toEqual(['avif', 'jpeg'])
    expect(resolveSettings(config, 'projects/01-a/a-02-landing-page.jpg').formats)
      .toEqual(['avif', 'webp', 'jpeg'])
  })

  it('resolves the repo config to the researched quality bands', async () => {
    const config = await loadConfig()

    // 88-92 visually lossless for keyvisual/hero, 82-86 excellent elsewhere.
    // The band is target +/- tolerance (DEFAULT_TOLERANCE when unset).
    const band = (path) => {
      const { target, tolerance = 2 } = resolveSettings(config, path)
      return [target - tolerance, target + tolerance]
    }

    expect(band('projects/01-a/a-00_keyvisual.jpg')).toEqual([88, 92])
    expect(band('home/landing_reel.jpg')).toEqual([88, 92])
    expect(resolveSettings(config, 'home/landing_reel.jpg').eager).toBe(true)
    expect(band('projects/01-a/a-02-landing-page.jpg')).toEqual([82, 86])
  })
})

describe('budget', () => {
  const base = { target: 84, widths: [100], formats: ['jpeg'] }

  it('resolves a video budget from an override and rejects a non-byte value', () => {
    const config = validateConfig({ default: base, overrides: [{ match: 'home/reel.mp4', budget: 8000000 }] })
    expect(resolveSettings(config, 'home/reel.mp4').budget).toBe(8000000)
    expect(resolveSettings(config, 'home/other.mp4').budget).toBeUndefined()
    expect(() => validateConfig({ default: { ...base, budget: '8MB' } })).toThrow(/budget/)
    expect(() => validateConfig({ default: { ...base, budget: 0 } })).toThrow(/budget/)
  })
})
