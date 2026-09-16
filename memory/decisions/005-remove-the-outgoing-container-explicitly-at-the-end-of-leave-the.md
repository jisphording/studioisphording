---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:05
kind: decisions
id: MEM-005
slug: remove-the-outgoing-container-explicitly-at-the-end-of-leave-the
title: Remove the outgoing container explicitly at the end of leave(), then gate the reveal on the incoming page's assets with a timeout ceiling and a minimum cover floor.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/5
created: 2026-09-16
---

## Context / Forces

Barba.js appends the incoming container before `leave()` resolves and only removes the
outgoing container after `enter()` resolves. The reveal animation (the loader wipe-out) was
awaited inside `enter()`, so the old page's container was still in the DOM — and still
visible — for the full 1.8s of the reveal. The product requirement was explicit: "use the
transition animation to actually load and then show the new page," meaning the wipe should
hide real loading of the next page, not just play for its own sake over stale content.

## Decision

The outgoing container is removed explicitly at the end of `leave()`, before the reveal
ever runs, making Barba's own (later) removal a no-op. The reveal itself is gated on the
incoming page's readiness — `document.fonts.ready`, decode of above-the-fold images, and
`video canplay` — bounded by a ~3s timeout ceiling (so a slow asset never hangs the loader
indefinitely) and a ~400ms minimum cover floor (so the loader never flashes open too fast to
read as intentional).

## Alternatives

| Option | Why rejected |
| --- | --- |
| Rely on Barba's default removal timing | Leaves the old container visible under the reveal animation, which is the bug being fixed. |
| Reveal immediately with no readiness gate | Doesn't satisfy "actually load and then show" — the wipe would open on a still-loading page. |
| Wait indefinitely for full readiness | A single stalled asset (e.g. a slow video) would hang the transition with no ceiling. |

## Consequences

Page-transition code now owns explicit DOM cleanup instead of trusting Barba's lifecycle
timing — any future transition change must preserve the explicit `leave()`-end removal or
the old-container-visible bug can reappear. The timeout/floor pair is a tuned compromise;
changing either value trades off "always looks intentional" against "never makes the user
wait." See also `02-frontend-fidelity-and-deploy-safety/decisions/6` for what the readiness
gate deliberately excludes (WebGL/Three.js readiness).
