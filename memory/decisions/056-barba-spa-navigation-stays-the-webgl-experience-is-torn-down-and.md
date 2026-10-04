---
candidate-id: 05-webgl-loading-and-video-ladder:decision:01
kind: decisions
id: MEM-056
slug: barba-spa-navigation-stays-the-webgl-experience-is-torn-down-and
title: Barba SPA navigation stays; the WebGL Experience is torn down and restarted per page
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/decisions/1
created: 2026-10-05
---

## Context / Forces

The Experience was a singleton with no teardown: after a Barba transition away from a `#webgl` page its rAF loop and resize listener kept running (a live leak), and entering a WebGL page via Barba did not start it. The user required the Barba page transition to keep working (2026-10-04), which a full page reload on WebGL routes would have dropped.

Citation: `05-webgl-loading-and-video-ladder/decisions/1`

## Decision

`dev/js/animation/animBarba.mjs` calls `stopWebgl()` when leaving a container holding `#webgl` and `startWebgl(container)` in `afterEnter`. `Experience.destroy()` (with `Time`/`Sizes.destroy()`) resets the singleton; a world that holds resources implements `destroy()`/`dispose()`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Full reload when entering/leaving WebGL pages | Loses the Barba transition the user wants kept. |
| Keep one Experience alive across pages | Keeps the leak and couples unrelated pages to one canvas. |

## Consequences

Each WebGL page visit pays a fresh start. New worlds must clean up after themselves or they leak across navigations.
