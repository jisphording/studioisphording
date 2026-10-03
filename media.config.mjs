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
// for a video master, `budget`: a transfer size in bytes for its AV1 rung.
// scripts/media/encode-video.mjs steps the CRF up until the rung fits or a
// floor quality is reached; it never trims duration or frame rate.
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
    // lossless, 88-92.
    { match: 'projects/**/*_keyvisual*', target: 90 },

    // The home hero poster is the LCP candidate on /de: visually lossless
    // (88-92) and eager.
    { match: 'home/landing_reel.jpg', target: 90, eager: true },

    // The 36 s home reel shipped as a 23 MB MP4; the AV1 rung has to fit a
    // hero's worth of transfer. Re-encode only — framing and fps stay.
    { match: 'home/landing_reel.mp4', budget: 8000000 },

    // Intro images sit below the fold in a single column; the default band is
    // enough, but they are wide, so drop the smallest step.
    { match: 'projects/**/*_intro-img*', widths: [800, 1200, 1600, 2000] }
  ]
}
