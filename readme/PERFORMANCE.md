# Performance snapshots

`scripts/perf.sh` measures the **production build served locally** and writes
a snapshot you can compare before and after a change, and hand to Claude as
input for media/loading work.

```bash
npm run perf -- --label before-refactor    # full snapshot (~10–15 min)
# … refactor …
npm run perf -- --label after-refactor
npm run perf:compare                       # compares the two newest snapshots
```

Quick sanity check while working (one desktop Lighthouse run per page, too
noisy for real comparisons): `npm run perf -- --quick`.

## What it measures

| Section | How | Useful for |
| --- | --- | --- |
| Web vitals (LCP, FCP, TBT, CLS, Speed Index, score) | Lighthouse 13, median of 3 runs, mobile + desktop, key pages | Before/after on page load |
| Heaviest requests + Lighthouse insights | Representative Lighthouse run per page | What slows the first paint, with estimated savings |
| After load / on scroll | Real headless Chrome: bytes loaded until `load`, after `load` without interaction, and while scrolling to the bottom; frame times; JS heap; WebGL canvas sizes | Three.js asset loading, whether lazy loading actually defers anything |
| Media in markup | Every `/de` page's `<img>`/`<video>` with byte sizes and flags | Lazy-loading, poster, srcset and format fixes |
| Heavy files on disk | `app/content`, `app/video`, `app/assets/three`, … ≥ 1 MB, with "seen this run" | Cleanup candidates and oversized sources |
| TTFB | curl, 10 samples per page | Kirby/PHP-side refactors |
| Bundle | Raw/gzip/brotli per built file | JS/CSS refactors |
| Code size | Files/lines per area, largest files | Housekeeping ("is this easier to navigate?") |

## Output

```
perf/<timestamp>-<label>/
├── report.md                      # read this / give this to Claude
├── summary.json                   # raw numbers, input for compare
├── compare-vs-<older>.md          # written by perf:compare
└── lighthouse/<form>-<page>.html  # full Lighthouse reports
```

`perf/` is gitignored.

## Options

```
--label NAME                 name of the snapshot folder
--quick                      1 run, desktop only
--no-build                   reuse the current app/assets/bundle
--runs N                     Lighthouse runs per page (default 3)
--pages "/de /de/about"      Lighthouse + probe pages (media scan and TTFB always cover every /de page)
--form-factors mobile,desktop
--throttling simulate|devtools|provided
--skip-lighthouse / --skip-probe
PORT=8020 npm run perf       default port is 8013
```

## Reading the numbers honestly

- **Only compare snapshots with each other.** `php -S` on your machine is not
  IONOS: there is no gzip, no HTTP/2 and no network latency, so absolute
  values will not match production.
- **Take both snapshots under the same conditions**: same machine, same
  options, nothing heavy running. The compare output warns when the run
  settings differ.
- **Changes under 5% are marked "same"**, and small absolute changes (a few
  ms of TBT) are ignored too.
- **Frame times use software WebGL** (SwiftShader in headless Chrome). They
  catch regressions such as a scene rendering at double resolution, but say
  nothing about real-GPU fps. Use the Chrome Performance panel on a real
  device for that.
- **Autoplay video pages vary** in "bytes until load" by ±20% between
  identical runs, depending on how much video streamed before the load event.
- **Media flags are heuristics.** For example, "the first two media elements
  are above the fold" is an assumption. Check the template before acting on
  a flag.

## Using a report with Claude

The **Heavy assets and loading behaviour** section lists real URLs, sizes,
load phases and flags. Hand it to Claude along with a concrete ask:

> Read `perf/<snapshot>/report.md`, section "Heavy assets and loading
> behaviour". Propose changes to templates/snippets (and dev/js where needed)
> that reduce bytes loaded before LCP. Start with autoplay videos and
> Three.js assets. Don't touch app/content. After implementing, I'll run
> `npm run perf -- --label after-media` and `npm run perf:compare`.

