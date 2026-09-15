# Phase 7 — Deploy safety: exclude gitignored runtime trees and add a preflight guard

**Depends on:** 6
**Parallelizable with:** Phases 2, 3, 4, 5, 11
**Recommended model:** Heavy → Claude Opus 5 — This is the one destructive-risk change in the plan: rsync --delete semantics against a live server, where an exclude in the wrong form either fails to protect or silently stops deploying something that should ship.

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
> **Goal:** Make it impossible for a deploy from an incomplete clone to delete live fonts, Three.js assets, content or media.
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
> 1. Cross-read .gitignore against scripts/deploy.sh's EXCLUDES and write down, in the build log, every tree that is gitignored but NOT excluded from the --delete mirror. Expected: /assets/, /content/, /video/, and the favicon/index.php/.htaccess entries.
> 2. Decide per tree whether it is server-owned (never pushed, never deleted) or build-owned (pushed every time). app/assets/bundle is build-owned - the deploy builds it and must keep pushing it. app/assets/fonts, app/assets/three, app/content and app/video are server-owned binaries that git does not carry.
> 3. Add anchored rsync excludes for the server-owned trees, using the leading-slash form (--exclude='/content/') so they anchor at the transfer root and cannot accidentally match a nested directory of the same name.
> 4. Keep app/assets/bundle deploying. Because /assets/ as a whole must not be deleted but bundle must be pushed, use an include-before-exclude pair or exclude the specific sibling directories (/assets/fonts/, /assets/three/) rather than blanket-excluding /assets/. Verify whichever form you choose with a dry-run, not by reasoning alone.
> 5. Add a preflight section that runs before rsync and aborts with a clear message when a required local tree is missing or empty: app/assets/bundle (built), app/kirby/index.php (Composer), app/index.php and app/.htaccess. Use a helper function so each check reads as one line.
> 6. Extend the preflight to warn - not abort - when a server-owned tree is absent locally, since that is now expected and harmless.
> 7. Run `bash scripts/deploy.sh --dry-run` and read every line of the output that mentions 'deleting'. There must be no deletion of anything under /assets/fonts, /assets/three, /content or /video. Paste the relevant excerpt into the build-log findings.
> 8. Simulate the failure the guard exists for: temporarily move app/assets/bundle aside, confirm the preflight aborts, and restore it.
> 9. Document the ownership split in readme/QUICK_START.md: which trees live only on the server, which are built, and what a fresh clone must fetch before it can deploy.
>
> **Acceptance criteria:**
> - scripts/deploy.sh excludes /content/, /video/, /assets/fonts/ and /assets/three/ from the --delete mirror, with anchored paths.
> - app/assets/bundle is still pushed by the deploy - confirmed in the dry-run output.
> - A dry-run's output contains no 'deleting' line for any path under /assets/fonts, /assets/three, /content or /video.
> - With app/assets/bundle absent, scripts/deploy.sh aborts before reaching rsync with a message naming the missing tree.
> - readme/QUICK_START.md documents which trees are server-owned, which are built, and what a fresh clone needs.
> - No real deploy was run - dry-run only.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 7 done in `02-frontend-fidelity-and-deploy-safety/00-master.md`.

---

## Verification

- `bash scripts/deploy.sh --dry-run`
- Read the full dry-run output and confirm no server-owned tree appears on a 'deleting' line.
- Move app/assets/bundle aside, re-run the dry-run, confirm the preflight aborts, then restore it.


---

## Notes

- Required reading (inline its contents): `scripts/deploy.sh`.
- Required reading (inline its contents): `.gitignore`.
