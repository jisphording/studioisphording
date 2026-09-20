# Manual verification ledger

This file is project-level and outlives any `plan/NN-<slug>/` directory. It records checks that
a machine cannot run — Figma runtime behaviors, hardware interactions, click-paths — so the
evidence trail survives the plan that created it.

Each entry has a stable `MC-nn` or `AA-nn` id and three statuses (`verified`, `unverified`,
`blocked`). A `verified` entry is current evidence; an `unverified` entry is the honest
default for a check nobody has re-run, not a failure state; a `blocked` entry names a
concrete missing thing and requires a reason.

## Why claims are quoted rather than line-numbered

Entries anchor on a **quoted claim substring** that must appear verbatim in the cited doc,
never on a line number. Line numbers shift when any unrelated edit above the citation changes
the doc, so a quoted claim resolves to whatever line currently holds it.

## Entry format

Each entry is a `### MC-nn — <headline>` block with the following bolded keys:

- **Claim**: a quoted substring that must appear verbatim in the cited doc
- **Doc**: a repo-relative path
- **Covers**: file paths whose change invalidates a verified status
- **Procedure**: concrete steps or a plan-path pointer
- **Last verified**: an ISO date or `null`
- **Verified against**: what the run used, or `null`
- **Status**: `verified` | `unverified` | `blocked`
- **Blocked reason**: required only when status is `blocked`

---

### MC-01 — Kirby 5 site renders with images in de/en/it (browser click-through)

**Claim**: "German (default language) lives under /de"
**Doc**: readme/QUICK_START.md
**Covers**: app/composer.lock, app/site/snippets/intro-video.php, app/site/plugins/site-methods/index.php, app/site/config/config.php
**Procedure**: Run `npm run php` (port 8000 must be free), open http://localhost:8000 and click through home, about, projects, one project, imprint and privacy in de (/de), en (/en) and it (/it). Every page renders with images (thumbs generate) and the about-page mood film plays. Phase 2 covered this at HTTP level only (23 media URLs → 200 on port 8011); no browser run yet.
**Last verified**: null
**Verified against**: null
**Status**: unverified
**Blocked reason**:

### MC-02 — CSS edit hot-reloads in the browser without a full page reload

**Claim**: "the page updates without a full reload"
**Covers**: app/site/snippets/header.php, app/site/snippets/footer.php, app/site/plugins/vite-manifest/index.php, vite.config.dev.js
**Procedure**: Run `npm run dev` and `npm run php`, open the page in a browser, edit a colour in dev/css/main.scss, save, and confirm the change appears without a full page reload. The HMR pipeline was previously verified server-side only (Vite dev server logged `hmr update /css/main.scss` after the header's `vite('js/index.js')` call was pointed at the corrected manifest-matching entry name; the `/@vite/client` and `/js/index.js` dev-server URLs both returned 200) — no browser was used to confirm the in-page visual update.
**Last verified**: null
**Verified against**: null
**Status**: unverified
**Blocked reason**:

### MC-03 — Both Three.js worlds render in the production bundle; moodboard batch sequencing and failed-texture tolerance unchanged

**Claim**: "Both Three.js worlds render in the production bundle; moodboard batch sequencing and failed-texture tolerance unchanged"
**Doc**: null (plan refactor-dev-js, phase 3 — archived plan, no stable path)
**Covers**: dev/js/three/utils/Resources.mjs, dev/js/three/projects/moodboard/ProgressiveLoader.mjs
**Procedure**: Build (`npm run build`), serve the production bundle (`cd app && php -S 0.0.0.0:<port> kirby/router.php`) and browse that same origin so the dev-only config.localhost.php / config.127.0.0.1.php never load. World_01: open /de/projects/isphording-inneneinrichtung and confirm the `[data-world="World_01"]` canvas renders the display model (phase 3 confirmed this — GLB request 200, model visible in a screenshot). World_02 (moodboard): **currently unreachable** — no page under app/content uses the `moodboard` template and no route serves it, so the batch sequencing and broken-image tolerance are covered only by `tests/js/three/utils/Resources.test.mjs`. Re-run this check in full once a moodboard page exists.
**Last verified**: null
**Verified against**: null
**Status**: unverified
**Blocked reason**: World_02 has no reachable page; World_01 half was observed in phase 3 but not recorded by a human.
