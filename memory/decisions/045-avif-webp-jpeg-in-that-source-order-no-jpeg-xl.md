---
candidate-id: 03-media-compression-and-delivery:decision:07
kind: decisions
id: MEM-045
slug: avif-webp-jpeg-in-that-source-order-no-jpeg-xl
title: AVIF -> WebP -> JPEG, in that source order. No JPEG XL.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/7
created: 2026-10-03
---

## Context / Forces

AVIF is about 95% supported and leads on high-frequency photography like this. WebP is effectively universal. JPEG XL was flagged off in Chrome 145 and Firefox 152 (~12% effective support), and sharp's JXL output is experimental and absent from prebuilt binaries (`RES-08`, `RES-21`).

Citation: `03-media-compression-and-delivery/decisions/7`

## Decision

Image `<source>` order is AVIF, then WebP, then JPEG. No JPEG XL.

## Alternatives

| Option | Why rejected |
| --- | --- |
| JPEG XL | Flagged off in major browsers; experimental in sharp. |

## Consequences

The manifest design keeps a fourth format cheap to add if JXL ships by default. Revisit when browser support passes a threshold the team is happy with.
