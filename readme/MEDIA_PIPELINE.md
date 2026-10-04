# Media pipeline

A build-time pipeline turns the masters in `app/content/` into AVIF / WebP /
JPEG image derivatives and AV1 / VP9 / H.264 video derivatives under
`app/assets/media/`, and writes a `manifest.json` Kirby reads to render
`<picture>` / `<video>` markup. It lives in `scripts/media/`, is configured by
`media.config.mjs` at the repo root, and only ever **reads** `app/content/`.

> **A fresh clone cannot run the pipeline.** The masters live only on the
> author's workstation (gitignored, deploy-excluded, backed up out of band — no
> Git LFS, never synced to production). Without the master archive present the
> scripts have nothing to encode. A fresh clone can still run the site: a
> missing manifest or a manifest miss degrades to Kirby's thumb path.

## Commands

```bash
bash scripts/media/setup-scorer.sh     # one-time: ssimulacra2 into tools/ (gitignored)
node scripts/media/index.mjs scorer    # is the scorer available?

npm run media:images                   # sharp: AVIF/WebP/JPEG into app/assets/media/
npm run media:video                    # ffmpeg: AV1/WebM, VP9/WebM, H.264/MP4 + poster
npm run media:images -- --dry-run      # report only; never writes
npm run media:prune                    # list derivatives manifest.json no longer references
npm run media:prune -- --apply         # ...and delete them
npm run media:images -- --prefix projects/02-screw-driver   # scope to a content path
```

Neither script is part of `npm run build`: a cold run encodes thousands of
variants. Both need `npm ci` (sharp); video also needs `ffmpeg` on `PATH`.

`images` and `video` both write `app/assets/media/manifest.json`. A dry run
or a scoped `images` run never writes it; a scoped `video` run does, merging its
`videos` entries into the existing file.

### Pruning orphans

Derivative names are content-hashed, so changing a master, width, format or
encoder setting leaves the old file behind and the deploy keeps mirroring it.
`media:prune` treats `manifest.json` as the source of truth: every image variant,
video variant and poster `url` (plus `manifest.json` itself) is kept; any other
regular file under `app/assets/media/` is an orphan. Without `--apply` it only
reports count and bytes. It aborts, deleting nothing, if the manifest is
missing, unparseable or references no files, or if a url points outside the
media root; symlinks are not followed and emptied directories are removed. Run
it after a full `media:images` (a scoped images run leaves the manifest
unchanged, so it is safe, but the full run is what retires stale entries).
Never chained into `build`.

## Cost: cold vs warm

Every output filename carries a content hash (master bytes + width + format +
encoder settings), so a **warm run is a no-op**: it hashes the masters and
finds everything present. A **cold run** is expensive — unmeasured encodes cost
roughly 0.2 s per variant, SSIMULACRA2-measured ones roughly 0.7 s, so the full
image set (~1,700 variants) takes on the order of 20 minutes, plus a few
minutes for the video ladder (the AV1 rung re-encodes in CRF steps until it fits
its budget). The measured quality for each variant is cached in
`.cache/media/quality.json` (workstation-only, gitignored) so later runs do not
repeat the search. Each search is keyed on the master hash, width, format,
target, tolerance **and that format's encoder options**
(`scripts/media/encoder-options.mjs`, the single copy the encoder also reads),
so changing an option such as AVIF `effort` invalidates that format's cached
searches automatically. `QUALITY_SEARCH_VERSION` in `cache.mjs` is bumped by
hand only for changes the options cannot express (e.g. the scoring method).

Nothing prunes derivatives whose master or settings changed; the old hashed
file stays in `app/assets/media/` and ships. Delete the tree and re-run if it
grows (tracked in `plan/improvements.md`).

## Configuration: `media.config.mjs`

Version-controlled and unit-tested (`tests/js/media/config.test.mjs`). Shape:

```js
export default {
  default:   { target: 84, widths: [480, 800, 1200, 1600, 2000], formats: ['avif', 'webp', 'jpeg'] },
  overrides: [ { match: 'projects/**/*_keyvisual*', target: 90, formats: ['avif', 'jpeg'] }, … ]
}
```

`match` is a content-relative glob (`*` within a segment, `**` across
segments, `?`). The most specific matching glob wins, layered over `default`.

