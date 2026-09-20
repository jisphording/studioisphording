---
candidate-id: refactor-dev-js:decision:03
kind: decisions
id: MEM-031
slug: rate-sinks-by-data-taint-not-by-sink-name
title: Rate an HTML/script sink by its data, not its name — a constant-fed innerHTML is LOW (and still removed); a production-reachable debug global is LOW (fixed by DEV-gating)
status: accepted
supersedes:
origin: refactor-dev-js/decisions/3
created: 2026-09-21
---

## Context / Forces

The refactor scan rated SEC-01 (`innerHTML` in the moodboard lightbox,
`dev/js/three/projects/moodboard/ImageZoom.mjs`) MEDIUM. Reading the sink showed it
receives only the constant `&times;` — no user- or content-controlled data ever flows into
it — so it was not exploitable; the danger was the pattern inviting copies. While reading
the same hotspot the reviewer found a finding the scan had missed entirely and logged it as
SEC-02: `dev/js/three/modules/Experience.mjs` published `window.experience` unconditionally
in production builds (a commented `### DEV ###` block that wasn't actually dev-gated).

## Decision

Severity is judged by what data can reach the sink, not by the sink's API name:

- A sink fed only constants is LOW — still worth removing so the pattern is not copied
  into a context where data does flow.
- A debug global reachable in production is LOW — the fix is gating it behind
  `import.meta.env.DEV`, not deleting a useful dev debugging handle.

Scan-produced severities are starting points; the reviewer re-rates by reading the sink.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Ship the scan's MEDIUM rating for SEC-01 unreviewed | Ratings that ignore data taint misallocate review and fix attention; reading the sink took minutes and re-rated it LOW. |
| Delete the `window.experience` global outright | It is genuinely useful for console debugging during development; DEV-gating keeps the handle while removing the production surface. |

## Consequences

Buys: proportionate security triage in this repo and a fixed reviewer habit. Shipped in
phase 6: the lightbox close button now sets `textContent` with the constant, and the debug
global exists only in dev builds. Cost: scanner output can no longer be trusted
unreviewed — someone must open each finding.

Harvested from `refactor-dev-js/decisions/3`.
