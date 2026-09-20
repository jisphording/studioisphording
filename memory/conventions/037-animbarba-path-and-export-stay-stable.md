---
candidate-id: refactor-dev-js:convention:05
kind: conventions
id: MEM-037
slug: animbarba-path-and-export-stay-stable
title: Keep dev/js/animation/animBarba.mjs and its animBarba export stable — dev/js/index.js imports it dynamically by that path
status: accepted
supersedes:
origin: refactor-dev-js/conventions/5
created: 2026-09-21
---

`dev/js/index.js` loads the transition module dynamically from
`./animation/animBarba.mjs` and destructures the named `animBarba` export. The
path and export name are therefore a public contract: the module's internals may be split
(phase 5 moved transition logic into `dev/js/animation/barba/`), but
`dev/js/animation/animBarba.mjs` must keep existing as the facade and must keep exporting
`animBarba`. Renames or moves break the boot path silently at runtime, where no unit test
looks.

Harvested from `refactor-dev-js/conventions/5`.
