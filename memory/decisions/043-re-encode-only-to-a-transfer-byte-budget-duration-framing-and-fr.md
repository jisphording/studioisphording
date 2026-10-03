---
candidate-id: 03-media-compression-and-delivery:decision:05
kind: decisions
id: MEM-043
slug: re-encode-only-to-a-transfer-byte-budget-duration-framing-and-fr
title: Re-encode only, to a transfer byte budget — duration, framing and frame rate stay as authored.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/5
created: 2026-10-03
---

## Context / Forces

The landing reel is the heaviest asset. Trimming it would be an editorial change, not a compression one. The user decided on 2026-09-21 to leave the content alone.

Citation: `03-media-compression-and-delivery/decisions/5`

## Decision

Video work is re-encode only, against a transfer byte budget. Duration, framing and frame rate stay as authored.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Trim duration or drop frame rate to hit the budget | Editorial change, out of scope for a compression pipeline. |

## Consequences

The AV1 rung steps CRF up until it fits the `budget` in `media.config.mjs`. If the budget cannot be met at acceptable quality, the run reports the miss at the floor instead of shipping a soft reel. Revisiting means an explicit editorial decision about the reel.
