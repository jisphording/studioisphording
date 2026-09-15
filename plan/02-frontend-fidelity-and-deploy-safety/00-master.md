---
plan: 02-frontend-fidelity-and-deploy-safety
created: 2026-09-16
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

# Frontend fidelity, transition rework and deploy safety

**Goal:** Repair the three visible production defects (web fonts 404, invisible home showreel video, page transition revealing the old page), then clear the whole plan/improvements.md backlog: deploy-safety, repo hygiene, build toolchain, Three.js correctness and stale docs.

---

## Decisions locked in (from planning 2026-09-16)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Web font 404 root cause | The @font-face URLs are one path segment short, not missing files. | dev/css/templates/_typography.scss uses url("./../../assets/fonts/X.otf"), which Vite rewrites to url(../assets/fonts/X.otf) in app/assets/bundle/app.css. Relative to /assets/bundle/app.css that resolves to /assets/assets/fonts/X.otf. Measured live: reqid 13-16 all 404, and document.fonts reports status 'error' for all five faces while /assets/fonts/RadioGrotesk-Regular.otf itself returns 200 and is a valid OTTO/CFF file byte-identical to the local copy. |
| 2 | Font format order | Serve woff2 -> woff -> otf and drop the leading local() entries. | app/assets/fonts already ships woff2, woff, ttf and otf for all five faces; woff2 is 30-45% smaller (17.6 kB vs 25.4 kB for RadioGrotesk-Regular). local() first lets a designer's installed copy silently mask a broken url(), which is exactly what hid this bug. |
| 3 | Home showreel video root cause | home.php builds /content/<diruri>/ URLs, which app/.htaccess rewrites to index.php. | app/site/templates/home.php:21 sets $contentPath = '/content/' . $page->diruri() . '/'. Live markup emits /content/home/landing_reel.mp4; measured 404 on .mp4, .webm and .ogg, video.networkState 3 (NO_SOURCE), readyState 0. app/.htaccess:30 'RewriteRule ^content/(.*) index.php [L]' blocks the whole tree by design. The files exist (app/content/home/landing_reel.{mp4,webm,jpg}) and the Showreel field is 'landing_reel'. |
| 4 | Page transition root cause | The reveal animation plays while the OLD container is still in the DOM; Barba removes it only after enter() resolves. | Instrumented live: at t=800ms the wipe-in completes and afterLeave fires with 1 container; at t=851ms the next container is appended (2 containers); the 1.8s loaderOut wipe runs t=1050-2650 with both containers present and document.querySelector('h1') still reading 'Studio Isphording'; the old container is removed at t=2751, after the reveal finished. Barba appends next.container before leave resolves and removes current.container only after enter resolves, so awaiting the reveal inside enter() defers the removal past it. |
| 5 | Transition fix shape | Remove the outgoing container explicitly at the end of leave(), then gate the reveal on the incoming page's assets with a timeout ceiling and a minimum cover floor. | User requirement: 'use the transition animation to actually load and then show the new page.' Explicit removal in leave() makes Barba's own removal a no-op and guarantees only the new container exists when the wipe opens. The readiness gate (document.fonts.ready, image decode for above-the-fold images, video canplay) with a ~3s cap and a ~400ms floor keeps the loader honest without ever hanging. |
| 6 | WebGL readiness in the transition gate | Do NOT block the reveal on the Three.js world being ready. | User chose the 'assets ready, with timeout' option over the variant that also waits for WebGL. Heavy glTF pages would hold the loader for seconds; the canvas fading in after the reveal is acceptable. |
| 7 | Kirby core in git | git rm -r --cached app/kirby and have scripts/deploy.sh run composer install --no-dev before rsync. | User decision. app/kirby/ is gitignored yet 551 files are still tracked in HEAD, so the 5.5.3 upgrade reads as a phantom diff. Untracking keeps the repo small and pins the core in composer.json. |
| 8 | Deploy safety for gitignored runtime trees | Add rsync excludes for every gitignored runtime tree plus a preflight guard that aborts when a required local tree is missing or empty. | User decision. scripts/deploy.sh:70 mirrors app/ with --delete but EXCLUDES (scripts/deploy.sh:47-57) covers only site/cache, site/sessions, site/accounts, the two local config overrides, /media/, .git and OS junk. app/assets/, app/content/ and app/video/ are all in .gitignore, so a deploy from a fresh clone would delete the live fonts, the Three.js glTF/env-map/Draco assets and every content file. |
| 9 | Live bundle is stale relative to the repo | Treat the repo as the source of truth and note the drift; do not reverse-engineer production CSS. | Live computed style gives h1 font-family 'Monument-Extended', while dev/css/templates/_typography.scss:58 assigns 'Grafier-Regular' to h1-h6. The deployed bundle predates the current SCSS. Phase 11 records this so the first real deploy after this plan is expected to change heading typography. |
| 10 | Backlog purge | plan/improvements.md is captured byte-for-byte into this plan folder now, and truncated back to its empty template only in the final phase, after all preceding phases are done. | User requirement: 'make sure that all the ideas from the improvements file are purged after plan execution so that i do not implement them twice.' Capturing first makes the truncation safe; truncating last makes it honest. |

