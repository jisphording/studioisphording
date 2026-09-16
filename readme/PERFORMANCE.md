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

## Tests

`npm run test:perf` runs unit tests for the parsing, flagging, file matching
and delta logic (`scripts/perf/test/`).
