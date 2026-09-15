# Phase 1 — Safety net, working PHP dev server, and smoke test

**Depends on:** —
**Parallelizable with:** None
**Recommended model:** Strong → Claude Sonnet — Well-specified scripting and one read-only diagnostic; nothing novel to design.
**Cost sensitivity:** medium
**Alternatives:**
- Anthropic Claude Haiku — better when If the smoke script is written by hand and only the npm script tweak remains.; trade-off: Weaker at shell edge cases (traps, background server lifecycle).; cost lower

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
> **Goal:** Capture the current state, confirm the live server's PHP version, fix the local PHP server command, and add a smoke test that later phases use as their gate.
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
> 1. Make a local backup outside git of the current Kirby core: `tar -czf ~/studioisphording-kirby-4.8.0-backup.tgz -C app kirby` (so a rollback does not need the server).
> 2. Stage (do not commit) the pending baseline: the .gitignore change, scripts/deploy.sh, and the four live-only files app/site/templates/{article,imprint,privacy}.php and app/site/snippets/section-headline.php. Leave the files as they are; fixing them is Phase 4.
> 3. Ask the user for permission, then read the live PHP version read-only: `ssh ionos 'php -v; ls ~/studioisphording/kirby/composer.json && grep -m1 version ~/studioisphording/kirby/composer.json'`. Note that CLI php on IONOS can differ from the web PHP. If it looks ambiguous, ask the user to read the PHP version in the IONOS control panel for the studioisphording webspace. Record the result in the phase's build-log findings.
> 4. Change the `php` npm script to use Kirby's router so pretty URLs work: `php -S localhost:8000 -t app app/kirby/router.php`.
> 5. Create scripts/smoke.sh (bash, set -euo pipefail): start `php -S 127.0.0.1:8000 -t app app/kirby/router.php` in the background, wait until it answers, curl a URL list, then stop the server with a trap. The list is /, /about, /projects, every project folder under app/content/projects (derive the list with ls), /imprint, /privacy, and the same pages under /en and /it. For each URL, assert HTTP 200 and that the body contains none of: 'Change the PHP version', 'Whoops', 'Fatal error', 'Warning:', 'Deprecated:', 'Notice:'. Print a PASS/FAIL table and exit non-zero on any FAIL. Accept an optional BASE_URL/PORT override.
> 6. Run `bash scripts/smoke.sh` and confirm it FAILS on the PHP-version page. That is the recorded 'before' state and shows the harness catches the fault.
>
> **Acceptance criteria:**
> - A Kirby 4.8.0 backup tarball exists outside the repo.
> - The live PHP version (or the user's control-panel reading) is recorded in the phase findings, or it is explicitly recorded that the user declined the ssh check.
> - `npm run php` serves pretty URLs through app/kirby/router.php.
> - scripts/smoke.sh exists, is executable, and exits non-zero on the current tree, reporting the PHP-version error for every URL.
> - The four live-only template/snippet files and deploy.sh are staged, not committed.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 1 done in `01-kirby5-php85-recovery/00-master.md`.

---

## Verification

- `bash -n scripts/smoke.sh`
- `bash scripts/smoke.sh; test $? -ne 0`
- Confirm the recorded live PHP version against the IONOS control panel setting for the studioisphording webspace.

