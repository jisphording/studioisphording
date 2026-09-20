---
candidate-id: refactor-dev-js:decision:10
kind: decisions
id: MEM-034
slug: npm-test-stays-out-of-smoke-sh-and-deploy-sh
title: npm test is a documented gate step run alongside smoke.sh — wired into neither smoke.sh nor deploy.sh
status: accepted
supersedes:
origin: refactor-dev-js/decisions/10
created: 2026-09-21
---

## Context / Forces

`scripts/smoke.sh` is an HTTP-level gate: it boots a PHP server and asserts rendered
markup and asset responses. `scripts/deploy.sh` runs a preflight that checks deploy trees
before rsyncing. The new Vitest suite needed a place in the verification story, and the
temptation was to bolt it onto one of the existing scripts so it "can't be forgotten".

## Decision

`npm test` is a documented gate step — CLAUDE.md lists it in Commands and names the
verification gate as `npm test` + `npm run test:php` + `bash scripts/smoke.sh` — but it is
wired into neither `smoke.sh` nor `deploy.sh`. Agents and humans run it alongside; the
scripts stay single-purpose.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Run Vitest inside smoke.sh | Smoke is an HTTP gate against a PHP server; mixing in a Node test runner gives it a second failure mode and muddies what a red smoke run means. |
| Add Vitest to deploy.sh's preflight | The deploy preflight should not grow a new failure mode without the user asking; a deploy is a human call, and test greenness is checked before deploy is proposed, not inside it. |

## Consequences

Buys: each gate keeps one clear meaning, and deploy remains untouched. Costs: nothing
forces `npm test` to run — smoke green alone is explicitly NOT proof of JS correctness
(CLAUDE.md says so). If that ever bites, revisit by adding a CI step, not by bloating the
shell scripts.

Harvested from `refactor-dev-js/decisions/10`.