## Fidelity bands (image derivatives)

The media pipeline (`npm run media:images`, `scripts/media/`) does not pick
codec quality numbers by hand. Each image variant is encoded, decoded, scored
with **SSIMULACRA2** against the master at the same width, and the quality is
bisected until the score lands in a band. This section records which bands
were chosen, and why, as a reviewable decision.

| Band | Used for | SSIMULACRA2 meaning |
| --- | --- | --- |
| **88–92** (target 90) | Project keyvisuals, the home hero poster | 90 = "visually lossless — imperceptible in flicker tests" |
| **82–86** (target 84) | Everything else (gallery, intro images) | 85 = "excellent — imperceptible under normal viewing"; 80 = "very high" |

**Why these bands.** A score means roughly the same thing whatever the codec,
so one target can cover AVIF, WebP and JPEG, and each format still resolves to
its own quality number. A fixed "quality 80" means three different fidelities
across those three codecs. Keyvisuals open a project and carry its art
direction, so they get the visually-lossless band. Gallery images sit in a
two-column grid at normal viewing distance, where "excellent" is enough and
saves bytes. The upper edge of each band matters too: it stops the loop from
spending bytes on fidelity nobody can see.

**Keyvisual exception (WebP dropped).** Keyvisuals are encoded as AVIF +
JPEG only (`formats: ['avif', 'jpeg']` in `media.config.mjs`). Lossy WebP could
not reach the 88–92 band on detailed keyvisuals (ceiling ~88, 24 `MISS` lines
before the change, 0 after) and showed banding on dark backdrop gradients.
AVIF covers most clients; JPEG is the full-fidelity fallback.

