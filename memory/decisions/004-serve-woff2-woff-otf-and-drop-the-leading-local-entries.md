---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:02
kind: decisions
id: MEM-004
slug: serve-woff2-woff-otf-and-drop-the-leading-local-entries
title: Serve woff2 -> woff -> otf and drop the leading local() entries.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/2
created: 2026-09-16
---

## Context / Forces

`app/assets/fonts` ships woff2, woff, ttf and otf for all five faces. woff2 is 30-45%
smaller than otf (17.6 kB vs 25.4 kB for RadioGrotesk-Regular), so listing it first in the
`@font-face` `src` list saves bandwidth on the common case. The prior stack led with
`local()`, which let a designer's own installed copy of a font silently satisfy the
`@font-face` rule in their browser even when the `url()` fallback was broken — that's
exactly what hid the font 404 bug (`02-frontend-fidelity-and-deploy-safety/decisions/1`)
from being noticed during development.

## Decision

`@font-face` `src` lists drop the leading `local()` entry and order remote sources
woff2 -> woff -> otf, smallest and most broadly supported first.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keep `local()` first | Masks a broken `url()` on any machine that happens to have the font installed locally — the exact failure mode that let the original 404 ship unnoticed. |
| otf-first ordering | otf is the largest of the available formats; every modern browser this site targets supports woff2, so leading with otf wastes bandwidth for no compatibility gain. |

## Consequences

Font-face declarations are slightly more verbose (three `url()` entries per face) but the
failure mode is now visible: if a `url()` path regresses, every browser 404s instead of
only browsers without the font pre-installed. Any future new webfont added to the stack
should follow the same woff2 -> woff -> otf order.
