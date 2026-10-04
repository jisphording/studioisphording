---
candidate-id: 05-webgl-loading-and-video-ladder:decision:02
kind: decisions
id: MEM-057
slug: project-gallery-videos-live-in-the-project-s-content-folder-not
title: Project gallery videos live in the project's content folder, not app/video
status: accepted
supersedes:
origin: 05-webgl-loading-and-video-ladder/decisions/2
created: 2026-10-05
---

## Context / Forces

Two case-study gallery videos were rendered from a separate app/video/ root with no manifest entry and no poster, outside the media pipeline. Agents never write `app/content/` (house rule), and supporting a second source root would have required a PHP lookup by string key plus explicit poster wiring. User decision, 2026-10-04.

Citation: `05-webgl-loading-and-video-ladder/decisions/2`

## Decision

Gallery video masters live in the project's content folder (the user moved them there by hand) and render through the manifest-backed `$page->videos()` path and `app/site/snippets/responsive-video.php`, like every other video. app/video/ is legacy.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Teach the pipeline a second source root (app/video/) | Far more code: string-key lookup and manual poster wiring. |
| An agent moves the files | Violates the never-write-`app/content` rule. |

## Consequences

All videos get the AV1/VP9/H.264 ladder and posters. Moving content masters is a human step that precedes the code change.
