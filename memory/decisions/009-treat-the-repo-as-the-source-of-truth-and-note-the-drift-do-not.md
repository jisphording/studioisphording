---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:09
kind: decisions
id: MEM-009
slug: treat-the-repo-as-the-source-of-truth-and-note-the-drift-do-not
title: Treat the repo as the source of truth and note the drift; do not reverse-engineer production CSS.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/9
created: 2026-09-16
---

## Context / Forces

Live computed style on production showed `h1` rendering with `font-family:
'Monument-Extended'`, while `dev/css/templates/_typography.scss:58` in the repo assigns
`'Grafier-Regular'` to `h1`-`h6`. This means the deployed CSS bundle predates the SCSS
currently in the repo — the two are known to disagree, and that disagreement is not itself a
bug to fix in this plan.

## Decision

The repository is treated as the source of truth for typography. The drift between it and
the currently-live bundle is recorded rather than "fixed" by reverse-engineering the live
CSS to match; the discrepancy is expected to resolve naturally the next time a real deploy
ships the current bundle.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Reverse-engineer the live bundle back into the SCSS to match production | Would mean deliberately regressing the repo's typography to match a stale, already-superseded deploy — solving the wrong direction of drift. |
| Silently ignore the discrepancy | Leaves the next deployer surprised when heading typography visibly changes in production with no corresponding code change in that deploy's diff. |

## Consequences

The first real production deploy that ships this plan's work is expected to change heading
typography from Monument-Extended to Grafier-Regular — this is not a regression, it's the
live site catching up to the repo. Anyone comparing live production styles against the repo
during this plan's window should expect this specific mismatch and not chase it as a bug.