The bands come from the research
dossier's recommendation (`plan/03-media-compression-and-delivery/
research-media-compression-lazy-loading.md`, RES-19/RES-29).

**How to change them.** Edit `media.config.mjs`:

- `target` sets the band centre. `tolerance` (default 2) sets its half-width,
  so `{ target: 90 }` means 88–92 and `{ target: 84, tolerance: 1 }` means
  83–85. Set either on `default` or on a glob override (most specific glob
  wins).
- `quality: { avif: 60, webp: 80 }` is the escape hatch. It skips the loop for
  the listed formats on matching paths and encodes at exactly those numbers.
  It is always a per-format map, never one number.
- Any change to target, tolerance or quality changes the derivative's
  filename hash, so the next run re-encodes exactly the affected variants.

**Scorer.** Run `bash scripts/media/setup-scorer.sh` once per workstation. On
this Mac it installs Homebrew's `jpeg-xl` (0.12.0), whose bottle ships libjxl's
`ssimulacra2`, and links it to `tools/ssimulacra2/bin/` (gitignored). If a
future bottle drops the tool, the script builds `cloudinary/ssimulacra2` from
source instead. That fallback is written but untested, because the bottle
route worked. `node scripts/media/index.mjs scorer` reports whether the
pipeline can find the binary. The lookup order is `$SSIMULACRA2_BIN`, then
`tools/`, then `$PATH`.

**Without the scorer** the pipeline still runs. It maps the target to
per-codec numbers from the calibration table in `scripts/media/quality.mjs`
and prints, once per run, that quality is *mapped, not measured*. The table's
rows 60–76 are the research's cross-codec equivalence (JPEG 50/60/70/80 ≈
AVIF 48/51/56/64 ≈ WebP 55/64/72/82), scored here. Rows 84 and 90 are the
highest qualities the loop resolved in the validation below, so the mapped
results lean generous. Variants encoded from the mapping are re-encoded, and
measured, the first time the scorer is available.

**Misses are reported, never hidden.** If the bisection (at most 7 encodes)
cannot land in band, it keeps the lowest quality that cleared the band's
floor. If no quality cleared the floor, it keeps the best score it reached.
Either way the run prints a `MISS` line and lists the variant under
"out of band" in its summary.

**Caching.** Derivative filenames carry a hash of (master bytes, width,
format, target, tolerance, measured/mapped), so a warm run does no encoding
and no scoring. Each search's result (the resolved quality per master hash,
width, format, target and tolerance) is also stored in
`.cache/media/quality.json` (gitignored, never deployed). A deleted derivative
is then re-encoded once at the known quality, without searching again.

### Validation, 2026-10-03

The two images below were chosen by sharp's sharpness statistic over all 132
masters, as the two ends of the axis the research names (RES-27):

- **Noisy:** `projects/conway-bicycles/conway_keyvisual.jpg`, the
  highest-frequency keyvisual (rock texture plus sky).
- **Flat:** `projects/02-screw-driver/screwDriver_00_keyvisual.jpg`, the
  flattest keyvisual (a dark studio-backdrop gradient).

Each was run through the loop at 800w and 1600w, tolerance 2. Each cell below
shows quality → score, then size:

| Image | Target | Width | AVIF | WebP | JPEG |
| --- | --- | --- | --- | --- | --- |
| noisy | 84 | 800 | q76 → 83.48, 50.5 KB | q91 → 85.02, 71.4 KB | q90 → 83.72, 87.6 KB |
| noisy | 84 | 1600 | q83 → 84.44, 244.8 KB | q91 → 82.80, 281.4 KB | q90 → 82.30, 343.0 KB |
| noisy | 90 | 800 | q87 → 88.04, 72.1 KB | q97 → 89.35, 115.6 KB | q96 → 89.84, 157.0 KB |
| noisy | 90 | 1600 | q94 → 90.09, 449.0 KB | **q99 → 87.74, MISS**, 482.4 KB | q96 → 88.55, 605.1 KB |
| flat | 84 | 800 | q57 → 83.78, 3.4 KB | q91 → 82.88, 11.6 KB | q85 → 83.62, 12.5 KB |
| flat | 84 | 1600 | q76 → 83.79, 54.0 KB | q96 → 85.11, 145.0 KB | q93 → 84.74, 106.2 KB |
| flat | 90 | 800 | q87 → 90.72, 13.9 KB | q99 → 88.47, 35.7 KB | q93 → 89.86, 22.0 KB |
| flat | 90 | 1600 | q87 → 89.62, 103.1 KB | q99 → 88.18, 208.6 KB | q96 → 89.23, 177.4 KB |

23 of 24 variants landed in band. Most searches took one to three encodes;
the worst took six.

What the numbers say:

- **Per-image variation is real, and the loop absorbs it.** At target 84,
  AVIF resolved to q57 on the flat image but q83 on the noisy one. No single
  fixed quality could serve both.
- **Encoder choices that came out of this run.** At sharp's default 4:2:0
  chroma, JPEG could not reach 88 even at q100 (87.9 on the noisy image). The
  pipeline therefore encodes JPEG at 4:4:4, which costs no more bytes at equal
  score in the 82–86 band. WebP now uses `smartSubsample`, which gains it
  about 1–2 points.
- **WebP has a ceiling of about 88.** Lossy WebP is 4:2:0 by format, so the
  88–92 band is out of reach on detailed images. The loop reports the miss and
  keeps its best attempt (q99).
- **One target serves both images for AVIF and JPEG, but not for WebP.**
  Viewed at 100% against the master, every AVIF and JPEG encode was clean.
  AVIF smooths the backdrop's film grain away but shows no stepping. The WebP
  encodes of the flat backdrop show **contour banding**: faint at normal
  brightness, obvious with 3× gain. It persists even at q99 (score 88.18),
  while SSIMULACRA2 still scores those encodes 85–88. This is the banding
  case RES-27 warns about, and the metric under-weights it. Raising the
  target does not fix it, so the useful override is a **format** override,
  not a target override: give dark-gradient or backdrop images
  `formats: ['avif', 'jpeg']`. About 95% of browsers take the AVIF anyway, and
  the rest then get grain-preserving 4:4:4 JPEG instead of banded WebP.
  `media.config.mjs` does not do this yet. It is an art-direction call, logged
  in `plan/improvements.md`.

## Tests

`npm run test:perf` runs unit tests for the parsing, flagging, file matching
and delta logic (`scripts/perf/test/`).

## Video ladder (`npm run media:video`)

`scripts/media/encode-video.mjs` emits, per video master in `app/content`
(`.mp4`/`.mov`), AV1/WebM (`libsvtav1` preset 4), VP9/WebM (CRF, `-b:v 0`) and
H.264/MP4 (`libx264` slow, faststart) into `app/assets/media/`, plus a poster
through the image pipeline (an authored sibling `<name>.jpg` if present, else a
frame staged in `.cache/media/posters/`). Resolution, duration and frame rate
are never changed; silent sources stay silent (`-an`) with a 240-frame GOP.

The `budget` (bytes) set per path in `media.config.mjs` applies to the AV1
rung: CRF starts at 34 and steps +2 until the rung fits or CRF 48 is hit; at
the floor the achieved bytes are reported as a miss and the file still ships.
VP9 (CRF 34) and H.264 (CRF 23) encode once. Warm runs are no-ops (hash in the
filename); the settled CRF lives in `.cache/media/quality.json`. Manifest
entries are under `videos` (schema in `scripts/media/manifest.mjs`); templates
still use the old files until phase 7.

### Home `landing_reel` (1920x1080, 36.7 s, 24 fps, 23.7 MB master), measured 2026-10-03

| Rung | CRF | Bytes | Wall clock | SSIM vs master |
| --- | --- | --- | --- | --- |
| AV1/WebM | 38 (34 → 9.81 MB, 36 → 8.23 MB, 38 → 7.04 MB) | 7,036,775 | 43.3 s | 0.9655 |
| VP9/WebM | 34 | 13,916,921 | 15.5 s | 0.9655 |
| H.264/MP4 | 23 | 18,731,721 | 9.2 s | 0.9931 |

Budget 8,000,000 bytes on the AV1 rung: **met** (3 attempts, 79 s for the whole
run including the poster). VP9 and H.264 are not budgeted and stay heavy.

## Three.js route split, measured 2026-10-04

`vendor-three` (651 KB, 161 KB gzip) used to be a static import of
`app.bundle.js`, so every route downloaded and parsed it. It is now reached
only through `dev/js/utils/startWebgl.mjs`'s dynamic import on pages with a
`#webgl` canvas, and each world is its own chunk. `app.bundle.js` went from
80.9 KB to 4.1 KB. Snapshots `2026-10-04-00-00-00-before-split` vs
`2026-10-04-00-12-44-after-split` (`npm run perf:compare`, Lighthouse
simulated throttling, median of 3):

