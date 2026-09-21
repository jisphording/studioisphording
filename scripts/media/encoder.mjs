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
//   }
//
// `settings` is encoderSettings(resolved, format) from config.mjs — either
// { format, mode: 'target', target } or { format, mode: 'quality', quality }.
// An encoder that cannot honour a target must say so by throwing, never by
// silently falling back to a default quality.

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
    }
  }
}