> Defaults chosen on the user's behalf are recorded here as defaults, not requirements.

---

## Codebase context

Facts derived from the current code that constrain the work below. Each cites `file:line`.

- @font-face src is url("./../../assets/fonts/<Name>.otf") for all five faces; only .otf is referenced even though woff2/woff/ttf exist alongside it. (`dev/css/templates/_typography.scss:4-47`)
- Built CSS contains url(../assets/fonts/<Name>.otf) and is served at /assets/bundle/app.css, so every font request lands on /assets/assets/fonts/ and 404s. (`app/assets/bundle/app.css`)
- All five faces exist in app/assets/fonts/ as .otf, .woff2, .woff and .ttf, and the .otf files are valid OpenType (OTTO/CFF) - the local RadioGrotesk-Regular.otf is byte-identical (sha1 93fd317f...) to the copy the live server serves at /assets/fonts/. (`app/assets/fonts/`)
- app/assets/ is gitignored in its entirety, so the fonts and the Three.js assets are present on disk but untracked - they were downloaded from the live server. (`.gitignore`)
- app/assets/three/{libs/draco,meshes,textures} now exist locally, resolving the two Phase 5 'missing assets' entries in the backlog. (`app/assets/three/`)
- home.php builds $contentPath = '/content/' . $page->diruri() . '/' and uses it for the video poster, all three <source> elements and the download fallback link. (`app/site/templates/home.php:16-30`)
- Kirby's shipped .htaccess rewrites every /content/* request to index.php, so no content path is ever a working asset URL. (`app/.htaccess:29-30`)
- The home page's Showreel field is 'landing_reel' in de/en/it, and app/content/home/ holds landing_reel.mp4 (23.7 MB), landing_reel.webm (20.6 MB) and landing_reel.jpg. There is no .ogg file, so the third <source> can only ever 404. (`app/content/home/`)
- project.three.php passes 'videoPath' => 'app/video/' into project-gallery.php, which builds URLs like http://<host>/app/video/<name>.mp4 - a path with no corresponding Kirby route. (`app/site/templates/project.three.php:22`)
- The media-processing plugin's file.create:after hook calls $file->parent()->diruri(), which fatals for site-level files because the parent is a Site, not a Page. (`app/site/plugins/media-processing/index.php:11`)
- The Barba transition's leave() awaits the wipe-in and enter() awaits prepareNewPage() then the 1.8s animateLoaderOut, so the reveal is inside enter() - which is what defers Barba's removal of the outgoing container past the reveal. (`dev/js/animation/animBarba.mjs:81-89`)
- prepareNewPage waits two rAFs plus a fixed 100ms setTimeout and then re-runs animGsap(), restartVideos() and ScrollTrigger.refresh(); it never inspects whether any incoming asset has actually loaded. (`dev/js/animation/animBarba.mjs:99-119`)
- The loading screen is position:fixed, 100vw x 200vh, z-index 99999, and lives outside the Barba container, so it does cover both containers during the swap. (`dev/css/templates/_loadingscreen.scss:3-12`)
- html.is-transitioning forces .loadingScreen visible with !important and html.js-ready hides it; the class is added in barba.hooks.before and removed in barba.hooks.after, so any reveal logic must stay inside that window. (`dev/css/templates/_loadingscreen.scss:90-103`)
- The Barba container wraps the header, the page body, the footer AND the CDN script tags for GSAP, ScrollTrigger and @barba/core, which are emitted by js([...], true) inside the container div. (`app/site/snippets/header.php:28-30 and app/site/snippets/footer.php:27-34`)
- vite.config.build.js declares a second rollup entry three: dev/js/three/runExperience.js, but dev/js/index.js already statically imports runExperience.js and nothing in app/site references three.bundle.js - the 78 kB three.bundle.js output is dead. (`vite.config.build.js:20-23`)
- publicDir is set to 'assets' with root './dev', i.e. dev/assets - a directory that does not exist (dev/ holds only css/ and js/). Nothing is copied through Vite's public pipeline today. (`vite.config.build.js:65`)
- package.json has no "type" field, so all three ESM vite configs emit a configLoader: 'native' CJS-syntax warning on every run; dev:assets-only is referenced only by readme/QUICK_START.md:72. (`package.json`)
- smoke.sh backgrounds php -S and then polls curl, but never checks that its own server bound the port - an occupied port silently tests whatever else is listening. (`scripts/smoke.sh:25-35`)
- smoke.sh asserts HTTP 200 and the absence of PHP-error markers only; it never requests a font, a video or the CSS bundle, which is why a site-wide 404 on every web font passed the gate. (`scripts/smoke.sh:63-98`)
- deploy.sh mirrors app/ to the remote root with --delete and its EXCLUDES list does not mention /assets/, /content/ or /video/, all three of which are gitignored. (`scripts/deploy.sh:47-70`)
- git ls-files app/kirby returns 551 tracked files even though app/kirby/ is gitignored. (`.gitignore`)
- plan/_archive/ holds exactly one earlier plan, 01-kirby5-php85-recovery, so this plan takes prefix 02. (`plan/_archive/`)
- app/content/projects/ contains no moodboard page, so the moodboard template is unreachable via any URL. (`app/content/projects/`)

