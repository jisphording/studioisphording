# Phase 3 — Remaining hand-built asset paths: project.three videos and the media-processing hook

**Depends on:** —
**Parallelizable with:** Phases 1, 2, 4, 5, 6, 7, 8, 9, 10, 11
**Recommended model:** Strong → Claude Sonnet 5 — Requires reading how project-gallery.php branches on $videoPath and deciding whether the parameter survives at all; more judgement than phase 2 but still a contained change.

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
> **Goal:** Close the other two places where a hand-built path substitutes for a Kirby URL, and stop the Panel-upload fatal on site-level files.
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
> 1. Read app/site/snippets/project-gallery.php:11-30 and establish exactly what the $videoPath branch does differently from the default Kirby-file branch.
> 2. Confirm the defect: load /de/projects/isphording-inneneinrichtung locally and check the case-study video inserts request /app/video/<name>.mp4 and 404.
> 3. Establish where those case-study videos actually live. If they are page files, drop the 'videoPath' => 'app/video/' argument at app/site/templates/project.three.php:22 so the snippet falls through to its working Kirby-file branch, and delete the now-unused $videoPath branch from the snippet.
> 4. If the files genuinely live outside the content tree, keep a path parameter but make it resolve through url() against app/assets or a real route rather than the bare string 'app/video/' - and say so in the phase's build-log findings.
> 5. In app/site/plugins/media-processing/index.php:11, guard the $file->parent()->diruri() call: only build the jobs path when the parent is a Kirby\Cms\Page. For a site-level file the media root is media/site/<hash>, not media/pages/..., so either handle that branch explicitly or return early.
> 6. Confirm no other template or snippet builds a '/content/' or 'app/video/' URL: `grep -rn "'/content/\|app/video/" app/site/`.
> 7. Verify in a browser that the case-study video inserts on a project.three page load and play.
>
> **Acceptance criteria:**
> - `grep -rn "app/video/" app/site/` returns nothing, or only a comment explaining a real resolved route.
> - `grep -rn "'/content/" app/site/` returns nothing.
> - On /de/projects/isphording-inneneinrichtung the case-study video inserts return 200 and play in a browser.
> - The media-processing file.create:after hook no longer calls diruri() on a non-Page parent.
> - PORT=8011 bash scripts/smoke.sh passes.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 3 done in `02-frontend-fidelity-and-deploy-safety/00-master.md`.

---

## Verification

- `PORT=8011 bash scripts/smoke.sh`
- `grep -rn "app/video/" app/site/ ; test $? -eq 1`
- Open a project.three page in a browser and confirm the iPhone/iPad case-study video inserts load and play.


---

## Notes

- Required reading (inline its contents): `app/site/snippets/project-gallery.php`.
- Required reading (inline its contents): `app/site/templates/project.three.php`.
- Required reading (inline its contents): `app/site/plugins/media-processing/index.php`.