| Key | Meaning |
| --- | --- |
| `target` | SSIMULACRA2 score to hit (±`tolerance`, default 2). The normal way to express intent. |
| `quality` | Raw per-codec map, e.g. `{ avif: 60, webp: 78, jpeg: 82 }`, bypassing the loop. Always a map — never a scalar, because the three codecs' scales are not comparable. |
| `widths`, `formats` | Narrow the width ladder or format list for a path. |
| `eager` | Render without lazy-loading (LCP candidate). |
| `budget` | Video masters only: byte budget for the AV1 rung. CRF steps up until it fits or hits the floor; duration and frame rate are never trimmed. |

### Fidelity bands

| Band | Used for |
| --- | --- |
| 88–92 (target 90) | Project keyvisuals, the home hero poster — "visually lossless" |
| 82–86 (target 84) | Everything else — "excellent", imperceptible at normal viewing |

**Keyvisual exception:** `projects/**/*_keyvisual*` ships AVIF + JPEG only, no
WebP. Lossy WebP tops out near score 88 on detailed keyvisuals (a band MISS)
and bands on dark backdrop gradients; the `responsive-image` snippet simply
skips the absent WebP `<source>`. Dropping the format leaves the old
`*_keyvisual*.webp` files on disk until they are pruned; they are no longer in
the manifest.

Why those bands, how to change them, and the validation run:
[PERFORMANCE.md "Fidelity bands"](PERFORMANCE.md).

## Scorer setup

`bash scripts/media/setup-scorer.sh` installs `ssimulacra2` into `tools/`
(gitignored). With it the loop measures every variant. Without it, quality is
**mapped from a calibration table** and the run says so — a fresh clone's
tests and a run on a machine without the binary still work, just less exactly.
Tests mock the scorer and never invoke a real binary.

## Output and manifest

Everything is written to **`app/assets/media/`** — the one tree that is both
gitignored and pushed by `scripts/deploy.sh`'s rsync. Nothing is written beside
a master, into `app/video/`, or into `app/media/`.

`app/assets/media/manifest.json` (schema v1, specified in
`scripts/media/manifest.mjs` and pinned by `tests/js/media/manifest.test.mjs`):

```jsonc
{
  "version": 1,
  "images": { "<content-relative master>": { "width", "height", "eager",
      "variants": [ { "format": "avif|webp|jpeg", "width", "height", "bytes", "url" } ] } },
  "videos": { "<content-relative master>": { "width", "height", "duration", "poster",
      "variants": [ { "codec": "av1|vp9|h264", "type", "bytes", "crf", "url" } ] } }
}
```

URLs carry the content hash, so they are immutable. Variants are sorted in
correct `<source>` order (AVIF → WebP → JPEG; AV1 → VP9 → H.264).

## Kirby side

- `app/site/plugins/media-manifest/` reads the manifest once per request
  (modelled on `vite-manifest`) and resolves a file to its variants.
- `responsive-image` snippet renders `<picture>`; `responsive-video` renders
  the `<video>` ladder (sources detached until near the viewport, via
  `dev/js/media/lazyVideo.mjs`).

### Thumb fallback

A file absent from the manifest — or no manifest at all — falls back to the
Kirby thumb system (`getResponsiveImage()` / `getThumbnail()` in
`app/site/plugins/site-methods/`, `config.thumbs`, the `/media/` route and the
`media-processing` plugin). These stay in place and are **not dead code**:
`responsive-image.php` and `project-gallery.php` call them on a manifest miss,
and `about.php` and `projects.php` now render through the `responsive-image`
snippet too (explicit `sizes` per class: `mood-image`/`mood-image-full`
`100vw`, `mood-image-quarter` `(max-width: 767px) 100vw, 50vw`,
`project-list-image` `100vw`; only the first about mood image is `eager`), so
`getResponsiveImage()` is reached only through the snippet's fallback.

## Deploy

`scripts/deploy.sh` requires `app/assets/media/manifest.json` in its preflight
(`require_tree`): the tree is not excluded from the `--delete` mirror, so
deploying from a machine without it would wipe the live derivatives. Review
`bash scripts/deploy.sh --dry-run` before any real deploy (a human call).

## Tests

`tests/js/media/` (Vitest: config, cache, quality loop, encoders, scorer,
manifest, lazy video) and `tests/php/` (`MediaManifestTest`,
`ResponsiveImageTest`, `ResponsiveVideoTest`). `npm test`, `npm run test:php`.
