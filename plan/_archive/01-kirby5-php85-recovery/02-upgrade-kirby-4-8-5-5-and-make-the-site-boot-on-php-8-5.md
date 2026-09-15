# Phase 2 — Upgrade Kirby 4.8 → 5.5 and make the site boot on PHP 8.5

**Depends on:** 1
**Parallelizable with:** Phase 3
**Recommended model:** Heavy → Claude Opus — Major-version upgrade with unknown breakages: the work is diagnosing runtime errors across plugins and templates, and a wrong fix is costly.
**Cost sensitivity:** low
**Alternatives:**
- Anthropic Claude Sonnet — better when If the first smoke run after `composer update` already passes or fails on one or two obvious API renames.; trade-off: Less reliable at root-causing unfamiliar Kirby internals.; cost lower

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
> **Goal:** Install Kirby 5.5.x through Composer with a committed lockfile and fix every PHP error or deprecation the upgrade surfaces in plugins, snippets and templates.
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
> 1. Read the Kirby 5 upgrade guide and changelog (getkirby.com/releases/5, /docs/guide/upgrade) and list the breaking changes that apply to this site's APIs: hooks (kirbytags:after, file.create:after), $file->mediaHash(), $page->diruri(), thumb()/crop()/srcset(), Collection::not() with several args, e(), t(), the languages config, and snippet() return mode.
> 2. In app/composer.json set "php": "~8.3.0 || ~8.4.0 || ~8.5.0" and "getkirby/cms": "^5.5". Keep allow-plugins for getkirby/composer-installer so the core still installs into app/kirby.
> 3. Confirm the Phase 1 tarball exists, remove app/kirby (it is gitignored and the tarball is the rollback), then run `composer update` in app/. Confirm app/kirby/composer.json reports 5.5.x and that the bootstrap version guard allows 8.5.
> 4. Clear Kirby's caches and generated media (rm -rf app/site/cache/* except index.html; rm -rf app/media) so the 4.x thumb jobs and cache entries do not interfere.
> 5. Run `bash scripts/smoke.sh`. For each failing URL, open it with debug on (config.php already has debug=true at this point) and fix the root cause in the plugin, snippet or template. Keep fixes minimal and API-level; layout and markup cleanup belong in Phase 4.
> 6. Check the four languages: de at /, en at /en, it at /it. es has no content, so do not add it to the smoke list, but make sure it does not fatal.
>
> **Acceptance criteria:**
> - app/kirby/composer.json version is 5.5.x, and app/composer.lock exists and pins it.
> - `bash scripts/smoke.sh` exits 0 on PHP 8.5.7: every listed URL returns 200 with no error, warning, notice or deprecation text.
> - No change under app/content/.
> - Every code change is listed with the Kirby 5 breaking change that caused it in the phase build-log findings.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 2 done in `01-kirby5-php85-recovery/00-master.md`.

---

## Verification

- `grep -m1 '"version": "5.5' app/kirby/composer.json`
- `test -f app/composer.lock`
- `bash scripts/smoke.sh`
- `git status --porcelain app/content | (! grep .)`
- Open http://localhost:8000 with `npm run php` and click through home, about, projects, one project, imprint and privacy in de/en/it. Pages render with images (thumbs generate).

## Run state

- Verified by: prompt-forge:verify (inline, Stage A/B)