| Mobile | FCP before | FCP after | LCP before | LCP after |
| --- | --- | --- | --- | --- |
| /de | 3.83 s | 1.88 s | 12.15 s | 7.65 s |
| /de/projects | 3.98 s | 2.03 s | 11.10 s | 3.83 s |
| /de/about | 3.68 s | 1.65 s | 6.90 s | 3.30 s |
| /de/projects/01-phenotype-agency | 3.83 s | 1.88 s | 9.15 s | 4.58 s |
| /de/projects/isphording-inneneinrichtung (WebGL) | 4.13 s | 6.00 s | 56.42 s | 8.63 s |

The WebGL page is the one regression: its FCP got worse on mobile (+1.87 s)
and desktop (+259 ms), while its TBT dropped to 0 and desktop main-thread
work fell 19%. It now modulepreloads `vendor-three` from `<head>`, where that
download competes with the render-critical CSS and fonts. Before the split it
was found only after `app.bundle.js` had been parsed. The 56 s LCP before the
split is an outlier, so don't read the −85% as a real gain.

Browser check (2026-10-04): headless Chrome via the repo's puppeteer-core,
production bundle, `php -S` bound to the LAN IP so the dev-mode configs don't
apply. `/de`, `/de/about` and `/de/projects` fetched no `vendor-three`,
`runExperience` or world chunk. `/de/projects/isphording-inneneinrichtung`
fetched `runExperience`, `vendor-three` and only its own world chunk
(`isphording-inneneinrichtung-*.js`), logged no console errors, and its
screenshot shows World_01's display model rendered. World_02 (`moodboard`
template) has no live content page, so only its unit tests cover it.

