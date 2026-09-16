---
candidate-id: 02-frontend-fidelity-and-deploy-safety:decision:10
kind: decisions
id: MEM-010
slug: plan-improvements-md-is-captured-byte-for-byte-into-this-plan-fo
title: plan/improvements.md is captured byte-for-byte into this plan folder now, and truncated back to its empty template only in the final phase, after all preceding phases are done.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/decisions/10
created: 2026-09-16
---

## Context / Forces

The repo's `improvements.md` backlog file (living at the top level of `plan/`) is a running
list of deferred issues found during prior work (see the Kirby 5 recovery plan). This plan
(`02-frontend-fidelity-and-deploy-safety`) was scoped explicitly to clear that entire
backlog. The user's requirement was direct: "make sure that all the ideas from the
improvements file are purged after plan execution so that i do not implement them twice" —
the risk being that a backlog item gets implemented once here and then re-proposed later
because it was never marked as done.

## Decision

The full contents of the backlog file are copied byte-for-byte into this plan's own folder
at the start of execution (so nothing is lost if the source file changes), and the live
backlog file itself is only truncated back to its empty template in the plan's final phase,
after every preceding phase has already landed.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Truncate the backlog file first, then execute the plan | If the plan aborts partway, the backlog is already gone with no record of what remained — capturing first, truncating last keeps truncation reversible in effect (the capture survives) and honest (it only claims completion after phases actually finish). |
| Leave the backlog file untouched and track completion elsewhere | Defeats the stated purpose — the backlog file would still show already-implemented items as outstanding, inviting them to be picked up and redone. |

## Consequences

Any future plan that clears the `improvements.md` backlog (or an equivalent running backlog
file) should follow the same capture-first, truncate-last sequencing: snapshot the backlog
into the plan folder before starting, and only clear the live file once every phase that
consumed it is actually done.
