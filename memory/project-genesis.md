# Project Genesis

<!-- Authored, not generated. `memory_index.py --sync` only creates this skeleton. -->

## Origin

studioisphording is a Kirby CMS (flat-file, PHP) portfolio/agency site with a Vite + Sass +
Three.js front end, deployed by rsync to IONOS. The repo was recovered from a state where
Kirby 4.8 refused to boot on PHP 8.5: the fix was upgrading to Kirby 5.5, updating the npm
toolchain (Vite 8, Sass, Terser, Three.js), splitting deploy-safe config from localhost
overrides, and fixing the template markup faults that upgrade surfaced. That recovery
surfaced a backlog of deferred issues (`plan/improvements.md`), which the next plan then
worked through end to end: repairing three visible production defects (webfont 404s, an
invisible home showreel video, a page transition that revealed the old page underneath the
reveal), plus deploy safety, repo hygiene, build toolchain, and Three.js correctness.

## Lineage

| Plan | Contributed |
|---|---|
| `01-kirby5-php85-recovery` (archived) | Upgraded Kirby 4.8 -> 5.5 to restore boot on PHP 8.5; modernized the npm toolchain; split deploy-safe config from localhost overrides; fixed template markup faults the upgrade surfaced; left a backlog in `plan/improvements.md`. |
| `02-frontend-fidelity-and-deploy-safety` | Cleared the entire `improvements.md` backlog: fixed webfont 404s, the invisible home showreel video, and the page-transition reveal-timing bug; untracked `app/kirby/` in favor of Composer; hardened `scripts/deploy.sh` against deleting live server content; hardened `bash scripts/smoke.sh` against silent asset 404s; cleaned up Three.js resource lifecycle and dead build config. |
| `refactor-app-site` | Restructured the Kirby site layer: markup moved out of site methods into snippets (showcase-grid, related-grid), global helpers moved into a `function_exists`-guarded plugin, responsive-image markup rebuilt from one size table with escaped attributes via Kirby's Html helpers, dead starterkit code removed, and content-field output escaped (enforced by an OutputEscapingGuard test). Left behind a PHPUnit ^12 suite (`tests/php/`, fixture-backed via KirbyTestCase, `npm run test:php`) that pins every refactored unit so future app/site work is tested rather than only smoke-checked. Rendered HTML unchanged apart from the intended escaping. |
| `refactor-dev-js` (archived) | Put the Three.js runtime and the Barba transition gate under a Vitest ^5 suite (`tests/js/`, shared fakes, `npm test`) with characterization tests written before any refactor; brought the three oversized dev/js modules under the 300-line threshold (EventEmitter, Resources, animBarba split into `animation/barba/`); replaced Experience's hardcoded world wiring with a worlds registry; fixed the EventEmitter off/trigger semantics; closed both security findings (SEC-01 innerHTML sink → textContent, SEC-02 debug global → DEV-gated). Rendered behaviour unchanged apart from the named bug fixes. |
| `03-media-compression-and-delivery` | Added a build-time media pipeline (`scripts/media/`, `media.config.mjs`): sharp AVIF/WebP/JPEG derivatives with SSIMULACRA2-targeted quality, an AV1/VP9/H.264 video ladder held to a byte budget, a content-hash cache and `manifest.json` in `app/assets/media/`. Kirby renders `<picture>` and video sources from the manifest with thumbs as fallback. Masters stay workstation-only. Measured with `npm run perf`. |
| `04-backlog-hygiene-and-robustness` | Worked through the post-media backlog: deploy dry-run no longer prunes dev dependencies; encoder options hashed into the quality cache key; WebP dropped for keyvisuals; a report-only-by-default orphan pruner (`npm run media:prune`); about/projects moved onto the responsive-image snippet; Three.js loader/emitter robustness; Three.js route-split behind `#webgl` so non-WebGL pages ship no Three code; plain-text titles for `<title>`/attribute contexts (`titleText()`); one tag-rendering behaviour. |
| `05-webgl-loading-and-video-ladder` | Tuned WebGL loading and the video ladder: world-aware head preloads (runExperience + own world chunk, never vendor-three); Experience teardown/restart across Barba transitions (fixing a rAF/resize leak); dev logging gated behind `import.meta.env.DEV`; per-rung AV1/VP9/H.264 byte budgets for every video master; gallery videos moved from `app/video/` into content and onto the manifest; lazy videos rendered server-side with `data-src` plus a `<noscript>` twin; measured close-out in `readme/PERFORMANCE.md`. |