---

## Cross-cutting conventions (every phase honours these)

- Every phase ends green on `PORT=8011 bash scripts/smoke.sh` (port 8000 is held by an unrelated local service on this machine).
- Any change to dev/css or dev/js requires `npm run build` before smoke, because app/assets/bundle is the only thing app/site/snippets/header.php loads in production mode.
- Never edit app/content/ - the home showreel fields already carry the values the templates need.
- Prefer Kirby's own URL helpers ($page->file(...)->url(), $file->url()) over hand-built paths; app/.htaccess:30 rewrites every /content/* request to index.php, so a content path is never a working URL.
- Font, video and transition fixes must be verified against a real browser (chrome-devtools MCP) in addition to smoke, because smoke only asserts HTTP 200 and clean markup.

---

## Phase index

| Phase | Depends on | Parallelizable with | Model | File |
|-------|-----------|---------------------|-------|------|
| 1 Web fonts: fix the resolved URL and modernise the @font-face stack | — | 2, 3, 4, 5, 10, 11 | Fast → Claude Sonnet 5 | `01-web-fonts-fix-the-resolved-url-and-modernise-the-font-face-stack.md` |
| 2 Home showreel video: resolve through Kirby file URLs | — | 1, 3, 4, 5, 6, 7, 8, 10, 11 | Strong → Claude Sonnet 5 | `02-home-showreel-video-resolve-through-kirby-file-urls.md` |
| 3 Remaining hand-built asset paths: project.three videos and the media-processing hook | — | 1, 2, 4, 5, 6, 7, 8, 9, 10, 11 | Strong → Claude Sonnet 5 | `03-remaining-hand-built-asset-paths-project-three-videos-and-the-media-processing-hook.md` |
| 4 Page transition: remove the outgoing container before the reveal | — | 1, 2, 3, 6, 7, 8, 9, 10, 11 | Heavy → Claude Opus 5 | `04-page-transition-remove-the-outgoing-container-before-the-reveal.md` |
| 5 Page transition: gate the reveal on the incoming page being ready | 4 | 1, 2, 3, 6, 7, 8, 9, 10, 11 | Heavy → Claude Opus 5 | `05-page-transition-gate-the-reveal-on-the-incoming-page-being-ready.md` |
| 6 Untrack the Kirby core and install it via Composer on deploy | — | 2, 3, 4, 5, 11 | Strong → Claude Sonnet 5 | `06-untrack-the-kirby-core-and-install-it-via-composer-on-deploy.md` |
| 7 Deploy safety: exclude gitignored runtime trees and add a preflight guard | 6 | 2, 3, 4, 5, 11 | Heavy → Claude Opus 5 | `07-deploy-safety-exclude-gitignored-runtime-trees-and-add-a-preflight-guard.md` |
| 8 Build toolchain hygiene: dead entry, ESM configs, unused dev script | — | 2, 3, 4, 5, 11 | Strong → Claude Sonnet 5 | `08-build-toolchain-hygiene-dead-entry-esm-configs-unused-dev-script.md` |
| 9 Harden the smoke gate so a silent asset 404 cannot pass | 1, 2 | 3, 4, 5, 10, 11 | Strong → Claude Sonnet 5 | `09-harden-the-smoke-gate-so-a-silent-asset-404-cannot-pass.md` |
| 10 Three.js: one explicit resource-start protocol and a lockstep Draco decoder | — | 1, 2, 3, 4, 5, 9, 11 | Heavy → Claude Opus 5 | `10-three-js-one-explicit-resource-start-protocol-and-a-lockstep-draco-decoder.md` |
| 11 Three.js: canvas-relative hit-testing, listener leak, and dead shadow config | — | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Strong → Claude Sonnet 5 | `11-three-js-canvas-relative-hit-testing-listener-leak-and-dead-shadow-config.md` |
| 12 Documentation sweep and backlog purge | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 | — | Strong → Claude Sonnet 5 | `12-documentation-sweep-and-backlog-purge.md` |

