---
candidate-id: 05-webgl-loading-and-video-ladder:decision:06
kind: decisions
id: MEM-060
slug: lazy-videos-emit-data-src-sources-plus-a-noscript-twin
title: Lazy videos emit data-src sources plus a noscript twin
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/decisions/6
created: 2026-10-05
---

## Context / Forces

`app/site/snippets/responsive-video.php` emitted real `<source src>` for every video, and `dev/js/media/lazyVideo.mjs` detached them client-side — too late to stop the browser from starting byte fetches for below-the-fold videos.

Citation: `05-webgl-loading-and-video-ladder/decisions/6`

## Decision

Hero videos keep real `<source src>` and `autoplay`. Lazy videos are rendered server-side with `<source data-src>` (no early fetch) plus a `<noscript>` twin carrying real sources; `lazyVideo.mjs` restores `src` when the video nears the viewport.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Client-side detach of real sources (previous) | Fetches start before JS runs. |
| `data-src` without a noscript fallback | No-JS visitors would get no video. |

## Consequences

No early bytes for lazy videos; no-JS visitors still get them. The markup carries each lazy video twice.
