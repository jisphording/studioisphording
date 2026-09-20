---
candidate-id: refactor-dev-js:convention:09
kind: conventions
id: MEM-038
slug: test-files-use-2-space-indentation
title: Test files and vitest.config.js use 2-space indentation; app modules keep the style they already have
status: accepted
supersedes:
origin: refactor-dev-js/conventions/9
created: 2026-09-21
---

New files follow the 2-space rule from CLAUDE.md (Vite configs, `dev/js`): everything under
`tests/js/` and `vitest.config.js` is written with 2 spaces. This does NOT license
reformatting app modules — existing `dev/js` files keep whatever style they already have
(4 spaces in animBarba/Resources/EventEmitter, tabs in Experience.mjs), matching the
surrounding-file rule.

Harvested from `refactor-dev-js/conventions/9`.
