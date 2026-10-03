---
candidate-id: 03-media-compression-and-delivery:decision:10
kind: decisions
id: MEM-048
slug: retained-as-a-fallback-for-any-image-the-manifest-does-not-cover
title: Retained as a fallback for any image the manifest does not cover; config.thumbs, the /media/ route and the media-processing plugin stay in place.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/10
created: 2026-10-03
---

## Context / Forces

A missing derivative should degrade to the old behaviour, not a broken image (`RES-26`). `project-gallery.php` already carried a try/catch fallback, which suggests past surprises.

Citation: `03-media-compression-and-delivery/decisions/10`

## Decision

Kirby's thumb system is kept as the fallback for any image the manifest does not cover. `config.thumbs`, the `/media/` route and the `media-processing` plugin stay in place.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Remove thumbs once the manifest exists | A manifest miss would render a broken image. |

## Consequences

`getResponsiveImage()` remains a live path, still called by `about.php` and `projects.php`. Retiring thumbs needs full manifest coverage first.
