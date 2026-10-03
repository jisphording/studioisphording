---
candidate-id: 03-media-compression-and-delivery:decision:02
kind: decisions
id: MEM-040
slug: video-derivatives-and-posters-also-go-to-app-assets-media-so-dep
title: Video derivatives and posters also go to app/assets/media/, so deploy.sh pushes them; app/video/'s unused resolution ladder is retired.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/2
created: 2026-10-03
---

## Context / Forces

The older video setup under `app/video/` held a 103 MB resolution ladder that templates never selected between (`RES-12`), and its upload was manual. The user decided on 2026-09-21 to route video through the same output root as images.

Citation: `03-media-compression-and-delivery/decisions/2`

## Decision

Video derivatives and posters also go to `app/assets/media/`, so `deploy.sh` pushes them. The unused resolution ladder in `app/video/` is retired.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keep video in `app/video/` with manual upload | Leaves the AV1/VP9/H.264 ladder unselectable by the deploy and keeps the manual step. |

## Consequences

The codec ladder becomes selectable and the manual upload step goes away. Tens of MB enter the rsync mirror on the first push, then only increments. Revisiting means reintroducing a server-owned video tree and its exclude.
