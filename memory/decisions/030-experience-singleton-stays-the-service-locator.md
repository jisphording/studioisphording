---
candidate-id: refactor-dev-js:decision:02
kind: decisions
id: MEM-030
slug: experience-singleton-stays-the-service-locator
title: The Experience singleton stays the shared Three.js service locator; the wiring problem is solved by the worlds registry, not dependency injection
status: accepted
supersedes:
origin: refactor-dev-js/decisions/2
created: 2026-09-21
---

## Context / Forces

The Three.js layer in `dev/js/three` runs one shared scene/camera/renderer for the whole
site, and every module reaches it the same way: import the `Experience` class and call
`new Experience()` (the constructor returns the existing instance — see `Camera.mjs`,
`Renderer.mjs`). When the refactor scan flagged `Experience` as a hotspot, it saw two
different things tangled together: high fan-in (9 files import it — the service-locator
pattern doing its job) and high fan-out (11 imports of hardcoded world wiring — the real
defect). Pressures: bring oversized modules under 300 lines, clear the scan's hotspots, and
make future Three.js work safer — without changing observable behaviour.

## Decision

`new Experience()` remains the sanctioned way for modules to reach the shared Three.js
runtime; the fan-in is accepted, not treated as a defect. The scan's fan-out problem was
solved where it lived: phase 4 replaced Experience's hardcoded world wiring with a worlds
registry. No dependency injection was introduced.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Pass the Experience into every consumer's constructor (dependency injection) | Touches every world module's constructor signature for no user-visible gain; the fan-in is the intentional API, not an accident. |
| Decompose `Experience` into per-concern singletons (scene/camera/renderer modules) | Splits the one object modules actually reach for; more churn than the hotspot justified, and the singleton remains the natural service locator for a single-scene site. |

## Consequences

Buys: stable, reviewable imports and a boundary future Three.js work can rely on. Costs:
`Experience` stays a recorded fan-in hotspot (9 > scan threshold 8, noted in
plan/improvements.md). Revisit only if the site ever runs multiple scenes or needs the
runtime headlessly — at that point the singleton assumption itself is wrong.

Harvested from `refactor-dev-js/decisions/2`.
