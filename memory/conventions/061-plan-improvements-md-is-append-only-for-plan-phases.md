---
candidate-id: 04-backlog-hygiene-and-robustness:convention:01
kind: conventions
id: MEM-061
slug: plan-improvements-md-is-append-only-for-plan-phases
title: plan/improvements.md is append-only for plan phases
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/conventions/1
created: 2026-10-05
---

plan/improvements.md is the running backlog of deferred issues. Plan phases may append new entries to it but never clear, truncate or rewrite existing ones. Removing entries is a deliberate step taken when a new plan is created to absorb them (plan 05 purged its own eight entries at creation), not something a phase does as a side effect.

Why: the backlog is the hand-off between plans; a phase that rewrote it could silently drop issues nobody else had recorded.

Harvested from `04-backlog-hygiene-and-robustness/conventions/1` and `05-webgl-loading-and-video-ladder/conventions/1`.
