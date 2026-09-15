# Phase 5 — End-to-end verification, docs, and deploy dry-run

**Depends on:** 4
**Parallelizable with:** None
**Recommended model:** Strong → Claude Sonnet — A verification and docs sweep with clear criteria. The independent stage-2 review adds a second pair of eyes before a production deploy.
**Cost sensitivity:** medium
**Alternatives:**
- OpenAI GPT — better when As the independent stage-2 reviewer, if you want a different vendor than the implementing phases.; trade-off: Needs the repo context handed over.; cost similar

---

## Paste-ready prompt

> You are working in the `studioisphording` repo (Kirby CMS (4.8.0 installed, upgrading to 5.5.x) flat-file site under app/, multi-language (de default, en, it, es), custom plugins in app/site/plugins; front-end built with Vite 5 + Sass + Three.js 0.152 from dev/ into app/assets/bundle; PHP 8.5.7 (Homebrew), Composer 2.10, Node 24.4, npm 11.4; deploy via rsync to IONOS (scripts/deploy.sh).). Read `CLAUDE.md` first and follow its
> house rules.
>
> **Conventions (every phase honours these):**
> - Match the surrounding file's indentation and comment style: tabs in app/site templates/snippets and most plugins, 4 spaces in app/site/config/config.php, 2 spaces in vite configs and dev/js.
> - Every phase must leave `bash scripts/smoke.sh` (created in Phase 1) at least as green as it found it, and phases after Phase 2 must leave it fully green.
> - Never modify app/content/ (live content). Never run scripts/deploy.sh without --dry-run, and never ssh to the server with a write command. Read-only ssh (php -v, ls) only after asking the user.
> - Do not commit; each phase ends with changes staged for the user's review (use /commit when the user asks).
>
> **Goal:** Prove the whole site works in dev and production mode, bring the workflow docs up to date, and prepare (not run) the live deploy.
>
> **Context / current locations:**
> - Root cause reproduced: Kirby 4.8.0's bootstrap die()s when PHP_VERSION >= 8.5.0, and local PHP is 8.5.7, so every request renders 'Change the PHP version to one supported by your version of Kirby'. (`app/kirby/bootstrap.php:7-12`)
> - app/composer.json requires php ^8.4.8 and getkirby/cms ^4.0. There is no app/composer.lock or app/vendor, and app/kirby/ (4.8.0) is gitignored and was copied from the server. (`app/composer.json:6-9; .gitignore:8`)
> - config.php hardcodes 'debug' => true, 'url' => 'http://localhost:8000' and 'vite.server' => 'http://localhost:9001'. deploy.sh pushes all of app/ to production, so these values would go live. (`app/site/config/config.php:27-30; scripts/deploy.sh:68`)
> - The vite-manifest plugin's vite() helper chooses between the Vite dev server and the built manifest from option('debug'). Templates call vite('dev/js/index.js'), but with Vite root './dev' the manifest key is 'js/index.js' (footer uses vitePreloadLinks('js/index.js')). The entry naming is inconsistent. (`app/site/plugins/vite-manifest/index.php:68-95; app/site/snippets/header.php:19; app/site/snippets/footer.php:35; vite.config.build.js:5`)
> - `npm run php` runs `php -S localhost:8000 -t app` without Kirby's router, so pretty URLs (/about, /projects/…) 404 on the built-in server. The router exists at app/kirby/router.php. (`package.json:10`)
> - The production build writes to app/assets/bundle with fixed names app.bundle.js / three.bundle.js / app.css plus a manifest at .vite/manifest.json. It uses terser and an object-form manualChunks {'vendor-three': ['three']}. (`vite.config.build.js:13-45`)
> - npm outdated: vite 5.4.19 (latest 8.3.0), sass 1.63.6 (1.104.1), terser 5.43.1 (5.51.2), three 0.152.2 (0.186.0). dat.gui and stats-js are current. dev/css has no @import and uses @use, so Sass's @import deprecation does not apply. (`package.json:15-25`)
> - Custom plugins: gallery (kirbytags:after hook), media-processing (file.create:after hook using mediaHash/diruri), site-methods (getThumbnail, getResponsiveImage, pullRelatedPages, displayShowcase), vite-manifest. None uses Panel/blueprint APIs, and there is no site/blueprints directory. (`app/site/plugins/*/index.php`)
> - Languages de (default), en, it, es are defined in site/languages, but content only has de/en/it variants. 'languages.detect' => true. (`app/site/languages/*.php; app/site/config/config.php:11-12`)
> - Live-only template bugs: imprint.php closes the article with '<article>' instead of '</article>', and article/imprint/privacy emit '</body>' before snippet('footer'), which closes body/html again. (`app/site/templates/imprint.php:10; app/site/templates/article.php:40-42; app/site/templates/privacy.php:13-15`)
> - ionos-live-reference/site is an older copy of the live templates/snippets/config (live config.php has dead Kirby-2 `c::set(...)` after `return` and the typo 'language.detect'). It is gitignored and kept for manual diffing. (`ionos-live-reference/site/config/config.php:1-15; .gitignore:40-42`)
> - app/index.php (gitignored) reflects any Origin into Access-Control-Allow-Origin together with Allow-Credentials: true. (`app/index.php:4-10`)
> - readme/QUICK_START.md claims `npm run dev` starts both PHP and Vite and mentions `npm run dev:full`, but package.json has no such behaviour or script. (`readme/QUICK_START.md:38,70; package.json:6-13`)
>
> **Do this:**
> 1. From a clean checkout state, run the full sequence: `cd app && composer install`, `npm ci`, `npm run build`, `bash scripts/smoke.sh`, plus the production-mode check from Phase 4. Record the output.
> 2. Browser pass with `npm run php` (and `npm run dev` for debug mode): home showreel video, about, projects grid (responsive images and thumbs generate), a project page, project.three (WebGL canvas), moodboard, imprint and privacy, in de/en/it. Record any console errors. Fix trivial ones; log the rest to plan/improvements.md.
> 3. Update readme/QUICK_START.md to the real workflow: prerequisites (PHP 8.3–8.5, Composer, Node ≥ 20.19), `composer install` in app/, `npm run dev` + `npm run php` in two terminals, `bash scripts/smoke.sh`, and the config.localhost.php convention. Remove the false `npm run dev:full` / 'dev starts both servers' claims. README.md is UTF-16 — convert it to UTF-8 only if editing it is needed.
> 4. Create a short CLAUDE.md at the repo root listing the stack, the commands above, the smoke test as the verification gate, and the rules 'never commit app/content' and 'deploy only via scripts/deploy.sh after --dry-run'.
> 5. Deploy readiness: make sure the server PHP (Phase 1 finding) is 8.3, 8.4 or 8.5. If it is not, write down the IONOS control-panel change the user has to make. Check that deploy.sh's excludes keep site/accounts, sessions, cache and media on the server, and that the push includes app/kirby (5.5) and the new config.localhost.php. That file is harmless on production because it only merges on a localhost host, but consider excluding it.
> 6. Ask the user before any ssh, then run `bash scripts/deploy.sh --dry-run` and summarise what would change: new Kirby core, templates, config and bundle. Point out anything surprising, especially deletions under content/. Stop there. The real deploy is the user's call.
>
> **Acceptance criteria:**
> - The clean-sequence commands all exit 0, and the output is recorded in the phase findings.
> - The browser pass covers every template type in 3 languages, with console errors fixed or logged.
> - QUICK_START.md describes commands that exist and work; CLAUDE.md exists.
> - A deploy dry-run summary exists (or it is recorded that the user declined ssh), with a go/no-go checklist that includes the server PHP version.
> - No real deploy was run.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 5 done in `01-kirby5-php85-recovery/00-master.md`.

---

## Verification

- `npm run build`
- `bash scripts/smoke.sh`
- `test -f CLAUDE.md`
- Browser click-through of every template type in de/en/it with devtools open.
- Review the deploy.sh --dry-run output before approving a real deploy.

