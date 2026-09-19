# Improvements & deferred ideas

One line per entry, most recent first.

- `header.php`'s `<title>`, `section-headline.php`'s `data-value` and every `getResponsiveImage()` alt built from `$page->title()` show project titles' `<mark>` as literal `&lt;mark&gt;` text (browser tab, alt text) — pre-existing, left byte-identical by phase 6; add a plain-text title method (strip_tags then esc) for attribute/`<title>` contexts.
- Kirby only lists folders with a `<num>_` prefix, so live project folders like `01-phenotype-agency` are unlisted and `projects.php`'s `children()->listed()` list renders only `berlin_im_wandel_der_zeiten` (num "berlin") — found by phase 6; renaming content folders is a human content call (and changes URLs).
- `tests/php/OutputEscapingGuardTest.php` only scans `<?=` tags; `<?php echo` output (header.php's slug class, section-headline.php's title chunks) is not guarded — extend the scanner to T_ECHO if more echo-statement output appears.
- `app/site/snippets/tag-list.php` (related-grid) and `create_tags()` (helpers plugin, article.php) still render tag `<li>`s two ways — both escape since phase 6, but tag-list keeps no-trim/empty-items-kept while create_tags strips spaces and skips empties; unify them in a later pass.
- `app/site/templates/about.php:52-56` still has a commented-out "awards & recognition" block referencing `$page->recognition()`, out of scope for phase 2 (only the OFFICE LOCATIONS block was named) — delete it in a later cleanup pass if `recognition` never ships.
- No live content anywhere under `app/content` uses the `article` template (no `Tags:` field either) — phase 3's `create_tags()` fix is exercised only by `tests/php/plugins/HelpersTest.php` and `scripts/smoke.sh` never renders an article page; if the `article` template ships live content later, add its path to `scripts/smoke.sh`'s `PATHS`.
- `remove_br_tags()` (app/site/plugins/helpers/index.php, moved from snippets/utils.php in phase 3) strips only self-closing `<br/>`/`<br />`, not a bare `<br>` — pinned as current behaviour in HelpersTest; widen the regex if bare tags ever need stripping.
