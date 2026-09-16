---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:06
kind: decisions
id: MEM-006
slug: do-not-block-the-reveal-on-the-three-js-world-being-ready
title: Do NOT block the reveal on the Three.js world being ready.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/6
created: 2026-09-16
---

## Context / Forces

When designing the page-transition readiness gate (`02-frontend-fidelity-and-deploy-safety/decisions/5`),
two variants were on the table: gate on document/image/video readiness only, or also wait
for the Three.js/WebGL scene on the incoming page to finish initializing. Heavy glTF pages
can take multiple seconds to load meshes, textures and the Draco decoder — waiting on that
inside the transition gate would hold the loader open far longer than the user-facing
requirement calls for.

## Decision

The transition readiness gate ignores Three.js/WebGL world state entirely. The canvas is
allowed to fade in after the reveal has already opened, rather than blocking the reveal.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Gate the reveal on WebGL scene readiness too | User explicitly chose the lighter "assets ready, with timeout" option; heavy glTF pages would hold the loader open for seconds, working against the point of a fast, honest transition. |

## Consequences

Users may briefly see the page shell before the 3D canvas populates on heavy Three.js
pages — accepted as a reasonable tradeoff. Any future change that tries to make Three.js
readiness part of the transition gate should revisit this decision deliberately, not as an
incidental side effect of a Resources/loading refactor (see the explicit `start()`
loading-mode dispatch work in this same plan's history).
