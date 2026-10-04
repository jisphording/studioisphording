// Per-format sharp encoder options, minus `quality` (which is resolved per
// variant). The one copy: encode-images.mjs spreads these into sharp, and
// cache.mjs hashes them into qualityKey, so a change here invalidates the
// quality-search cache on its own.
//
// Chroma: AVIF is 4:4:4 by default. JPEG is forced to 4:4:4 because at 4:2:0
// it cannot reach the 88-92 band even at q100 (measured 87.9 on a noisy
// keyvisual), and costs no more bytes at equal score below it. Lossy WebP is
// 4:2:0 by format; smartSubsample buys it ~1-2 points, but its ceiling stays
// near 88 — see readme/PERFORMANCE.md "Fidelity bands".

export const ENCODER_OPTIONS = Object.freeze({
  avif: Object.freeze({ effort: 4 }),
  webp: Object.freeze({ smartSubsample: true }),
  jpeg: Object.freeze({ mozjpeg: true, chromaSubsampling: '4:4:4' })
})
