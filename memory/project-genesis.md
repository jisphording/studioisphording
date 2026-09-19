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
