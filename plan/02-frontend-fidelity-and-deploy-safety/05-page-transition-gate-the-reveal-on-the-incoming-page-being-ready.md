# Phase 5 — Page transition: gate the reveal on the incoming page being ready

**Depends on:** 4
**Parallelizable with:** Phases 1, 2, 3, 6, 7, 8, 9, 10, 11
**Recommended model:** Heavy → Claude Opus 5 — A readiness gate that can never hang and never feels sluggish is a real design problem: every await needs a bound, and the floor/ceiling interaction with the GSAP timeline has to be reasoned about rather than guessed.

---

## Paste-ready prompt

> You are working in the `studioisphording` repo (Kirby CMS 5.5 (flat-file, PHP 8.3-8.5, Composer 2.x) under app/, multi-language (de default, plus en/it/es), custom plugins in app/site/plugins (gallery, media-processing, site-methods, vite-manifest), no Panel/blueprints. Front-end: Vite 8 + Sass + Three.js built from dev/ into app/assets/bundle. Barba.js + GSAP loaded from CDN. Node >= 20.19. Deploy via rsync to IONOS (scripts/deploy.sh).). Read `CLAUDE.md` first and follow its
> house rules: Never modify app/content/ - it's live content, not test fixture data. Never run scripts/deploy.sh without --dry-run. Review the dry-run output before any real deploy; the real deploy is a human call, not something an agent runs. Never ssh to the server with a write command. Read-only checks (php -v, ls) only, and only after asking the user first. bash scripts/smoke.sh is the verification gate - leave it at least as green as you found it. Match the surrounding file's style: tabs in app/site templates/snippets/plugins, 4 spaces in app/site/config/config.php, 2 spaces in Vite configs and dev/js. Do not commit unless explicitly asked; leave changes staged/unstaged for review.
>
> **Conventions (every phase honours these):**
> - Every phase ends green on `PORT=8011 bash scripts/smoke.sh` (port 8000 is held by an unrelated local service on this machine).
> - Any change to dev/css or dev/js requires `npm run build` before smoke, because app/assets/bundle is the only thing app/site/snippets/header.php loads in production mode.
> - Never edit app/content/ - the home showreel fields already carry the values the templates need.
> - Prefer Kirby's own URL helpers ($page->file(...)->url(), $file->url()) over hand-built paths; app/.htaccess:30 rewrites every /content/* request to index.php, so a content path is never a working URL.
> - Font, video and transition fixes must be verified against a real browser (chrome-devtools MCP) in addition to smoke, because smoke only asserts HTTP 200 and clean markup.
>
> **Goal:** Make the transition animation do real work - hold the cover until the new page's fonts, visible images and video are ready, then reveal.
>
> **Context / current locations:**
> - @font-face src is url("./../../assets/fonts/<Name>.otf") for all five faces; only .otf is referenced even though woff2/woff/ttf exist alongside it. (`dev/css/templates/_typography.scss:4-47`)
> - Built CSS contains url(../assets/fonts/<Name>.otf) and is served at /assets/bundle/app.css, so every font request lands on /assets/assets/fonts/ and 404s. (`app/assets/bundle/app.css`)
> - All five faces exist in app/assets/fonts/ as .otf, .woff2, .woff and .ttf, and the .otf files are valid OpenType (OTTO/CFF) - the local RadioGrotesk-Regular.otf is byte-identical (sha1 93fd317f...) to the copy the live server serves at /assets/fonts/. (`app/assets/fonts/`)
> - app/assets/ is gitignored in its entirety, so the fonts and the Three.js assets are present on disk but untracked - they were downloaded from the live server. (`.gitignore`)
> - app/assets/three/{libs/draco,meshes,textures} now exist locally, resolving the two Phase 5 'missing assets' entries in the backlog. (`app/assets/three/`)
> - home.php builds $contentPath = '/content/' . $page->diruri() . '/' and uses it for the video poster, all three <source> elements and the download fallback link. (`app/site/templates/home.php:16-30`)
> - Kirby's shipped .htaccess rewrites every /content/* request to index.php, so no content path is ever a working asset URL. (`app/.htaccess:29-30`)
> - The home page's Showreel field is 'landing_reel' in de/en/it, and app/content/home/ holds landing_reel.mp4 (23.7 MB), landing_reel.webm (20.6 MB) and landing_reel.jpg. There is no .ogg file, so the third <source> can only ever 404. (`app/content/home/`)
> - project.three.php passes 'videoPath' => 'app/video/' into project-gallery.php, which builds URLs like http://<host>/app/video/<name>.mp4 - a path with no corresponding Kirby route. (`app/site/templates/project.three.php:22`)
> - The media-processing plugin's file.create:after hook calls $file->parent()->diruri(), which fatals for site-level files because the parent is a Site, not a Page. (`app/site/plugins/media-processing/index.php:11`)
> - The Barba transition's leave() awaits the wipe-in and enter() awaits prepareNewPage() then the 1.8s animateLoaderOut, so the reveal is inside enter() - which is what defers Barba's removal of the outgoing container past the reveal. (`dev/js/animation/animBarba.mjs:81-89`)
> - prepareNewPage waits two rAFs plus a fixed 100ms setTimeout and then re-runs animGsap(), restartVideos() and ScrollTrigger.refresh(); it never inspects whether any incoming asset has actually loaded. (`dev/js/animation/animBarba.mjs:99-119`)
> - The loading screen is position:fixed, 100vw x 200vh, z-index 99999, and lives outside the Barba container, so it does cover both containers during the swap. (`dev/css/templates/_loadingscreen.scss:3-12`)
> - html.is-transitioning forces .loadingScreen visible with !important and html.js-ready hides it; the class is added in barba.hooks.before and removed in barba.hooks.after, so any reveal logic must stay inside that window. (`dev/css/templates/_loadingscreen.scss:90-103`)
> - The Barba container wraps the header, the page body, the footer AND the CDN script tags for GSAP, ScrollTrigger and @barba/core, which are emitted by js([...], true) inside the container div. (`app/site/snippets/header.php:28-30 and app/site/snippets/footer.php:27-34`)
> - vite.config.build.js declares a second rollup entry three: dev/js/three/runExperience.js, but dev/js/index.js already statically imports runExperience.js and nothing in app/site references three.bundle.js - the 78 kB three.bundle.js output is dead. (`vite.config.build.js:20-23`)
> - publicDir is set to 'assets' with root './dev', i.e. dev/assets - a directory that does not exist (dev/ holds only css/ and js/). Nothing is copied through Vite's public pipeline today. (`vite.config.build.js:65`)
> - package.json has no "type" field, so all three ESM vite configs emit a configLoader: 'native' CJS-syntax warning on every run; dev:assets-only is referenced only by readme/QUICK_START.md:72. (`package.json`)
> - smoke.sh backgrounds php -S and then polls curl, but never checks that its own server bound the port - an occupied port silently tests whatever else is listening. (`scripts/smoke.sh:25-35`)
> - smoke.sh asserts HTTP 200 and the absence of PHP-error markers only; it never requests a font, a video or the CSS bundle, which is why a site-wide 404 on every web font passed the gate. (`scripts/smoke.sh:63-98`)
> - deploy.sh mirrors app/ to the remote root with --delete and its EXCLUDES list does not mention /assets/, /content/ or /video/, all three of which are gitignored. (`scripts/deploy.sh:47-70`)
> - git ls-files app/kirby returns 551 tracked files even though app/kirby/ is gitignored. (`.gitignore`)
> - plan/_archive/ holds exactly one earlier plan, 01-kirby5-php85-recovery, so this plan takes prefix 02. (`plan/_archive/`)
> - app/content/projects/ contains no moodboard page, so the moodboard template is unreachable via any URL. (`app/content/projects/`)
>
> **Do this:**
> 1. Write a `waitForPageReady(container, { timeout })` helper in dev/js/animation/animBarba.mjs that resolves when the incoming container is presentable, and ALWAYS resolves - never rejects, never hangs.
> 2. Inside it, race a Promise.all of the readiness signals against a single timeout promise. Signals: (a) document.fonts.ready; (b) for every <img> in the container that intersects the initial viewport, either img.complete or img.decode() caught to a no-op; (c) for every <video autoplay> in the container, a one-shot 'canplay' or 'loadeddata' listener, resolved immediately if readyState >= 2.
> 3. Attach every listener with { once: true } and clear it in a finally, so a timed-out navigation cannot leak listeners onto a detached container.
> 4. Set the timeout ceiling to 3000ms as the default and expose it as a named constant at the top of the module so it is tunable in one place.
> 5. Add a minimum cover floor of ~400ms measured from the moment the wipe-in completes, so a warm cache does not produce a jarring instant flash-open. Implement it as `await Promise.all([waitForPageReady(...), minCoverDelay])`.
> 6. Call the gate in enter(), after the outgoing container has been removed (phase 4) and after the two rAF ticks, and only then start animateLoaderOut.
> 7. Reduce animateLoaderOut's duration from 1.8s to something proportionate now that the cover is doing real work - the reveal no longer needs to stall for content. Pick a value that keeps the total perceived transition under about 2s on a warm cache and say why in the build-log findings.
> 8. Handle the slow path explicitly: when the gate times out, still reveal. A visibly incomplete page is better than a stuck loader.
> 9. Respect prefers-reduced-motion: when it is set, collapse both wipes to a short cross-fade but keep the readiness gate, since the gate is correctness and the wipe is decoration.
> 10. Rebuild and verify on both a warm cache and a throttled Slow 3G profile: on Slow 3G the loader must stay closed while the hero video buffers and must never stay closed past the ceiling.
>
> **Acceptance criteria:**
> - animBarba.mjs exports/holds a waitForPageReady helper that resolves on fonts + visible images + autoplay video readiness, and is bounded by a single named timeout constant.
> - The reveal never starts before the minimum cover floor has elapsed, and never starts later than floor + ceiling.
> - On a throttled Slow 3G profile, navigating to the home page keeps the loader closed until the hero video reports readyState >= 2 or the ceiling expires - and the loader always opens.
> - On a warm cache the whole transition completes in under about 2 seconds and the revealed page is already painted with its fonts applied.
> - No 'canplay' or image listener remains attached after a timed-out navigation.
> - With prefers-reduced-motion: reduce, the transition cross-fades instead of wiping and still gates on readiness.
> - npm run build succeeds and PORT=8011 bash scripts/smoke.sh passes.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 5 done in `02-frontend-fidelity-and-deploy-safety/00-master.md`.

---

## Verification

- `npm run build`
- `PORT=8011 bash scripts/smoke.sh`
- Navigate between pages with the network throttled to Slow 3G and confirm the loader holds until the incoming video is ready, opens by the timeout ceiling at the latest, and reveals an already-painted page.
- Repeat with prefers-reduced-motion: reduce forced on and confirm the cross-fade path still gates on readiness.


---

## Notes

- Required reading (inline its contents): `dev/js/animation/animBarba.mjs`.
