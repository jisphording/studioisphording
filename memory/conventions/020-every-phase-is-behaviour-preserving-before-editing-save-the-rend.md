---
candidate-id: refactor-app-site:convention:02
kind: conventions
id: MEM-020
slug: every-phase-is-behaviour-preserving-before-editing-save-the-rend
title: Every phase is behaviour-preserving: before editing, save the rendered HTML of every page path listed in scripts/smoke.sh (PATHS, for de/en/it) to the scratchpad; after editing, re-fetch and diff with whitespace collapsed. The only allowed differences are the ones the phase names (escaped entities, removed dead markup).
status: accepted
supersedes:
origin: refactor-app-site/conventions/2
created: 2026-09-20
---

Every phase is behaviour-preserving: before editing, save the rendered HTML of every page path listed in scripts/smoke.sh (PATHS, for de/en/it) to the scratchpad; after editing, re-fetch and diff with whitespace collapsed. The only allowed differences are the ones the phase names (escaped entities, removed dead markup).

(*Origin:* `refactor-app-site/conventions/02`)
