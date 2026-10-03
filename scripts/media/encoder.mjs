// The encoder contract the pipeline spine is built against, plus a stub.
//
// Phase 2 builds config, cache, naming and manifest without sharp, so nothing
// here imports it. Phase 3's sharp encoder simply has to satisfy this shape,
// and the quality-targeting loop of phase 4 wraps it rather than replacing it.
//
// An encoder is:
//
//   {
//     async probe(masterFile) -> { width, height }
//     async encode({ masterFile, width, format, settings }) -> { data: Buffer|Uint8Array, width, height }
//     async reference({ masterFile, width }) -> PNG bytes of the master at that width, lossless
//     async decode(data) -> PNG bytes of an encoded candidate
//   }
//
// `settings` is always { format, mode: 'quality', quality }: a `target` is
// resolved to a quality by quality.mjs before the encoder sees it. An encoder
// handed a target must throw, never silently fall back to a default quality.
// reference() and decode() exist for the SSIMULACRA2 scorer, which compares
// two same-size PNGs.

/**
 * A deterministic in-memory encoder for tests: it produces bytes derived from
 * its inputs rather than a real image, and records every call.
 *
 * @param {object} [options]
 * @param {{width: number, height: number}} [options.intrinsic] what probe() reports
 */
export const createStubEncoder = ({ intrinsic = { width: 4000, height: 3000 } } = {}) => {
  const calls = []

  return {
    calls,

    async probe() {
      return { ...intrinsic }
    },

    async encode({ masterFile, width, format, settings }) {
      calls.push({ masterFile, width, format, settings })
      const height = Math.max(1, Math.round((width * intrinsic.height) / intrinsic.width))
      const body = `${masterFile}|${width}|${format}|${JSON.stringify(settings)}`
      return { data: Buffer.from(body), width, height }
    },

    async reference({ masterFile, width }) {
      return Buffer.from(`reference|${masterFile}|${width}`)
    },

    // Identity: a fake scorer can read the settings back out of the candidate.
    async decode(data) {
      return Buffer.from(data)
    }
  }
}
