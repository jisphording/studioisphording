---
candidate-id: 04-backlog-hygiene-and-robustness:decision:03
kind: decisions
id: MEM-053
slug: the-quality-cache-key-hashes-each-format-s-encoder-options
title: The quality cache key hashes each format's encoder options
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/decisions/3
created: 2026-10-05
---

## Context / Forces

The SSIMULACRA2 quality search caches the chosen quality per master, width, format and target in the workstation-only quality cache (.cache/media/quality.json). Changing encoder options (effort, chroma subsampling, etc.) changes what a given quality produces, but the old key still matched, so stale results were reused unless someone remembered to bump `QUALITY_SEARCH_VERSION` by hand. The backlog flagged that manual step as an easy miss.

Citation: `04-backlog-hygiene-and-robustness/decisions/3`

## Decision

`qualityKey` in `scripts/media/cache.mjs` folds each format's encoder options into the hashed key, so changing an option invalidates exactly that format's entries. `QUALITY_SEARCH_VERSION` stays, but only for changes the options cannot express (e.g. a change to the search algorithm itself).

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keep the manual version bump only | Relies on memory; a missed bump silently reuses wrong qualities. |
| A new versioning scheme per format | Invents machinery the option hash already provides. |

## Consequences

Option tweaks re-run the search automatically (and orphan old derivatives, so run the pruner). Anything that changes results without changing options still needs the version bump.
