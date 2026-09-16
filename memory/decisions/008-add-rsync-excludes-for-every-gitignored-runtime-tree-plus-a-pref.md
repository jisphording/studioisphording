---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:08
kind: decisions
id: MEM-008
slug: add-rsync-excludes-for-every-gitignored-runtime-tree-plus-a-pref
title: Add rsync excludes for every gitignored runtime tree plus a preflight guard that aborts when a required local tree is missing or empty.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/8
created: 2026-09-16
---

## Context / Forces

`scripts/deploy.sh` mirrors `app/` to the IONOS server with `rsync --delete`. Its exclude
list covered `app/site/cache`, `app/site/sessions`, `app/site/accounts`, the two localhost config
overrides, `/media/`, `.git` and OS junk files — but `app/assets/`, `app/content/` and
`app/video/` are all `.gitignore`d and were *not* excluded. A deploy run from a fresh clone
(where those gitignored trees don't exist locally) would have `--delete`d the live fonts,
the Three.js glTF/env-map/Draco assets, and every piece of real site content on the server —
a live-content-destroying deploy with no warning.

## Decision

`scripts/deploy.sh` excludes every gitignored, server-owned runtime tree (fonts, `app/content`,
`app/video`, Three.js meshes/textures, PDFs) from its `--delete` mirror, and runs a preflight
check before rsync: it **aborts** if a deploy-required tree (`app/assets/bundle`,
`app/kirby/bootstrap.php`, `app/index.php`, `app/.htaccess`) is missing or empty locally, and
**warns without aborting** if a server-owned tree is absent locally (that absence is expected
and intentional on a fresh clone).

## Alternatives

| Option | Why rejected |
| --- | --- |
| Require every runtime tree present locally before any deploy | Defeats the purpose of excluding server-owned content from the client repo in the first place; a contributor without production media assets couldn't deploy code-only fixes. |
| No preflight, rely on exclude list alone | An exclude-list bug (like the one this decision fixes) would go undetected until real content is deleted in production. |

## Consequences

Deploys now fail loudly and early instead of silently wiping live server content. Any new
gitignored runtime tree added to the project must be added to both the rsync exclude list
and the preflight's "server-owned, warn-only" set, or it risks being deleted on the next
deploy from an environment that lacks it locally.
