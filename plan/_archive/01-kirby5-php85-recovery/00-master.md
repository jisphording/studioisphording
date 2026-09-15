---
plan: 01-kirby5-php85-recovery
created: 2026-09-15
toggles:
    cleanup: true
    tdd: false
    investigate: false
    kickoffPrompts: false
    modelRecommendations: true
    parallelHints: true
    conductor: false
    tokenTracking: false
    retrieval: false
    briefDigest: false
    contextpack: false
    research: false
---

# Kirby 5 + PHP 8.5 recovery

**Goal:** Get studioisphording rendering again on PHP 8.5 by upgrading Kirby 4.8 to Kirby 5.5, refreshing the npm toolchain, and fixing the config/template faults in the way — so local development can resume and a safe deploy is ready.

## Brief

The repo was pulled from git and the content (plus app/kirby) from the live IONOS server. The site does not render. Reproduced locally: Kirby 4.8.0's bootstrap refuses PHP >= 8.5.0 and the machine runs PHP 8.5.7, so every request returns Kirby's 'Change the PHP version to one supported by your version of Kirby' page. The likely live-server failure is the same (host PHP bumped past 8.4), but that is unconfirmed until the server's PHP version is read. The plan: build a safety net and smoke test first, upgrade Kirby to 5.5.x (supports PHP 8.3–8.5), update npm packages (Vite 5 → 8, Sass, Terser; Three.js as an optional last step), split the config so localhost-only settings (debug, url, vite.server) never ship to production, fix the template/HTML faults found along the way, and finish with an end-to-end verification and a deploy dry-run. The real deploy is a human gate and is not run by any phase.


---

