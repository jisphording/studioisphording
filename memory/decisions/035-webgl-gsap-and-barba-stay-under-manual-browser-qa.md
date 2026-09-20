---
candidate-id: refactor-dev-js:decision:11
kind: decisions
id: MEM-035
slug: webgl-gsap-and-barba-stay-under-manual-browser-qa
title: WebGL rendering, GSAP tween visuals and real Barba navigation stay under manual browser QA; browser automation is the deferred follow-up lane, not a fake
status: accepted
supersedes:
origin: refactor-dev-js/decisions/11
created: 2026-09-21
---

## Context / Forces

The Vitest lane runs in Node: no WebGL, no network, no PHP server. Three behaviours the
site visibly depends on cannot live there — the rendered output of the two Three.js worlds,
GSAP tween visuals, and real Barba page navigation. Faking a GPU is possible; testing the
fake proves nothing about the site.

## Decision

The unit suite covers logic, DOM and module seams with fakes. WebGL rendering output, GSAP
tween visuals and real Barba navigation are verified by manual browser QA against the
production bundle (see the browser-QA convention). If automated coverage of these is ever
needed, the accepted path is a browser-automation lane (Playwright or Vitest browser mode)
— a follow-up, deliberately not built now.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Fake the GPU/GSAP/Barba surfaces in the unit suite | Faking them only tests the fakes; green tests would assert nothing about the rendered site. |
| Build the Playwright/browser-mode lane now | Out of scope for the refactor; the manual QA recipe covers the need at today's scale. |

## Consequences

Buys: the unit suite stays fast and honest about what it can prove. Costs: changes touching
those three areas require a human in a browser, and the moodboard world (World_02) is
currently unreachable in a browser altogether (no page under `app/content` uses the
moodboard template — see plan/improvements.md), so its batch sequencing is pinned by unit
tests only.

Harvested from `refactor-dev-js/decisions/11`.
