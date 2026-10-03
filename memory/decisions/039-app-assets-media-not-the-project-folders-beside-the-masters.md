---
candidate-id: 03-media-compression-and-delivery:decision:01
kind: decisions
id: MEM-039
slug: app-assets-media-not-the-project-folders-beside-the-masters
title: app/assets/media/, not the project folders beside the masters.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/1
created: 2026-10-03
---

## Context / Forces

Derivatives could be written beside the masters in `app/content/` or into a dedicated tree. `.gitignore` excludes `app/content/`, `app/video` and `app/assets`, and `scripts/deploy.sh` anchor-excludes `/content/`, `/video/` and `/media/` but has no blanket `/assets/` exclude. That gap is why the gitignored `app/assets/bundle` reaches production. Output written beside masters would silently never deploy (`RES-15`).

Citation: `03-media-compression-and-delivery/decisions/1`

## Decision

Every derivative is written to `app/assets/media/`, never beside the masters.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Project folders beside the masters | Matches the deploy excludes, so nothing would ship; also writes into the live-content tree. |

## Consequences

Derivatives ride the same rsync path as the Vite bundle with no new deploy plumbing. The cost is that `app/assets/media/` sits inside the `--delete` mirror, so the deploy preflight must require `manifest.json`. Revisiting means changing the deploy excludes first.
