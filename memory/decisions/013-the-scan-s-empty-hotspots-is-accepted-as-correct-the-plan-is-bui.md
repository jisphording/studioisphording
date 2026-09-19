---
candidate-id: refactor-app-site:decision:03
kind: decisions
id: MEM-013
slug: the-scan-s-empty-hotspots-is-accepted-as-correct-the-plan-is-bui
title: Static-scan hotspots for app/site are supplemented by a manual grep pass, because the scanner is blind to Kirby's snippet graph and PHP security sinks.
status: accepted
supersedes:
origin: refactor-app-site/decisions/3
created: 2026-09-20
---

## Context / Forces

The refactor scanner reported no hotspots for `app/site`, but two of its blind spots were identified up front: its PHP import regex only matches use/require/include, so Kirby's `snippet()` call graph was invisible (`imports[]` was empty), and none of its security rules target PHP (no unescaped-echo, exec, or superglobal checks), so `security[]` being empty was a coverage gap rather than a clean bill of health.

## Decision

Static-scan hotspots for app/site are supplemented by a manual grep pass, because the scanner is blind to Kirby's snippet graph and PHP security sinks. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Trusting the scanner output alone was rejected: it would have skipped the very edges (snippet inclusion, raw `<?=` echoes) this refactor needed to restructure. |

## Consequences

Plans touching app/site should not treat an empty scanner result as assurance; run the supplemental grep for `snippet()` edges, PHP sinks and raw `<?=` echoes. Fixing the scanner itself is out of scope here. (*Origin:* `refactor-app-site/decisions/03`)
