---
candidate-id: 03-media-compression-and-delivery:decision:03
kind: decisions
id: MEM-041
slug: ssimulacra2-score-as-the-primary-knob-88-92-for-hero-keyvisual-8
title: SSIMULACRA2 score as the primary knob (88-92 for hero/keyvisual, 82-86 for gallery/grid), with a per-codec raw quality map as an art-direction escape hatch.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/3
created: 2026-10-03
---

## Context / Forces

A SSIMULACRA2 score means roughly the same thing across JPEG, WebP and AVIF, so one fidelity target resolves to the right quality per image and per format. A single raw quality number would mean three different fidelities inside one `<picture>` (`RES-19`, `RES-28`, `RES-29`).

Citation: `03-media-compression-and-delivery/decisions/3`

## Decision

Quality is expressed as an SSIMULACRA2 target score: 88-92 for hero/keyvisual, 82-86 for gallery/grid. A per-codec raw quality map is the art-direction escape hatch.

## Alternatives

| Option | Why rejected |
| --- | --- |
| One scalar `quality` across all codecs | The AVIF, WebP and JPEG scales are not comparable. |

## Consequences

Encoding costs more because of the encode-score-adjust loop, and results are cached by content hash. Bands live in `media.config.mjs`. Revisiting means recalibrating those bands, not the mechanism.