Serial vs parallel is computed from `dependsOn` + file overlap. Phases marked
"parallelizable" can run in separate chats / git worktrees at the same time.

---

## Batches

- **Batch A — Visible production defects** (todo): phases 1, 2, 3
- **Batch B — Page transition rework** (todo): phases 4, 5
- **Batch C — Deploy and repo hygiene** (todo): phases 6, 7
- **Batch D — Build toolchain and verification gate** (todo): phases 8, 9
- **Batch E — Three.js correctness** (todo): phases 10, 11
- **Batch F — Docs and backlog purge** (todo): phases 12

---

## Out of scope (this plan)

- Running a real deploy. Every deploy-touching phase stops at scripts/deploy.sh --dry-run; the real push is a human call, per CLAUDE.md.
- Enabling Kirby's production pages cache. config.php leaves it off deliberately because languages.detect redirects risk serving one visitor's cached redirect to another; designing a cache strategy that is safe with language detection needs its own research pass, not a phase bolted onto this plan.
- Promoting the before/after WebGL capture harness (the capture.mjs/compare.mjs pair that imports puppeteer-core from an npx cache path) into a proper devDependency script. Worth doing before the next three.js major, but it is tooling for a future upgrade rather than a defect in the current site.
- Creating a moodboard content page. app/content/ is live content and off limits to this plan; phase 12 documents the template's unreachable status instead.
- Reverse-engineering or patching the currently deployed CSS bundle. The repo is the source of truth; the drift is recorded, not reconciled backwards.
- Waiting on the Three.js world before revealing a page transition. The user chose the asset-readiness gate without WebGL; heavy glTF pages would hold the loader too long.
- Adding es to the content languages. The config lists es but no content exists for it; that is a content decision, not a code one.

---

## Risks & notes

- Phase 7 is the one destructive-risk change: an rsync exclude in the wrong form either fails to protect a live tree or silently stops deploying app/assets/bundle. Both failure modes are invisible until a real deploy, which is why every acceptance check there reads the dry-run output rather than reasoning about the flags.
- app/assets/fonts and app/assets/three exist only on this machine and on the server - they are gitignored and untracked. If this working copy is lost before phase 7 lands, the only copies are the live server's. Consider taking a backup outside the repo before starting.
- Phase 6 removes 551 files from the git index. If app/composer.json does not actually pin Kirby 5.5, the next composer install could pull a different core than the one this site was tested against.
- The first real deploy after this plan will change production typography (Grafier-Regular headings instead of Monument-Extended), because the live bundle predates the current SCSS. That is expected, but it will look like a regression to anyone who has not read phase 12's findings.
- The transition readiness gate in phase 5 can make navigation feel slower on cold caches than the current broken-but-fast behaviour. The timeout ceiling and minimum floor are the tuning knobs; both are named constants so they can be adjusted without re-reading the logic.
- Phase 10 changes the Draco decoder to a build-generated artifact while phase 7 adds /assets/three/ to the deploy's exclude list. If those two are not reconciled, production keeps a stale decoder. Phase 10's acceptance requires stating explicitly how the decoder reaches production.
- scripts/smoke.sh is the only automated gate in this repo - there is no test suite. Every phase leans on it plus manual browser verification, so a defect it cannot see can still ship.

---

## Status

- [ ] Phase 1 — Web fonts: fix the resolved URL and modernise the @font-face stack
- [ ] Phase 2 — Home showreel video: resolve through Kirby file URLs
- [ ] Phase 3 — Remaining hand-built asset paths: project.three videos and the media-processing hook
- [ ] Phase 4 — Page transition: remove the outgoing container before the reveal
- [ ] Phase 5 — Page transition: gate the reveal on the incoming page being ready
- [ ] Phase 6 — Untrack the Kirby core and install it via Composer on deploy
- [ ] Phase 7 — Deploy safety: exclude gitignored runtime trees and add a preflight guard
- [ ] Phase 8 — Build toolchain hygiene: dead entry, ESM configs, unused dev script
- [ ] Phase 9 — Harden the smoke gate so a silent asset 404 cannot pass
- [ ] Phase 10 — Three.js: one explicit resource-start protocol and a lockstep Draco decoder
- [ ] Phase 11 — Three.js: canvas-relative hit-testing, listener leak, and dead shadow config
- [ ] Phase 12 — Documentation sweep and backlog purge
