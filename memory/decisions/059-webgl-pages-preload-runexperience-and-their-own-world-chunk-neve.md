---
candidate-id: 05-webgl-loading-and-video-ladder:decision:04
kind: decisions
id: MEM-059
slug: webgl-pages-preload-runexperience-and-their-own-world-chunk-neve
title: WebGL pages preload runExperience and their own world chunk, never vendor-three
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/decisions/4
created: 2026-10-05
---

## Context / Forces

After the route split, WebGL pages modulepreloaded `runExperience` and `vendor-three` (651 KB) from `<head>` but not the world chunk. `readme/PERFORMANCE.md` attributed a +1.87 s mobile FCP on the WebGL page to `vendor-three` competing with critical CSS and fonts, and the world chunk was fetched in a later waterfall even though `data-world` is known server-side.

Citation: `05-webgl-loading-and-video-ladder/decisions/4`

## Decision

`vite()` modulepreloads `runExperience` plus the page's own world chunk (`$page->webglWorld()` / `webglWorldChunk()`) and never `vendor-three`; the dynamic import fetches it. Measured and kept (`readme/PERFORMANCE.md`).

## Alternatives

| Option | Why rejected |
| --- | --- |
| Preload `vendor-three` in `<head>` (previous state) | Competes with critical CSS/fonts; worst mobile FCP. |
| `vendor-three` modulepreload at the end of `<body>` | Prepared fallback if the chosen variant measured worse; it did not, so not applied. |

## Consequences

A new world needs an entry in the world-chunk map so its page preloads the right chunk. Revisit with the body-end fallback if mobile metrics regress.