## Decisions locked in (from planning 2026-09-15)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Kirby target version | Upgrade to Kirby 5.5.x (latest stable, 5.5.3 at planning time) via Composer, not 4.9.x. | The user asked to update Kirby, and 4.x's bootstrap caps PHP below 8.5. Kirby 5.5 requires PHP ~8.3 || ~8.4 || ~8.5, so it runs on the local PHP 8.5.7 and on whichever of 8.4/8.5 the host uses. 6.0 is alpha only. |
| 2 | Git vs. live server as source of truth | The git versions of app/site are canonical. ionos-live-reference/ stays a read-only diff source (gitignored), and the four live-only files (templates article/imprint/privacy, snippet section-headline) are adopted into git. | The live copies are an older revision (pre-Vite, pre-getResponsiveImage, pre-media-cache), e.g. header.php/footer.php still load bundle files directly. The untracked live-only files are needed by content that exists (content/imprint, content/privacy). |
| 3 | Composer lockfile | Commit app/composer.lock. app/kirby/ stays gitignored and is reproduced with `composer install` in app/. | Right now there is no lockfile, and app/kirby came from the server by hand. A lockfile pins the Kirby version for local, CI and deploy. |
| 4 | Config per environment | Keep production-safe values in app/site/config/config.php (debug false, no hardcoded url) and put the dev-only values (debug true, url http://localhost:8000, vite.server) in app/site/config/config.localhost.php. | Kirby merges config.{host}.php automatically. The current config.php hardcodes localhost and debug=true, and deploy.sh mirrors app/ to production. That breaks absolute URLs on live and leaks stack traces. The vite-manifest plugin picks dev vs. prod assets from option('debug'), so this split also makes production load the built bundle. |
| 5 | Vite major version | Go to the latest Vite (8.x). If a Rolldown incompatibility blocks the build and cannot be fixed within the phase, fall back to Vite 7.x and record why. | The goal is to update the npm packages. Vite 8 needs Node 20.19+/22.12+ (Node 24.4 is installed). Its Rolldown bundler changes rollupOptions/manualChunks semantics, so config migration is expected work. |
| 6 | Three.js upgrade | Separate optional last phase (0.152 → latest), run only after the site is verified working. | Three.js has breaking rendering changes between r152 and r186 (legacy lights removed, texture.encoding → colorSpace, etc.) that need visual comparison. It is not needed to get the site reachable, so it must not block the recovery. |
| 7 | Production deploy | No phase runs a real deploy. Phase 5 ends with `scripts/deploy.sh --dry-run` and a checklist. The user runs the real deploy. | deploy.sh uses rsync --delete against the live webroot. That is outward-facing and hard to reverse, so it stays a human gate. |

> Defaults chosen on the user's behalf are recorded here as defaults, not requirements.

---

## Codebase context

Facts derived from the current code that constrain the work below. Each cites `file:line`.

- Root cause reproduced: Kirby 4.8.0's bootstrap die()s when PHP_VERSION >= 8.5.0, and local PHP is 8.5.7, so every request renders 'Change the PHP version to one supported by your version of Kirby'. (`app/kirby/bootstrap.php:7-12`)
- app/composer.json requires php ^8.4.8 and getkirby/cms ^4.0. There is no app/composer.lock or app/vendor, and app/kirby/ (4.8.0) is gitignored and was copied from the server. (`app/composer.json:6-9; .gitignore:8`)
- config.php hardcodes 'debug' => true, 'url' => 'http://localhost:8000' and 'vite.server' => 'http://localhost:9001'. deploy.sh pushes all of app/ to production, so these values would go live. (`app/site/config/config.php:27-30; scripts/deploy.sh:68`)
- The vite-manifest plugin's vite() helper chooses between the Vite dev server and the built manifest from option('debug'). Templates call vite('dev/js/index.js'), but with Vite root './dev' the manifest key is 'js/index.js' (footer uses vitePreloadLinks('js/index.js')). The entry naming is inconsistent. (`app/site/plugins/vite-manifest/index.php:68-95; app/site/snippets/header.php:19; app/site/snippets/footer.php:35; vite.config.build.js:5`)
- `npm run php` runs `php -S localhost:8000 -t app` without Kirby's router, so pretty URLs (/about, /projects/…) 404 on the built-in server. The router exists at app/kirby/router.php. (`package.json:10`)
- The production build writes to app/assets/bundle with fixed names app.bundle.js / three.bundle.js / app.css plus a manifest at .vite/manifest.json. It uses terser and an object-form manualChunks {'vendor-three': ['three']}. (`vite.config.build.js:13-45`)
- npm outdated: vite 5.4.19 (latest 8.3.0), sass 1.63.6 (1.104.1), terser 5.43.1 (5.51.2), three 0.152.2 (0.186.0). dat.gui and stats-js are current. dev/css has no @import and uses @use, so Sass's @import deprecation does not apply. (`package.json:15-25`)
- Custom plugins: gallery (kirbytags:after hook), media-processing (file.create:after hook using mediaHash/diruri), site-methods (getThumbnail, getResponsiveImage, pullRelatedPages, displayShowcase), vite-manifest. None uses Panel/blueprint APIs, and there is no site/blueprints directory. (`app/site/plugins/*/index.php`)
- Languages de (default), en, it, es are defined in site/languages, but content only has de/en/it variants. 'languages.detect' => true. (`app/site/languages/*.php; app/site/config/config.php:11-12`)
- Live-only template bugs: imprint.php closes the article with '<article>' instead of '</article>', and article/imprint/privacy emit '</body>' before snippet('footer'), which closes body/html again. (`app/site/templates/imprint.php:10; app/site/templates/article.php:40-42; app/site/templates/privacy.php:13-15`)
- ionos-live-reference/site is an older copy of the live templates/snippets/config (live config.php has dead Kirby-2 `c::set(...)` after `return` and the typo 'language.detect'). It is gitignored and kept for manual diffing. (`ionos-live-reference/site/config/config.php:1-15; .gitignore:40-42`)
- app/index.php (gitignored) reflects any Origin into Access-Control-Allow-Origin together with Allow-Credentials: true. (`app/index.php:4-10`)
- readme/QUICK_START.md claims `npm run dev` starts both PHP and Vite and mentions `npm run dev:full`, but package.json has no such behaviour or script. (`readme/QUICK_START.md:38,70; package.json:6-13`)

---

## Cross-cutting conventions (every phase honours these)

- Match the surrounding file's indentation and comment style: tabs in app/site templates/snippets and most plugins, 4 spaces in app/site/config/config.php, 2 spaces in vite configs and dev/js.
- Every phase must leave `bash scripts/smoke.sh` (created in Phase 1) at least as green as it found it, and phases after Phase 2 must leave it fully green.
- Never modify app/content/ (live content). Never run scripts/deploy.sh without --dry-run, and never ssh to the server with a write command. Read-only ssh (php -v, ls) only after asking the user.
- Do not commit; each phase ends with changes staged for the user's review (use /commit when the user asks).

---

## Phase index

| Phase | Depends on | Parallelizable with | Model | File |
|-------|-----------|---------------------|-------|------|
| 1 Safety net, working PHP dev server, and smoke test | — | — | Strong → Claude Sonnet | `01-safety-net-working-php-dev-server-and-smoke-test.md` |
| 2 Upgrade Kirby 4.8 → 5.5 and make the site boot on PHP 8.5 | 1 | 3 | Heavy → Claude Opus | `02-upgrade-kirby-4-8-5-5-and-make-the-site-boot-on-php-8-5.md` |
| 3 Update npm packages and migrate the Vite config to Vite 8 | 1 | 2 | Strong → Claude Sonnet | `03-update-npm-packages-and-migrate-the-vite-config-to-vite-8.md` |
| 4 Deploy-safe config split and template/markup fixes | 2, 3 | — | Strong → Claude Sonnet | `04-deploy-safe-config-split-and-template-markup-fixes.md` |
| 5 End-to-end verification, docs, and deploy dry-run | 4 | — | Strong → Claude Sonnet | `05-end-to-end-verification-docs-and-deploy-dry-run.md` |
| 6 Upgrade Three.js 0.152 → latest and fix rendering regressions _(optional)_ | 5 | — | Heavy → Claude Opus | `06-upgrade-three-js-0-152-latest-and-fix-rendering-regressions.md` |

Serial vs parallel is computed from `dependsOn` + file overlap. Phases marked
"parallelizable" can run in separate chats / git worktrees at the same time.

---

## Batches

- **Batch A — Safety net** (done): phases 1
- **Batch B — Core upgrades (parallel)** (done): phases 2, 3
- **Batch C — Config + templates** (done): phases 4
- **Batch D — Verify + deploy readiness** (done): phases 5
- **Batch E — Optional: Three.js** (done): phases 6

---

## Out of scope (this plan)

- Running the real production deploy (scripts/deploy.sh without --dry-run). This is a user-held gate.
- Editing live content under app/content/.
- Merging old live-server template variants from ionos-live-reference/ back into git (git is canonical; the reference stays for manual diffing).
- Hardening app/index.php's reflective CORS headers (flagged as a risk; its own change).
- Adding Panel blueprints or a Panel account workflow (the site has no site/blueprints today).
- Adding Spanish (es) content, or removing the es language definition.
- Refactoring site-methods (echoing markup from site methods, the unescaped alt attributes in getResponsiveImage).

---

## Risks & notes

- The live-server failure is assumed to be the same PHP ≥ 8.5 guard. If Phase 1 shows the host runs PHP ≤ 8.4, the live fault is something else (e.g. hardcoded localhost url/debug config, missing bundle, permissions), and Phase 5's dry-run review must look for it explicitly.
- Kirby licence: Kirby 5 is a major release. Check that the site's licence covers 5.x (Kirby licences include major upgrades released within 3 years of purchase); an unregistered install still renders the frontend but shows a Panel notice.
- Kirby 5 may change thumb/media hashing, so every thumbnail regenerates on first request after deploy. Expect a slow first load, and consider running utils/build-media-cache.php afterwards.
- Vite 8 (Rolldown) may change chunk names or manifest structure. The vite-manifest plugin is the only consumer and Phase 3 checks the contract, but a missed mismatch shows up as missing JS only in production mode (debug false).
- The IONOS CLI php version can differ from the web PHP handler, so confirm in the control panel.
- deploy.sh pushes with rsync --delete, so a local app/content that is incomplete would delete live content. Phase 5's dry-run review must check deletions under content/ before any real deploy.
- app/index.php reflects any Origin with credentials allowed. It is out of scope here but should be fixed soon.

---

## Status

- [x] Phase 1 — Safety net, working PHP dev server, and smoke test
- [x] Phase 2 — Upgrade Kirby 4.8 → 5.5 and make the site boot on PHP 8.5
- [x] Phase 3 — Update npm packages and migrate the Vite config to Vite 8
- [x] Phase 4 — Deploy-safe config split and template/markup fixes
- [x] Phase 5 — End-to-end verification, docs, and deploy dry-run
- [x] Phase 6 — Upgrade Three.js 0.152 → latest and fix rendering regressions (optional)
