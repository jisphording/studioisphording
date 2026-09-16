---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:07
kind: decisions
id: MEM-007
slug: git-rm-r-cached-app-kirby-and-have-scripts-deploy-sh-run-compose
title: git rm -r --cached app/kirby and have scripts/deploy.sh run composer install --no-dev before rsync.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/7
created: 2026-09-16
---

## Context / Forces

`app/kirby/` was listed in `.gitignore` yet 551 of its files were still tracked in `HEAD` —
a leftover from before the repo adopted Composer for the Kirby core. As a result the Kirby
4.8 -> 5.5 upgrade during this plan's recovery work showed up as a 551-file "phantom diff"
unrelated to the actual template/config changes being reviewed. `app/composer.json` already
pins `getkirby/cms ^5.5`, so Composer is the actual source of truth for the core version.

## Decision

`app/kirby/` is untracked from git (`git rm -r --cached app/kirby`) and `scripts/deploy.sh`
runs `composer install --no-dev --optimize-autoloader` before rsync so the core is installed
fresh on every deploy, matching local `composer install`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keep `app/kirby/` tracked despite `.gitignore` | Guarantees every future core upgrade reads as a multi-hundred-file diff, burying the real change under vendor noise. |
| Un-ignore and commit `app/kirby/` properly | Reintroduces vendor code into version control that Composer already manages; duplicates the pin already declared in `composer.json`. |

## Consequences

A fresh clone or CI checkout has no working `app/kirby/` until `composer install` runs —
`scripts/deploy.sh`'s preflight now depends on this step succeeding before rsync. Local
setup instructions (`CLAUDE.md`) already require `composer install` as a first-time step for
the same reason.
