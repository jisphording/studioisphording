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
//
//   quality  a raw per-codec escape hatch that bypasses the targeting loop for
//            a path whose automatic result is judged wrong. It is ALWAYS a
//            per-format map, never a scalar — JPEG 80, WebP 80 and AVIF 80 are
//            three different fidelities, so one number across three codecs
//            would silently mean three different things.
//
// An override may also carry non-quality concerns: `eager` (render the image
// eagerly, for an LCP candidate) and a narrower `widths` or `formats` list.
//
// Resolution is most-specific-glob-wins, layered over `default`; see
// scripts/media/config.mjs for the exact rule.

export default {
  default: {
    target: 86,
    widths: [480, 800, 1200, 1600, 2000],
    formats: ['avif', 'webp', 'jpeg']
  },
  overrides: [
    // Keyvisuals open a project and carry its art direction — visually lossless.
    { match: 'projects/**/*_keyvisual*', target: 90 },

    // The home hero poster is the LCP candidate on /de: best quality, eager.
    { match: 'home/landing_reel.jpg', target: 92, eager: true },

    // Intro images sit below the fold in a single column; the default band is
    // enough, but they are wide, so drop the smallest step.
    { match: 'projects/**/*_intro-img*', widths: [800, 1200, 1600, 2000] }
  ]
}
