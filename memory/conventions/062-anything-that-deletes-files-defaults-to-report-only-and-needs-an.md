---
candidate-id: 04-backlog-hygiene-and-robustness:convention:05
kind: conventions
id: MEM-062
slug: anything-that-deletes-files-defaults-to-report-only-and-needs-an
title: Anything that deletes files defaults to report-only and needs an explicit flag to delete
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/conventions/5
created: 2026-10-05
---

Any tool or script in this repo that deletes files runs report-only by default and needs an explicit flag (e.g. `--apply`) to actually delete. Where its notion of "orphan" depends on an index such as `manifest.json`, it refuses to run when that index is missing or unreadable.

Why: `app/assets/media/` and other trees sit inside the deploy's rsync `--delete` mirror, so a local mistake becomes a live deletion on the next deploy. The media pruner (`scripts/media/prune.mjs`) is the reference implementation.

Harvested from `04-backlog-hygiene-and-robustness/conventions/5`.
