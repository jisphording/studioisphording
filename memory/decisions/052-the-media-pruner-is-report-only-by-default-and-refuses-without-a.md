---
candidate-id: 04-backlog-hygiene-and-robustness:decision:02
kind: decisions
id: MEM-052
slug: the-media-pruner-is-report-only-by-default-and-refuses-without-a
title: The media pruner is report-only by default and refuses without a manifest
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/decisions/2
created: 2026-10-05
---

## Context / Forces

Encoder or format changes leave stale derivatives in `app/assets/media/` that the manifest no longer references. That tree is inside the deploy's rsync `--delete` mirror, so whatever is local is what goes live: a pruner that ran against a missing or unreadable manifest would treat every derivative as orphaned, and the next deploy would wipe the live media.

Citation: `04-backlog-hygiene-and-robustness/decisions/2`

## Decision

`scripts/media/prune.mjs` (`npm run media:prune`) only reports by default; `--apply` is required to delete. It refuses to run without a readable `manifest.json`, and it is never part of `npm run build`. Run it after a full `media:images` run, not a scoped one.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Delete by default | One run against a bad manifest empties the live derivative tree on the next deploy. |
| Prune automatically inside the build or the media run | Couples a destructive step to routine commands; scoped runs do not write the full manifest. |

## Consequences

Orphans persist until someone runs `--apply` deliberately. The safety rule is generalised as a convention: anything that deletes files defaults to report-only.
