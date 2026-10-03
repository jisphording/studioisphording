// Tests for scripts/media/scorer.mjs. The binary lookup and the shell-out are
// both injected — no real ssimulacra2 is ever invoked from the suite.

import { describe, it, expect } from 'vitest'
import { delimiter } from 'node:path'
import { createScorer, describeScorer, locateScorer, parseScore, SCORER_ENV } from '../../../scripts/media/scorer.mjs'

const only = (...present) => (file) => present.includes(file)

describe('locateScorer', () => {
  const toolsBinary = '/repo/tools/ssimulacra2/bin/ssimulacra2'
  const PATH = ['/usr/bin', '/opt/homebrew/bin'].join(delimiter)

  it('prefers the explicit env var', () => {
    const env = { [SCORER_ENV]: '/custom/ssimulacra2', PATH }
    expect(locateScorer({ env, toolsBinary, exists: only('/custom/ssimulacra2', toolsBinary) }))
      .toEqual({ binary: '/custom/ssimulacra2', source: 'env' })
  })

  it('refuses an env var that points at nothing rather than picking another binary', () => {
    const env = { [SCORER_ENV]: '/missing', PATH }
    expect(() => locateScorer({ env, toolsBinary, exists: only(toolsBinary) })).toThrow(/not an executable/)
  })

  it('falls back to the tools dir, then PATH, in that order', () => {
    expect(locateScorer({ env: { PATH }, toolsBinary, exists: only(toolsBinary, '/opt/homebrew/bin/ssimulacra2') }))
      .toEqual({ binary: toolsBinary, source: 'tools' })
    expect(locateScorer({ env: { PATH }, toolsBinary, exists: only('/opt/homebrew/bin/ssimulacra2') }))
      .toEqual({ binary: '/opt/homebrew/bin/ssimulacra2', source: 'path' })
  })

  it('returns null when nothing is found', () => {
    expect(locateScorer({ env: { PATH }, toolsBinary, exists: () => false })).toBe(null)
  })
})

describe('parseScore', () => {
  it('reads the bare number the tool prints', () => {
    expect(parseScore('87.31234567\n')).toBeCloseTo(87.312, 3)
    expect(parseScore('-3.5')).toBe(-3.5)
  })

  it('throws on output that is not a score', () => {
    expect(() => parseScore('Usage: ssimulacra2 original.png distorted.png')).toThrow(/could not parse/)
  })
})

describe('createScorer', () => {
  it('shells out with reference then candidate and parses the score', async () => {
    const calls = []
    const scorer = createScorer({
      locate: () => ({ binary: '/bin/ssimulacra2', source: 'path' }),
      run: async (binary, args) => {
        calls.push([binary, args])
        return { stdout: '90.5\n' }
      }
    })

    expect(scorer.available).toBe(true)
    expect(await scorer.score('ref.png', 'cand.png')).toBe(90.5)
    expect(calls).toEqual([['/bin/ssimulacra2', ['ref.png', 'cand.png']]])
    expect(describeScorer(scorer)).toMatch(/available — ssimulacra2 at \/bin\/ssimulacra2/)
  })

  it('reports unavailability and refuses to score', async () => {
    const scorer = createScorer({ locate: () => null, run: () => { throw new Error('must not run') } })

    expect(scorer.available).toBe(false)
    await expect(scorer.score('a', 'b')).rejects.toThrow(/setup-scorer\.sh/)
    expect(describeScorer(scorer)).toMatch(/NOT available — quality will be mapped/)
  })
})
