---
candidate-id: 05-webgl-loading-and-video-ladder:convention:05
kind: conventions
id: MEM-063
slug: non-webgl-pages-never-download-or-preload-a-three-js-chunk
title: Non-WebGL pages never download or preload a Three.js chunk
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/conventions/5
created: 2026-10-05
---

The Three.js route split is an invariant: a page without a `#webgl` canvas never downloads or modulepreloads `vendor-three`, `runExperience` or any world chunk. Any change to `dev/js/utils/startWebgl.mjs`, `dev/js/three/worlds.mjs`, the vite-manifest plugin or `WEBGL_TEMPLATES` must preserve it, and measurement passes check it on `/de`, `/de/about` and `/de/projects`.

Why: Three is the heaviest bundle on the site (~651 KB); the split is what keeps it off pages that do not render it.

Harvested from `05-webgl-loading-and-video-ladder/conventions/5`.