## Plan 04 close-out, measured 2026-10-04

Snapshots `2026-10-03-14-41-17-after-pipeline` (end of plan 03) vs
`2026-10-04-00-36-43-after-plan-04` (`npm run perf:compare -- <before> <after>`;
Lighthouse mobile, simulated throttling, median of 3). Plan 04's route split,
responsive-image move for about/projects and keyvisual format change are all
in the "after":

| Mobile | Score | FCP | LCP | Transfer |
| --- | --- | --- | --- | --- |
| /de | 65 → 81 | 3.98 → 1.88 s | 12.38 → 4.80 s | 6.1 → 5.3 MB |
| /de/projects | 65 → 87 | 3.98 → 2.03 s | 11.10 → 3.83 s | 2.4 → 1.7 MB |
| /de/about | 67 → 91 | 3.68 → 1.73 s | 8.33 → 3.30 s | 5.1 → 3.9 MB |

Deploy dry-run (`scripts/deploy.sh --dry-run`) leaves `app/vendor/bin/phpunit`
in place; its only deletions are the four stale `animGsap`/`animBarba`
bundle chunks. `npm run media:prune` reports 0 orphans (1696 files kept).

## World-aware head preloads, measured 2026-10-04

A WebGL page used to modulepreload `runExperience` plus `vendor-three` (651 KB)
from `<head>`, competing with the CSS and fonts (the FCP regression above).
`vite($entry, $webgl, $world)` now emits `runExperience` plus only the page's
own world chunk (`$page->webglWorldChunk()`, from `WEBGL_WORLD_CHUNKS` in the
site-methods plugin) and never `vendor-three`; the dynamic import fetches that
as soon as `runExperience` runs. `PageMethodsTest` pins the world map against
`dev/js/three/worlds.mjs`. Snapshots `2026-10-04-00-36-43-after-plan-04` vs
`2026-10-04-14-40-51-after-preload`, /de/projects/isphording-inneneinrichtung,
Lighthouse simulated throttling, median of 3:

| | FCP | LCP | TTI | TBT |
| --- | --- | --- | --- | --- |
| Mobile before | 5.70 s | 56.38 s | 56.93 s | 0 ms |
| Mobile after | 4.67 s | 56.42 s | 56.99 s | 191 ms |
| Desktop before | 1.04 s | 1.34 s | 1.34 s | 0 ms |
| Desktop after | 0.78 s | 1.58 s | 1.62 s | 45 ms |

Variant kept: preload `runExperience` + own world, no `vendor-three`. Mobile
FCP recovers by about 1 s (not all the way to the 4.13 s pre-split figure) and
desktop FCP improves by 25%. The mobile LCP/TTI medians are the same 56 s
outlier as before (the cookie banner text, with a 9 MB "other" request on the
page) and say nothing about this change. Desktop LCP/TTI moved +0.24/+0.28 s,
inside the run-to-run spread (after: LCP 1.29-1.92 s; before the split the same
page measured 0.72-1.35 s), so it is not treated as a regression; TBT moved up
from 0 because the chunks now execute earlier, still well under 200 ms on
desktop. The fallback (vendor-three preload at the end of `<body>`) was not
tried since FCP recovered.
