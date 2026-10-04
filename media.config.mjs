// Media pipeline configuration — version-controlled, reviewable, unit-tested.
//
// Deliberately NOT a field in app/content: the pipeline only ever READS the
// content tree, and keeping the settings here makes them diffable in git.
//
// Paths in `match` are content-relative — the path of a master below
// app/content/, e.g. 'projects/01-phenotype-agency/phenotype-agency-00_keyvisual.jpg'.
// Globs support `*` (within one segment), `**` (across segments) and `?`.
//
// Two quality knobs, deliberately:
//
//   target   an SSIMULACRA2 score, and the normal way to express intent. One
//            score means about the same thing in AVIF, WebP and JPEG, so a
//            single target resolves per image and per format on its own.
//            Bands: 90 = visually lossless, 85 = excellent, 80 = very high.
//            scripts/media/quality.mjs encodes, scores and adjusts until the
//            score lands in target +/- `tolerance` (default 2), so target 90
//            means 88-92. Why these bands: readme/PERFORMANCE.md.
//
//   quality  a raw per-codec escape hatch that bypasses the targeting loop for
//            a path whose automatic result is judged wrong. It is ALWAYS a
//            per-format map, never a scalar — JPEG 80, WebP 80 and AVIF 80 are
//            three different fidelities, so one number across three codecs
//            would silently mean three different things.
//
// An override may also carry non-quality concerns: `eager` (render the image
// eagerly, for an LCP candidate), a narrower `widths` or `formats` list, and,
// for a video master, `budget`: transfer sizes in bytes, either one number (the
// AV1 rung only) or { av1, vp9, h264 } budgeting each rung. A rung without a
// budget encodes once. scripts/media/encode-video.mjs steps a budgeted rung's
// CRF up until it fits or its floor quality is reached; it never trims
// duration or frame rate.
//
// Resolution is most-specific-glob-wins, layered over `default`; see
// scripts/media/config.mjs for the exact rule.

export default {
  default: {
    // 82-86, "excellent": imperceptible under normal viewing.
    target: 84,
    widths: [480, 800, 1200, 1600, 2000],
    formats: ['avif', 'webp', 'jpeg']
  },
  overrides: [
    // Keyvisuals open a project and carry its art direction — visually
    // lossless, 88-92. AVIF + JPEG only: lossy WebP tops out near SSIMULACRA2
    // 88 on detailed keyvisuals (so it MISSes the band) and bands on dark
    // backdrop gradients; AVIF covers most clients and JPEG catches the rest
    // at full fidelity. responsive-image.php skips the absent WebP <source>.
    { match: 'projects/**/*_keyvisual*', target: 90, formats: ['avif', 'jpeg'] },

    // The home hero poster is the LCP candidate on /de: visually lossless
    // (88-92) and eager.
    { match: 'home/landing_reel.jpg', target: 90, eager: true },

    // Video budgets. Starting rule: AV1 ~ 200 KB/s of duration, VP9 <= 1.5x
    // and H.264 <= 2.5x that AV1 budget, so a client without AV1 stops paying
    // near-original bytes. Re-encode only — framing, duration and fps stay.
    // The 36.7 s home reel shipped as a 23 MB MP4; the rule gives 7.3 MB.
    { match: 'home/landing_reel.mp4', budget: { av1: 7300000, vp9: 10950000, h264: 18250000 } },
    { match: 'about/about_moodfilm.mp4', budget: { av1: 8860000, vp9: 13290000, h264: 22150000 } },
    { match: 'projects/01-phenotype-agency/Studio_Display_S02_Stone.mp4', budget: { av1: 2000000, vp9: 3000000, h264: 5000000 } },
    { match: 'projects/01-phenotype-agency/Studio_Display_S03_Flat_Stone.mp4', budget: { av1: 1000000, vp9: 1500000, h264: 2500000 } },
    { match: 'projects/isphording-inneneinrichtung/isphinnen_00_keyvisual.mp4', budget: { av1: 4000000, vp9: 6000000, h264: 10000000 } },

    // Intro images sit below the fold in a single column; the default band is
    // enough, but they are wide, so drop the smallest step.
    { match: 'projects/**/*_intro-img*', widths: [800, 1200, 1600, 2000] }
  ]
}
