---
candidate-id: refactor-app-site:decision:01
kind: decisions
id: MEM-011
slug: app-site-only-as-passed-to-the-refactor-skill-scan-py-app-site-j
title: The app/site refactor is scoped to app/site only; dev/, scripts/ and config outside app/site stay out of scope.
status: accepted
supersedes:
origin: refactor-app-site/decisions/1
created: 2026-09-20
---

## Context / Forces

The plan was kicked off as a site-layer restructure and the scope was set explicitly at planning time: the user named `app/site` as the tree to refactor. Everything outside it — `dev/js`, `scripts/`, and config files — was already covered by other plans or house rules and was declared out of scope so phases could not drift into the front-end build.

## Decision

The app/site refactor is scoped to app/site only; dev/, scripts/ and config outside app/site stay out of scope. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Broadening scope to dev/js and scripts was rejected: those trees have their own plan (`refactor-dev-js`) and mixing concerns would have made phases unverifiable in isolation. |

## Consequences

Keeps each phase's verification surface small (PHP tests + smoke only, no npm build). To touch `dev/` or build config, start a separate plan instead of extending this one. (*Origin:* `refactor-app-site/decisions/01`)
