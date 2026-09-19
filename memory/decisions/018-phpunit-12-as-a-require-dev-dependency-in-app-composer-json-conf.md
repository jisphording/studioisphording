---
candidate-id: refactor-app-site:decision:08
kind: decisions
id: MEM-018
slug: phpunit-12-as-a-require-dev-dependency-in-app-composer-json-conf
title: app/site is pinned by a PHPUnit suite: PHPUnit ^12 as require-dev, config at phpunit.xml.dist, tests in tests/php/, run via npm run test:php.
status: accepted
supersedes:
origin: refactor-app-site/decisions/8
created: 2026-09-20
---

## Context / Forces

Kirby 5 is itself PHPUnit-tested and can boot in-process with custom roots, so snippets, site methods and templates can be rendered against fixture content without a server. PHPUnit must not ship to production (`deploy.sh` runs `composer install --no-dev`), and PHPUnit 12 requires PHP 8.3+, matching the composer platform constraint.

## Decision

app/site is pinned by a PHPUnit suite: PHPUnit ^12 as require-dev, config at phpunit.xml.dist, tests in tests/php/, run via npm run test:php. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Extending `bash scripts/smoke.sh` to pin markup was rejected: smoke stays the HTTP-level gate, while unit tests pin markup and escaping precisely enough to replace most of the manual HTML diffing. Reserving `npm test` was considered and declined: it stays reserved for the Vitest suite from plan `refactor-dev-js`. |

## Consequences

Behaviour changes to app/site should come with tests in `tests/php/` in the same change; `npm run test:php` is part of the verification gate. Adding a JS test runner later means wiring it as `npm test` without disturbing this suite. (*Origin:* `refactor-app-site/decisions/08`)
