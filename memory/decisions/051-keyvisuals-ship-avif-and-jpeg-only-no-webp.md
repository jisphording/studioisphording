---
candidate-id: 04-backlog-hygiene-and-robustness:decision:01
kind: decisions
id: MEM-051
slug: keyvisuals-ship-avif-and-jpeg-only-no-webp
title: Keyvisuals ship AVIF and JPEG only, no WebP
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/decisions/1
created: 2026-10-05
---

## Context / Forces

Project keyvisuals (`projects/**/*_keyvisual*`) open each case study and carry its art direction, so they target the visually-lossless SSIMULACRA2 band 88–92 (target 90). Measured on the real masters, lossy WebP tops out near 88 on these detailed images — it misses the band at any quality — and bands visibly on dark backdrop gradients. AVIF reaches the band and covers roughly 95% of clients; JPEG reaches it for the rest. User decision, 2026-10-03.

Citation: `04-backlog-hygiene-and-robustness/decisions/1`

## Decision

The keyvisual rule in `media.config.mjs` sets `formats: ['avif', 'jpeg']` with target 90. `app/site/snippets/responsive-image.php` skips a format the manifest does not carry, so no WebP `<source>` is emitted for keyvisuals. Every other image keeps AVIF → WebP → JPEG.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keep WebP at its ceiling (~88) | Misses the band and bands on dark gradients; a WebP-only client would see a worse image than the JPEG fallback. |
| Lossless WebP | Bytes far above AVIF/JPEG at equal perceived quality. |
| Lower the keyvisual target to fit WebP | Gives up the art-direction requirement to suit one codec. |

## Consequences

The ~5% of clients without AVIF get JPEG at full fidelity, at more bytes than WebP would have cost. Dropping WebP orphaned derivatives (cleared by the pruner). Revisit if a WebP encoder change lets it reach the band on these masters.
