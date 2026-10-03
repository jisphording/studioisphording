---
candidate-id: 03-media-compression-and-delivery:decision:06
kind: decisions
id: MEM-044
slug: sharp-libvips-for-image-resize-and-encode-ffmpeg-libsvtav1-libvp
title: sharp (libvips) for image resize and encode, ffmpeg (libsvtav1/libvpx-vp9/libx264) for video.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/6
created: 2026-10-03
---

## Context / Forces

`sharp` resizes 4-5x faster than ImageMagick and exposes the AVIF/WebP options the pipeline needs. `vite-imagetools` is sharp underneath but is import-driven, so it cannot see CMS-authored files discovered at render time (`RES-18`). `ffmpeg`, `avifenc` and `cwebp` were already installed.

Citation: `03-media-compression-and-delivery/decisions/6`

## Decision

Use `sharp` (libvips) for image resize and encode, and `ffmpeg` (libsvtav1, libvpx-vp9, libx264) for video.

## Alternatives

| Option | Why rejected |
| --- | --- |
| ImageMagick | 4-5x slower resize. |
| `vite-imagetools` | Import-driven; cannot see CMS-authored content files. |

## Consequences

`sharp` is the one new npm dependency for images; video needs `ffmpeg` on PATH. Revisiting would mean swapping the encoder module in `scripts/media/`, behind the existing manifest contract.
