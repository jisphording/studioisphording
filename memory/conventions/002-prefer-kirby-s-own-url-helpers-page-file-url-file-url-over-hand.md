---
candidate-id: 02-frontend-fidelity-and-deploy-safety:convention:04
kind: conventions
id: MEM-002
slug: prefer-kirby-s-own-url-helpers-page-file-url-file-url-over-hand
title: Prefer Kirby's own URL helpers ($page->file(...)->url(), $file->url()) over hand-built paths; app/.htaccess:30 rewrites every /content/* request to index.php, so a content path is never a working URL.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/conventions/4
created: 2026-09-16
---

Templates and snippets must resolve file URLs through Kirby's own helpers
(`$page->file(...)->url()`, `$file->url()`) rather than hand-building a `/content/<diruri>/...`
path string. `app/.htaccess` (line 30) rewrites every `content/*` request to `index.php` by design,
so a hand-built content path is never a working URL in production — this was the root cause
of the home showreel video returning 404 (`02-frontend-fidelity-and-deploy-safety/decisions/3`)
and of the other hand-built asset paths fixed elsewhere in this plan (project Three.js
videos, the media-processing hook). `bash scripts/smoke.sh` asserts the home page markup
carries no hand-built `/content/` path specifically to guard against this regressing.

`02-frontend-fidelity-and-deploy-safety/conventions/4`
