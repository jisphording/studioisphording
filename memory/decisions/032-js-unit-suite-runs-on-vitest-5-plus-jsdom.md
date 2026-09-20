---
candidate-id: refactor-dev-js:decision:07
kind: decisions
id: MEM-032
slug: js-unit-suite-runs-on-vitest-5-plus-jsdom
title: The JS unit suite runs on Vitest ^5 + jsdom, sharing Vite's ESM resolution; npm test and npm run test:watch are the entry points
status: accepted
supersedes:
origin: refactor-dev-js/decisions/7
created: 2026-09-21
---

## Context / Forces

The front end builds with Vite 8, and the brief was tests that make future Three.js work
robust. The suite had to resolve the same ESM imports the build resolves — including
three/addons/… specifier imports — without a parallel transpile pipeline drifting away
from the real one.

## Decision

Vitest ^5 and jsdom are devDependencies. Before choosing, the peer range was verified to
include vite ^8 via `npm view vitest peerDependencies`. `npm test` runs `vitest run`,
`npm run test:watch` runs `vitest`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Jest | Needs ESM/babel config to mirror Vite's module resolution; a second resolution pipeline is exactly the drift risk the decision avoids. |
| Bare `node:test` | No DOM environment integration without hand-rolled glue; jsdom opt-in is built into Vitest's runner contract. |

## Consequences

Buys: zero extra transpile config, tests importing modules exactly as the build does, and
a sub-second suite (no WebGL, no network, no PHP server). Cost: the Vitest major version is
coupled to Vite major upgrades — re-check the peer range whenever Vite moves.

Harvested from `refactor-dev-js/decisions/7`.
