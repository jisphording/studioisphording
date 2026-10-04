---
candidate-id: 04-backlog-hygiene-and-robustness:decision:06
kind: decisions
id: MEM-055
slug: three-js-is-route-split-behind-a-webgl-check-with-three-preloads
title: Three.js is route-split behind a #webgl check, with Three preloads only on WebGL pages
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/decisions/6
created: 2026-10-05
---

## Context / Forces

Three.js (`vendor-three`, ~651 KB) was statically imported by the entry, so every page paid for it. A dynamic import alone was not enough: the vite-manifest plugin (`app/site/plugins/vite-manifest/index.php`) modulepreloads every dynamic import of the entry on every page, so the bytes would still download.

Citation: `04-backlog-hygiene-and-robustness/decisions/6`

## Decision

`dev/js/utils/startWebgl.mjs` dynamic-imports `runExperience` only when a `#webgl` canvas exists; `dev/js/three/worlds.mjs` turns each world into a lazy loader; and the PHP side emits modulepreloads for Three chunks only for templates listed in `WEBGL_TEMPLATES` (`$page->rendersWebgl()`).

## Alternatives

| Option | Why rejected |
| --- | --- |
| Dynamic import without touching preloads | The manifest plugin would still modulepreload the chunk on every page. |
| Keep the static import | Every non-WebGL page downloads and parses Three. |

## Consequences

Non-WebGL pages fetch no Three code. A new template rendering `#webgl` must be added to `WEBGL_TEMPLATES` (a PHP test enforces it). Refined later by plan 05's world-aware preloads.
