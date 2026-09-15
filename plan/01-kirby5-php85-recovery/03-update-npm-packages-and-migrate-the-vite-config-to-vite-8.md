# Phase 3 — Update npm packages and migrate the Vite config to Vite 8

**Depends on:** 1
**Parallelizable with:** Phase 2
**Recommended model:** Strong → Claude Sonnet — Config migration against published guides with a concrete output contract to check.
**Cost sensitivity:** medium
**Alternatives:**
- Anthropic Claude Opus — better when If Rolldown's chunking or terser integration fails in ways the migration guide does not cover.; trade-off: Higher cost for what is usually mechanical config work.; cost higher

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
> **Goal:** Bring Vite, Sass and Terser to current releases and keep the production build's output contract (file names, manifest keys) identical.
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
> 1. Record the 'before' build contract: run `npm run build` on the current tree and save the file list of app/assets/bundle plus the keys of app/assets/bundle/.vite/manifest.json to the scratchpad.
> 2. Minor/patch pass first: `npm install -D sass@latest terser@latest vite@^5` and run `npm run build`. Fix any Sass deprecation errors in dev/css at the source; only use silenceDeprecations for warnings that come from third-party code.
> 3. Major pass: `npm install -D vite@latest` (8.x). Read the Vite 6, 7 and 8 migration guides and apply what applies: build.rollupOptions → build.rolldownOptions (or confirm the alias still works without a warning), replace object-form manualChunks {'vendor-three': ['three']} with the Rolldown equivalent (advancedChunks/codeSplitting groups or a function), keep minify:'terser' with terserOptions (terser stays a devDependency), and check that the css.preprocessorOptions.scss sourceMap option is still accepted.
> 4. Run `npm run build` and diff against the 'before' contract. app.bundle.js, three.bundle.js and app.css must keep those names at app/assets/bundle/, and the manifest must still be at .vite/manifest.json with entry keys for js/index.js and js/three/runExperience.js. If a key changes, update app/site/plugins/vite-manifest/index.php to match; it is the only consumer.
> 5. Run `npm run dev` and confirm the dev server starts on 9001 without config errors. Also check that the entry path templates request through vite() in debug mode (dev/js/index.js vs js/index.js under root './dev') resolves to a 200 from the Vite server. If not, normalise the plugin so that one entry name works for both the dev server and the manifest, and note it for Phase 4's template sweep.
> 6. Run `npm run dev:assets-only` once to confirm the third config still starts, or record that it is unused and propose removing it in the findings (do not delete it here).
> 7. If Vite 8 cannot build after reasonable effort, pin vite@^7 and record the blocking issue (decision fallback).
>
> **Acceptance criteria:**
> - `npm outdated` lists no outdated vite, sass or terser (three is excluded; it is Phase 6).
> - `npm run build` exits 0 and produces app/assets/bundle/app.bundle.js, three.bundle.js, app.css and .vite/manifest.json with the same entry keys as before (or the plugin was updated to match, and that is noted).
> - `npm run dev` starts without errors, and the entry URL used in debug mode returns 200 from the Vite server.
> - `npm audit --omit=dev` reports no high or critical issues, or the remaining ones are listed with the reason.
> - `npm run build` passes.
>
> **Cleanup step (same change):**
> - Update `CLAUDE.md` / README / the relevant docs for anything user-visible this change
>   touched.
> - Update any project memory / handoff notes a future session would need.
> - Run the project's build/test command and confirm it passes before marking done.
> - Log every improvement, latent bug or deferred idea this phase surfaced as a one-line
>   entry in `plan/improvements.md`; say plainly that nothing surfaced if nothing did.
> - Mark Phase 3 done in `01-kirby5-php85-recovery/00-master.md`.

---

## Verification

- `npm run build`
- `test -f app/assets/bundle/app.bundle.js && test -f app/assets/bundle/app.css && test -f app/assets/bundle/.vite/manifest.json`
- `node -e "const m=require('./app/assets/bundle/.vite/manifest.json'); if(!m['js/index.js']) process.exit(1)"`
- Start `npm run dev` and confirm there are no config errors or deprecation warnings in the terminal.

