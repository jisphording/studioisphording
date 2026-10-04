---
candidate-id: 05-webgl-loading-and-video-ladder:decision:03
kind: decisions
id: MEM-058
slug: video-budgets-are-per-rung-with-a-1-1-5-2-5-av1-vp9-h-264-starti
title: Video budgets are per rung, with a 1 : 1.5 : 2.5 AV1/VP9/H.264 starting rule
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/decisions/3
created: 2026-10-05
---

## Context / Forces

The video ladder previously applied a byte budget to the AV1 rung only, so clients without AV1 support (falling back to VP9 or H.264) could download far more than intended. Only the home reel had a budget at all. User decision, 2026-10-04: per-rung budgets, with the numbers picked by the user.

Citation: `05-webgl-loading-and-video-ladder/decisions/3`

## Decision

`budget` in `media.config.mjs` is either a scalar (AV1 only, the old meaning) or `{ av1, vp9, h264 }`. Every video master gets one. Starting rule: AV1 ≈ 200 KB per second of duration, VP9 ≤ 1.5× and H.264 ≤ 2.5× that AV1 budget, confirmed by the user after a visual check. Each budgeted rung is stepped up in CRF until it fits; duration and fps are never trimmed, and a miss at the CRF floor is reported.

## Alternatives

| Option | Why rejected |
| --- | --- |
| AV1-only budget | Non-AV1 clients pay unbounded bytes. |
| One budget shared by all rungs | Codecs differ in efficiency; one number either starves H.264 or wastes on AV1. |

## Consequences

The starting rule is a default to review per master, not a requirement. Adding a video means adding its budget entry.
