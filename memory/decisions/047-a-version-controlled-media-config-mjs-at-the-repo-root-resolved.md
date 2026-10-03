---
candidate-id: 03-media-compression-and-delivery:decision:09
kind: decisions
id: MEM-047
slug: a-version-controlled-media-config-mjs-at-the-repo-root-resolved
title: A version-controlled media.config.mjs at the repo root, resolved most-specific-glob-wins over a default.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/9
created: 2026-10-03
---

## Context / Forces

Quality choices need to be reviewable and the resolver testable, without touching live content.

Citation: `03-media-compression-and-delivery/decisions/9`

## Decision

Overrides live in a version-controlled `media.config.mjs` at the repo root. The most specific glob wins over a default.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Per-image fields in content files | Would modify `app/content/`, which is off limits. |

## Consequences

Quality decisions show up in git review, and the resolver is unit-tested in `tests/js/media/`. Revisiting means moving config out of the repo root.
