# Findings — Phase 2: Upgrade Kirby 4.8 → 5.5 and make the site boot on PHP 8.5 — 2026-09-15

**Status:** complete
**Model used:** claude-opus-5
**Behaviour delta:** changed — the site boots on PHP 8.5.7 under Kirby 5.5.3; all 60 smoke URLs (de/en/it) return 200 with no PHP error text. The about-page mood film plays again.

## What was built

- `app/composer.json:7-8`: `"php": "~8.3.0 || ~8.4.0 || ~8.5.0"`, `"getkirby/cms": "^5.5"`. `allow-plugins` for `getkirby/composer-installer` is kept, so the core still installs into `app/kirby`.
- `app/composer.lock` (new): pins `getkirby/cms` 5.5.3 and 17 dependencies (symfony/yaml 7.4, claviska/simpleimage 4.4, phpmailer 7.1, …).
- `app/kirby/`: the Kirby 5.5.3 core, installed by Composer. `app/kirby/composer.json` reports `"version": "5.5.3"`, and the `app/kirby/bootstrap.php:17-27` guard now allows PHP ≥ 8.2 and < 8.6.
- `app/vendor/` (new): the Composer dependencies. `bootstrap.php:29-35` prefers `app/vendor/autoload.php`, and `scripts/deploy.sh` pushes it with the rest of `app/`.
- `.gitignore:9`: `app/vendor/` added next to `app/kirby/`.
- `app/site/cache/*` (except index.html) and `app/media` cleared; thumbs regenerate on demand with GD (checked: 490×390 jpg/webp thumbs return 200 `image/*`).

### Code changes and the Kirby 5 breaking change behind each

| File | Change | Cause |
|---|---|---|
| `app/site/snippets/intro-video.php:12-14` | The `<source>` was `$page->url() . '/' . $page->mood_film()` (page URL + filename). It now resolves the file via `$page->mood_film()->toFile()` and emits `$film->url()` (the media URL), guarded by `if`. | **Kirby 5: `content.fileRedirects` now defaults to `false`** (Kirby 4.8 `src/Cms/App.php:1323` defaulted to `true`; Kirby 5.5 `src/Cms/App.php:1354` defaults to `false`). `/de/about/about_moodfilm.mp4` returned 404 under Kirby 5; the media URL now returns 200 `video/mp4`. |
| `scripts/smoke.sh:46-57` | Project URLs use the slug after Kirby's `num_` prefix (`${dir#*_}`), and default-language pages are tested under `/de` instead of unprefixed. | **Not a Kirby 5 change**: harness bugs from Phase 1, surfaced once the site booted. See the deviations below. The Kirby 4.8 and 5.5 source is functionally identical for both behaviours. |

No other plugin, snippet or template needed changes. Each API the phase listed was checked against the 5.5.3 source:

- `kirbytags:after` is still applied with `compact('text','data','options')` (`src/Cms/App.php:886`), so the gallery plugin's signature matches.
- `file.create:after` still receives `$file`.
- `File::mediaHash()` (`src/Cms/File.php:390`) and `Page::diruri()` (`src/Cms/Page.php:385`) still exist.
- `Cms\Collection::not(string|array|object ...$keys)` is variadic, so the multi-arg call in `menu-main.php` works.
- `snippet($name, $data, bool $return)` and `e()` / `t()` exist unchanged in `config/helpers.php`.
- The `languages` / `languages.detect` options are unchanged.
- `php -l` with `error_reporting=-1` is clean on every file under `app/site`.

Kirby 5 breaking changes reviewed and found **not applicable**:
- PHP ≥ 8.2 (satisfied)
- type hints on collection methods (the call sites pass ints/strings)
- `Str::*` requiring a value argument
- `F::read()` no longer reading URLs
- the thumb `autoOrient` option removed (not configured)
- the site controller passed to all templates (no controllers)
- the Panel, Form, User and Role changes (no Panel usage, no blueprints)

## Deviations from the plan

