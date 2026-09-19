---
candidate-id: refactor-app-site:decision:06
kind: decisions
id: MEM-016
slug: keep-getthumbnail-getresponsiveimage-signatures-replace-the-ten
title: getThumbnail()/getResponsiveImage() keep their signatures; the ten hand-numbered thumb sizes become one size table and the <img> is built via Kirby's Html helpers so attributes are escaped.
status: accepted
supersedes:
origin: refactor-app-site/decisions/6
created: 2026-09-20
---

## Context / Forces

The responsive-image builder had ten separately-hand-numbered `$thumbXX` variables and hand-built attribute strings. Callers in intro-img, projects, about and project-gallery should not need to change, and the escaping fix plus the de-duplication should land in one place.

## Decision

getThumbnail()/getResponsiveImage() keep their signatures; the ten hand-numbered thumb sizes become one size table and the <img> is built via Kirby's Html helpers so attributes are escaped. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Kirby's native `$file->srcset()` presets were considered and rejected for now: they would change the crop/thumb switch semantics behind `custom.images.use_crop`, so adoption is deferred to a future plan. |

## Consequences

Sizes are data in one table; attribute escaping is centralized. Callers are stable. Revisiting srcset() presets means re-checking the use_crop semantics first. (*Origin:* `refactor-app-site/decisions/06`)
