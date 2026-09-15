# Phase 4 — Deploy-safe config split and template/markup fixes

**Depends on:** 2, 3
**Parallelizable with:** None
**Recommended model:** Strong → Claude Sonnet — The config split and markup fixes are fully specified; the only judgement is picking a consistent vite() entry name.
**Cost sensitivity:** medium
**Alternatives:**
- Anthropic Claude Haiku — better when For the markup fixes alone.; trade-off: Weaker at the Kirby config-merge and asset-loading reasoning.; cost lower

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
> **Goal:** Separate localhost-only settings from production config, align asset loading with the vite-manifest plugin, and fix the known HTML faults in the templates.
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
> 1. Rewrite app/site/config/config.php as production-safe: keep markdown/content/smartypants/languages/thumbs/custom/media options, set 'debug' => false, drop 'url' and 'vite.server', and re-enable the pages cache (or leave it off with a comment on why). Remove the non-Kirby 'media' => ['read' => true] key only if the Kirby 5 docs confirm it is not an option.
> 2. Create app/site/config/config.localhost.php returning the dev overrides: 'debug' => true, 'url' => 'http://localhost:8000', 'vite.server' => 'http://localhost:9001', and the pages cache off. Confirm that Kirby merges it when the site is served on localhost (both `npm run php` and smoke.sh use a localhost host; if smoke.sh binds 127.0.0.1, also add config.127.0.0.1.php or switch smoke.sh to localhost).
> 3. Make asset loading consistent with the vite-manifest plugin. Use one entry name in every vite() / vitePreloadLinks() call (header.php, footer.php, moodboard.php, project.three.php), matching whatever Phase 3 settled on. In production (debug false) the page must load app.css and the app bundle exactly once, so remove the duplicate app.css <link> if vite() already emits it, and check that the footer's module script and vite() do not both inject app.bundle.js.
> 4. Fix the markup faults: imprint.php '<article>' → '</article>', and remove the stray '</body>' emitted before snippet('footer') in article.php, imprint.php and privacy.php (and check home.php for the same pattern). The footer snippet closes body/html.
> 5. Run `bash scripts/smoke.sh` (dev config, debug on). Then check production mode: temporarily serve with a non-localhost host header, e.g. `php -S 0.0.0.0:8001 -t app app/kirby/router.php` and `curl -H 'Host: studioisphording.test' …`, or add a PROD=1 mode to smoke.sh that does this. Confirm the pages render, contain no 'localhost:8000' or 'localhost:9001' URLs, and reference /assets/bundle/ files that exist.
>
> **Acceptance criteria:**
> - config.php contains no 'localhost' and has 'debug' => false. config.localhost.php holds the dev values.
> - Dev smoke (`bash scripts/smoke.sh`) exits 0.
> - Production-mode render of / and one project page contains no localhost URL, loads app.css and the app bundle exactly once, and every referenced /assets/bundle/ file exists on disk.
> - The HTML of /imprint, /privacy and one article-template page (if any content uses it) has exactly one </body> and balanced <article> tags. Check with `php -r` + DOMDocument or by counting with grep.
> - The `npm run dev` + `npm run php` workflow gives HMR on a CSS change in the browser.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 4 done in `01-kirby5-php85-recovery/00-master.md`.

---

## Verification

- `! grep -n localhost app/site/config/config.php`
- `grep -n "'debug' => false" app/site/config/config.php`
- `bash scripts/smoke.sh`
- With `npm run dev` and `npm run php` running, edit a colour in dev/css and confirm the page updates without a full reload.

