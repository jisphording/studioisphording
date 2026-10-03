---
candidate-id: 03-media-compression-and-delivery:decision:08
kind: decisions
id: MEM-046
slug: av1-webm-vp9-webm-h-264-mp4-in-that-source-order
title: AV1/WebM -> VP9/WebM -> H.264/MP4, in that source order.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/8
created: 2026-10-03
---

## Context / Forces

Browsers take the first supported source. The old `home.php` listed MP4 before WebM, so Chrome always took the 23 MB MP4. VP9 is load-bearing, not legacy: Safari 17+ decodes AV1 only on hardware with an AV1 decoder (`RES-22`, `RES-03`).

Citation: `03-media-compression-and-delivery/decisions/8`

## Decision

Video `<source>` order is AV1/WebM, then VP9/WebM, then H.264/MP4.

## Alternatives

| Option | Why rejected |
| --- | --- |
| MP4 first (the old order) | Every browser picks the heaviest file. |
| Drop VP9 | Safari without hardware AV1 would fall through to H.264. |

## Consequences

Three encodes per video, with H.264 as the universal floor. Revisiting means dropping a rung only when AV1 hardware decode is near-universal.