- **German is served under `/de`, not `/`.** Step 6 assumed "de at /". `site/languages/de.php` sets no `url`, so `Language::url()` falls back to `'/' . code` in both Kirby 4.8 and 5.5. `LanguageRoutes::fallback()` then 302-redirects unprefixed paths to `/de/…`, with logic unchanged between versions. Wayback Machine captures confirm the historical public URLs: `studioisphording.de/de` and `/de/about` return 200 (Jan/Mar 2026), with no captures of `/about`. So `de.php` was **not** changed; moving German to `/` would change the public URL scheme. The smoke list now tests `/de/…`.
- **`berlin_im_wandel_der_zeiten` is served at `/projects/im_wandel_der_zeiten`.** `Dir::inventoryChild()` splits folder names at the first `_` into `<num>_<slug>` (same code in 4.8). Phase 1's smoke list used raw folder names, so that URL could never have returned 200.
- **The smoke test ran on `PORT=8011`.** Port 8000 is held by an unrelated local uvicorn process, and `smoke.sh` does not notice when its own server fails to bind (see `DEBT-01`).
- **The live site could not serve as a reference.** `https://studioisphording.de/` currently returns the Kirby "Change the PHP version" page with HTTP 200, so the live site is down too.

## Gotchas / things that bit us

| ID | Severity | Gotcha |
|---|---|---|
| `INT-01` | HIGH | `app/kirby/` is gitignored but **tracked**: HEAD holds 3,294 Kirby 4.8.0 core files (commit `546dace`). The upgrade shows as thousands of modified/deleted files under `app/kirby/`. These were left **unstaged** — the user must decide whether to commit the 5.5.3 core (history's convention) or `git rm -r --cached app/kirby` and rely on `composer install`. |
| `DEBT-01` | MEDIUM | `scripts/smoke.sh` does not check that its `php -S` actually bound the port. If the port is taken, it silently curls whatever else listens there (here uvicorn → 60× 404). |
| `INT-02` | MEDIUM | `config.php` hardcodes `'url' => 'http://localhost:8000'`, so every absolute URL and redirect (including `/` → `/de`) points at port 8000 even when the server runs elsewhere. Phase 4's config split owns this. |
| `DEBT-02` | LOW | `app/site/templates/home.php:21` links the showreel directly under `/content/<diruri>/…`. This works on `php -S`, but Kirby's default `.htaccess` blocks `/content`. It is not a Kirby 5 change and was left as-is. |
| `DEBT-03` | LOW | `plugins/media-processing` calls `$file->parent()->diruri()`. A site-level file upload (parent = `Site`, which has no `diruri()`) would fatal. The hook only runs on Panel uploads, and none happen today. |

## Affects later phases

- **Phase 3 (npm / Vite 8):** unaffected by the PHP side. Keep `npm run build` green; the smoke test is fully green now and must stay so.
- **Phase 4 (config split, markup fixes):** remove the hardcoded `url` (`INT-02`) so redirects stay on the serving host. `/` → `/de` is Kirby's intended default-language behaviour; don't "fix" it by setting `de.php` `url => '/'` unless the user wants to change the public URLs.
- **Phase 5 (end-to-end, deploy dry-run):** the dry-run must show `app/vendor/` being pushed. The Kirby 5 bootstrap needs it for `vendor/autoload.php`, and `deploy.sh` does not exclude it. Live web PHP is 8.4, which fits the `~8.4.0` constraint. Resolve `INT-01` before any real deploy or commit.
- **All later phases:** run the smoke test as `PORT=8011 bash scripts/smoke.sh` while port 8000 is taken (`DEBT-01`).

## New TODOs

- [ ] Decide on tracking of the `app/kirby/` core in git (`INT-01`).
- [ ] Make `smoke.sh` fail fast when its server cannot bind (`DEBT-01`).
- [ ] Serve the home showreel through Kirby file URLs instead of `/content/…` (`DEBT-02`).

## Docs updated

- [x] `readme/QUICK_START.md`: `composer install` step, PHP 8.3–8.5, `/de` URLs, smoke `PORT` override
- [x] Project memory / handoff notes (this build log; `plan/improvements.md`)
- [ ] CLAUDE.md / AGENTS.md: none exists in the repo
- [x] Verification commands run and green: `bash scripts/smoke.sh` (PORT=8011) exits 0, 60/60 PASS; `npm run build` exits 0
